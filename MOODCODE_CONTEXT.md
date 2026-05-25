# MoodCode — AI Assistant Context

> Read this file before helping with any code in this project.
> This is the single source of truth for what MoodCode is, how it's structured, and what phase we're in.

---

## What is MoodCode?

MoodCode is a **VS Code extension + personal web dashboard** that dynamically switches your editor theme based on real-time signals from your environment. It reads signals like Spotify activity, git behavior, time of day, local weather, and typing patterns — combines them into a weighted mood score — and switches your VS Code theme automatically.

The **web dashboard** is a **personal config UI** (not a multi-user admin panel). It is deployed on Vercel and used by the developer to configure time brackets, theme mappings, signal weights, and review mood history.

**Tech stack:** MERN (MongoDB Atlas, Express, React/Vite, Node.js) + VS Code Extension API + WebSockets

---

## Current Phase: Phase 3 — Spotify + Weather + Git signals

Phases 1 and 2 are complete. We are now adding three new signals to the weighted mood engine.

### What is already built and working

**Phase 1 (MVP) — complete:**
- VS Code extension published as `.vsix`
- Time-of-day signal — checks hour every 60s, switches theme automatically
- Status bar showing current mood
- Manual override — pins mood for 1/2/4 hours
- WebSocket connection between extension and backend
- Backend deployed on Railway
- Dashboard deployed on Vercel
- Mood history logged to MongoDB Atlas
- Config changes push from dashboard → backend → extension via WebSocket instantly

**Phase 2 — complete:**
- `SignalWeights` interface in shared — weights for each signal (time, typing, spotify, weather, git)
- `DEFAULT_SIGNAL_WEIGHTS` constant — time=100, all others=0 by default
- Weighted mood engine in `extension/src/moodEngine.ts` — normalizes weights, converts MoodName to numeric score, applies weights, returns blended MoodName
- `extension/src/signals/typingSignal.ts` — privacy-first keystroke tracker (WPM, backspace ratio, pause count). Content never logged.
- Signal weight sliders in `dashboard/src/pages/SignalsPage.tsx`
- `signalWeights` field in MongoDB User model and config routes

### What we are building now (Phase 3)

**Priority order:**
1. **Spotify signal** — OAuth 2.0, audio features API (energy, valence, tempo → mood)
2. **Weather signal** — OpenWeatherMap, IP-based location, 15min cache
3. **Git signal** — local git log via child_process, commit frequency + revert ratio

### What is NOT built yet (Phase 4+)
- Custom mood builder (user-defined moods beyond the 4 defaults)
- Shareable mood reports
- Publishing to VS Code Marketplace
- Turbo.json (add when build complexity justifies it)

---

## Infrastructure

| Service | Platform | URL |
|---------|----------|-----|
| Backend | Railway | your Railway URL |
| Dashboard | Vercel | your Vercel URL |
| Database | MongoDB Atlas | Free tier, allow all IPs (0.0.0.0/0) |

**Extension default settings (`extension/package.json`):**
```json
"moodcode.backendUrl": "https://your-railway-url.railway.app",
"moodcode.wsUrl": "wss://your-railway-url.railway.app",
"moodcode.dashboardUrl": "https://your-vercel-url.vercel.app",
"moodcode.pollIntervalMs": 60000
```

**Deployment configs:**
- `railway.json` at monorepo root — builds shared + backend, starts with `node backend/dist/index.js`
- `vercel.json` at monorepo root — builds shared + dashboard, rewrites all routes to `index.html` for SPA routing

---

## Monorepo Structure

```
moodcode/
├── shared/                  # Shared TypeScript types and constants
├── extension/               # VS Code extension
├── backend/                 # Node.js + Express + WebSocket server (Railway)
├── dashboard/               # React + Vite personal config dashboard (Vercel)
├── package.json             # npm workspaces root
├── tsconfig.base.json       # Shared TS compiler options
├── railway.json             # Railway deployment config
├── vercel.json              # Vercel deployment config + SPA rewrites
├── .env.example
├── .gitignore
└── MOODCODE_CONTEXT.md
```

Root `package.json` workspaces:
```json
"workspaces": ["shared", "extension", "backend", "dashboard"]
```

Root scripts:
```json
"scripts": {
  "dev": "concurrently \"npm run dev -w backend\" \"npm run dev -w dashboard\"",
  "compile": "npm run compile -w shared && npm run bundle -w extension"
}
```

---

## Package-by-Package Breakdown

---

### `shared/`

**Purpose:** The glue between all packages. Pure TypeScript with zero runtime dependencies. Both the extension and backend import from here.

```
shared/
├── src/
│   ├── types/
│   │   ├── mood.ts          # MoodName type
│   │   ├── config.ts        # TimeBracket, SignalWeights, UserConfig
│   │   ├── websocket.ts     # ClientMessage, ServerMessage
│   │   └── signals.ts       # SpotifySignalPayload, WeatherSignalPayload, GitSignalPayload
│   └── constants/
│       ├── themes.ts        # THEME_DEFAULTS
│       └── brackets.ts      # DEFAULT_BRACKETS + DEFAULT_SIGNAL_WEIGHTS
├── package.json
├── tsconfig.base.json
├── tsconfig.cjs.json        # → dist/cjs
└── tsconfig.esm.json        # → dist/esm
```

**Build:** `npm run compile -w shared` — builds both CJS and ESM. Always run before building extension or dashboard.

**Key types:**

`mood.ts`
```ts
export type MoodName = 'morning' | 'deep_work' | 'post_lunch' | 'late_night';
```

`config.ts`
```ts
export interface TimeBracket {
  start: number;
  end: number;
  mood: MoodName;
  theme: string;
}

export interface SignalWeights {
  time: number;      // 0–100
  typing: number;    // 0–100
  spotify: number;   // 0–100
  weather: number;   // 0–100
  git: number;       // 0–100
}

export interface UserConfig {
  brackets: TimeBracket[];
  themeMappings: Record<MoodName, string>;
  signalWeights: SignalWeights;
}
```

`signals.ts` (being built in Phase 3):
```ts
export interface SpotifySignalPayload {
  energy: number;       // 0.0–1.0
  valence: number;      // 0.0–1.0 (positivity)
  tempo: number;        // BPM
  acousticness: number; // 0.0–1.0
  isPlaying: boolean;
}

export interface WeatherSignalPayload {
  condition: 'clear' | 'cloudy' | 'rainy' | 'stormy';
  temperature: number;
}

export interface GitSignalPayload {
  commitFrequency: number;  // commits per hour
  revertRatio: number;      // 0.0–1.0
  fixCommitDensity: number; // ratio of fix: commits
  minutesSinceLastCommit: number;
}
```

`websocket.ts`
```ts
export type ServerMessage =
  | { type: 'config_update'; brackets: TimeBracket[] }
  | { type: 'spotify_update'; payload: SpotifySignalPayload }
  | { type: 'weather_update'; payload: WeatherSignalPayload }
  | { type: 'pong' };

export type ClientMessage =
  | { type: 'register'; userId: string }
  | { type: 'log_mood'; mood: MoodName; theme: string }
  | { type: 'ping' };
```

`themes.ts`
```ts
export const THEME_DEFAULTS: Record<MoodName, string> = {
  morning:    'GitHub Light Default',
  deep_work:  'Tokyo Night',
  post_lunch: 'One Dark Pro',
  late_night: 'Dracula',
};
```

`brackets.ts`
```ts
export const DEFAULT_BRACKETS: TimeBracket[] = [
  { start: 6,  end: 10, mood: 'morning',    theme: 'GitHub Light Default' },
  { start: 12, end: 14, mood: 'post_lunch', theme: 'One Dark Pro' },
  { start: 10, end: 22, mood: 'deep_work',  theme: 'Tokyo Night' },
  { start: 22, end: 6,  mood: 'late_night', theme: 'Dracula' },
];

export const DEFAULT_SIGNAL_WEIGHTS: SignalWeights = {
  time:    100,
  typing:  0,
  spotify: 0,
  weather: 0,
  git:     0,
};
```

---

### `extension/`

**Purpose:** VS Code extension. Bundled with esbuild into `out/extension.js`. Deployed as `.vsix`.

```
extension/
├── src/
│   ├── extension.ts         # Entry point. activate() wires everything up.
│   ├── themeManager.ts      # Calls VS Code colorTheme API
│   ├── wsClient.ts          # WebSocket client — connects to Railway backend
│   ├── statusBar.ts         # Status bar item showing current mood
│   ├── moodEngine.ts        # Weighted scoring engine (Phase 2 complete)
│   ├── override.ts          # Manual override — pins mood for 1/2/4 hours
│   ├── commands.ts          # Registers VS Code commands
│   └── signals/
│       ├── timeSignal.ts    # Time-of-day signal (complete)
│       ├── typingSignal.ts  # Typing tracker (Phase 2 complete)
│       ├── spotifySignal.ts # Converts SpotifySignalPayload → MoodName (Phase 3)
│       ├── weatherSignal.ts # Converts WeatherSignalPayload → MoodName (Phase 3)
│       └── gitSignal.ts     # Runs git log, returns GitSignalPayload (Phase 3)
├── .vscodeignore
├── package.json
└── tsconfig.json
```

**Build:** `npm run bundle -w extension` — esbuild bundles everything into `out/extension.js`.

**Extension activation flow:**
1. `activate()` — reads `userId` from `globalState`, generates UUID on first run
2. `wsClient.ts` connects to `wss://railway-url`, sends `{ type: 'register', userId }`
3. Fetches config from `GET /api/config/:userId` — loads brackets, themeMappings, signalWeights
4. Typing tracker starts listening to `onDidChangeTextDocument`
5. Git signal reads local git log immediately, then every 10 minutes
6. `setInterval` every 60s → `evaluateAndApply()` → weighted mood engine → theme switch
7. Every 5min → typing stats → `signalScores.typing` updated → re-evaluate
8. `spotify_update` WS message → `signalScores.spotify` updated → re-evaluate
9. `weather_update` WS message → `signalScores.weather` updated → re-evaluate
10. `config_update` WS message → update brackets + signalWeights → re-evaluate

**Weighted mood engine (`moodEngine.ts`) — complete:**
- Takes `brackets`, `signalWeights`, `signalScores`
- Normalizes weights to sum to 1.0
- Converts each MoodName to numeric score (morning=0, post_lunch=1, deep_work=2, late_night=3)
- Applies weights, rounds to nearest MoodName
- Falls back to time signal if no weights > 0

**Signal score types:**
```ts
export interface SignalScores {
  time?: MoodName;
  typing?: MoodName;
  spotify?: MoodName;
  weather?: MoodName;
  git?: MoodName;
}
```

**Spotify signal (`spotifySignal.ts`) — Phase 3:**
- Receives `SpotifySignalPayload` from backend via WebSocket
- High energy + high valence + fast tempo → `deep_work`
- Low energy + low valence + slow tempo → `late_night`
- High acousticness + medium valence → `morning`
- Does NOT poll Spotify directly — backend handles OAuth and polling

**Weather signal (`weatherSignal.ts`) — Phase 3:**
- Receives `WeatherSignalPayload` from backend via WebSocket
- clear → `morning`, cloudy → `deep_work`, rainy → `post_lunch`, stormy → `late_night`
- Does NOT call OpenWeatherMap directly — backend handles API and caching

**Git signal (`gitSignal.ts`) — Phase 3:**
- Runs `git log` via `child_process` inside the extension
- Analyzes last 20 commits — frequency, revert ratio, fix commit density
- High reverts + many fix commits → frustrated → `late_night`
- High frequency + clean commits → flow → `deep_work`
- Runs locally — no backend involvement

**Important behaviours:**
- Works offline — falls back to `DEFAULT_BRACKETS` + `DEFAULT_SIGNAL_WEIGHTS`
- `userId` stored in `ExtensionContext.globalState` — no auth
- Manual override bypasses mood engine entirely
- Privacy-first typing — content never logged

---

### `backend/`

**Purpose:** Node.js + Express server on Railway. Persists config, serves REST API, runs WebSocket server, handles Spotify OAuth and polling, handles weather fetching.

```
backend/
├── src/
│   ├── index.ts             # Entry point
│   ├── db.ts                # Mongoose → MongoDB Atlas
│   ├── routes/
│   │   ├── config.ts        # GET + PUT /api/config/:userId
│   │   ├── logs.ts          # GET + POST /api/logs
│   │   └── auth.ts          # Spotify OAuth — /auth/spotify, /auth/spotify/callback
│   ├── models/
│   │   ├── User.ts          # userId, brackets, themeMappings, signalWeights
│   │   ├── MoodLog.ts       # userId, mood, theme, source, timestamp
│   │   └── SpotifyToken.ts  # userId, accessToken, refreshToken, expiresAt
│   ├── services/
│   │   ├── spotifyPoller.ts # Polls Spotify every 30s per connected user, pushes via WS
│   │   └── weatherFetcher.ts# Fetches OpenWeatherMap, 15min cache, pushes via WS
│   ├── ws/
│   │   ├── server.ts        # userId → WebSocket map. Broadcasts messages.
│   │   └── handlers.ts      # Handles register, ping, log_mood
│   └── middleware/
│       └── cors.ts          # Allows Vercel dashboard + extension origins
├── package.json
└── tsconfig.json
```

**REST API:**

| Method | Path | What it does |
|--------|------|--------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/config/:userId` | Returns brackets + themeMappings + signalWeights |
| `PUT` | `/api/config/:userId` | Saves config → WS push to extension |
| `GET` | `/api/logs/:userId` | Mood history |
| `POST` | `/api/logs` | Log mood switch |
| `GET` | `/auth/spotify` | Redirects to Spotify OAuth consent screen |
| `GET` | `/auth/spotify/callback` | Handles OAuth callback, stores tokens |
| `GET` | `/auth/spotify/status/:userId` | Returns whether Spotify is connected |

**Spotify OAuth flow (Phase 3):**
```
User clicks "Connect Spotify" in dashboard
       ↓
Dashboard → GET /auth/spotify?userId=<uuid>
       ↓
Backend redirects to Spotify consent screen
       ↓
User approves → Spotify redirects to /auth/spotify/callback
       ↓
Backend exchanges code for access + refresh tokens
Stores in SpotifyToken model
       ↓
spotifyPoller starts polling for this userId every 30s
Pushes { type: 'spotify_update', payload } over WebSocket
       ↓
Extension receives → getMoodFromSpotify(payload) → signalScores.spotify
```

**Weather flow (Phase 3):**
```
On extension register → backend fetches weather for user's IP
Caches for 15 minutes in memory
Pushes { type: 'weather_update', payload } over WebSocket
Re-fetches every 15 minutes, pushes again if condition changed
```

**MongoDB models:**

`User`:
```ts
{ userId, brackets, themeMappings, signalWeights, createdAt, updatedAt }
```

`MoodLog`:
```ts
{ userId, mood, theme, source: 'time'|'typing'|'spotify'|'weather'|'git'|'override', timestamp }
```

`SpotifyToken`:
```ts
{ userId, accessToken, refreshToken, expiresAt, scope }
```

**Environment variables (Railway):**
```
MONGODB_URI = mongodb+srv://...
PORT = 3001
SESSION_SECRET = random_secret
NODE_ENV = production
SPOTIFY_CLIENT_ID = from Spotify Developer Dashboard
SPOTIFY_CLIENT_SECRET = from Spotify Developer Dashboard
SPOTIFY_REDIRECT_URI = https://your-railway-url.railway.app/auth/spotify/callback
OPENWEATHER_API_KEY = from openweathermap.org
```

---

### `dashboard/`

**Purpose:** React + Vite app on Vercel. Personal config UI.

```
dashboard/
├── src/
│   ├── main.tsx
│   ├── App.tsx              # Routes: /, /themes, /history, /signals
│   ├── pages/
│   │   ├── BracketsPage.tsx # Edit time brackets
│   │   ├── ThemesPage.tsx   # Map moods → theme names
│   │   ├── HistoryPage.tsx  # Recharts mood history chart
│   │   └── SignalsPage.tsx  # Signal weight sliders (Phase 2 complete)
│   ├── components/
│   │   ├── BracketEditor.tsx
│   │   ├── MoodChart.tsx
│   │   ├── SignalToggle.tsx  # Toggle + weight slider per signal (complete)
│   │   ├── SpotifyConnect.tsx # "Connect Spotify" button + status (Phase 3)
│   │   └── OverrideBanner.tsx
│   ├── hooks/
│   │   ├── useConfig.ts
│   │   └── useLogs.ts
│   └── api/
│       ├── client.ts        # Axios: baseURL from VITE_API_URL
│       ├── config.ts
│       ├── logs.ts
│       └── spotify.ts       # getSpotifyStatus(), initiateSpotifyConnect() (Phase 3)
├── vite.config.ts
├── package.json
└── tsconfig.json
```

**Environment variables (Vercel):**
```
VITE_API_URL = https://your-railway-url.railway.app
```

---

## Full End-to-End Flow (Phase 3)

```
[Every 60 seconds]
extension → signalScores.time   = getTimeSignalMood(brackets)
          → signalScores.typing = last computed typing mood
          → signalScores.spotify = last received from WS
          → signalScores.weather = last received from WS
          → signalScores.git    = last computed from git log
          → getMood(brackets, signalWeights, signalScores)
          → applyTheme() → statusBar.update() → POST /api/logs

[Every 5 minutes]
typingTracker.getStats() → getMoodFromTyping() → signalScores.typing → re-evaluate

[Every 10 minutes]
gitSignal.analyze() → getMoodFromGit() → signalScores.git → re-evaluate

[Every 30 seconds — backend]
spotifyPoller → Spotify API → SpotifySignalPayload
             → WS push { type: 'spotify_update', payload }
extension    → getMoodFromSpotify(payload) → signalScores.spotify → re-evaluate

[Every 15 minutes — backend]
weatherFetcher → OpenWeatherMap → WeatherSignalPayload
              → WS push { type: 'weather_update', payload }
extension     → getMoodFromWeather(payload) → signalScores.weather → re-evaluate

[Spotify OAuth]
dashboard → /auth/spotify?userId → Railway → Spotify consent → callback
         → tokens stored → poller starts → WS push begins

[Config save]
dashboard → PUT /api/config/:userId → MongoDB → WS push → extension updates
```

---

## Rules for AI Assistants Working on This Project

1. **Current phase is Phase 3.** Build Spotify first, then weather, then git. Do not implement custom moods or Marketplace publishing yet.
2. **No auth system beyond userId.** `userId` is a UUID from VS Code `globalState`. Spotify tokens are stored per userId in MongoDB — no login UI needed.
3. **Dashboard is personal.** No multi-user, no roles.
4. **Backend is on Railway, dashboard on Vercel.** Not localhost.
5. **`shared/` is the source of truth for types.** Change types in `shared/src/types/` first, always recompile shared before building extension or dashboard.
6. **Extension uses esbuild bundling.** `npm run bundle` not `npm run compile`. `@moodcode/shared` is bundled in.
7. **Spotify and weather signals come FROM the backend via WebSocket.** The extension does NOT call Spotify or OpenWeatherMap directly. Only the git signal runs locally in the extension.
8. **Git signal runs in the extension via child_process.** No backend involvement for git.
9. **Weather is cached 15 minutes server-side.** Do not fetch on every WebSocket message.
10. **Spotify tokens are refreshed server-side.** The backend handles token refresh automatically before each poll.
11. **Extension must work offline.** Falls back to `DEFAULT_BRACKETS` + `DEFAULT_SIGNAL_WEIGHTS`. Never crash if backend unreachable.
12. **Weighted mood engine is already built.** Just update `signalScores.spotify`, `signalScores.weather`, `signalScores.git` — the engine picks them up automatically.
13. **First-match-wins for bracket evaluation.** Top-to-bottom, stop at first match.
14. **WebSocket carries config_update, spotify_update, weather_update.** Not for git (local) or typing (local).
15. **SPOTIFY_REDIRECT_URI must be the Railway URL** — Spotify OAuth callback cannot be localhost in production.