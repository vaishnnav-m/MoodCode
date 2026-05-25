# MoodCode — AI Assistant Context

> Read this file before helping with any code in this project.
> This is the single source of truth for what MoodCode is, how it's structured, and what phase we're in.

---

## What is MoodCode?

MoodCode is a **VS Code extension + personal web dashboard** that dynamically switches your editor theme based on real-time signals from your environment. It reads signals like Spotify activity, git behavior, time of day, local weather, and typing patterns — combines them into a weighted mood score — and switches your VS Code theme automatically.

The **web dashboard** is a **personal config UI** (not a multi-user admin panel). It is deployed on Vercel and used by the developer to configure time brackets, theme mappings, signal weights, and review mood history.

**Tech stack:** MERN (MongoDB Atlas, Express, React/Vite, Node.js) + VS Code Extension API + WebSockets

---

## Current Phase: Phase 2 — Weighted mood engine + typing signal

The MVP (time-based switching) is complete and deployed. We are now implementing:
1. **Weighted mood engine** — combines multiple signals with configurable weights into a single MoodName
2. **Typing signal** — tracks WPM, backspace ratio, pause frequency inside VS Code

### What is already built and working
- VS Code extension published as `.vsix`
- Time-of-day signal — checks hour every 60s, switches theme automatically
- Status bar showing current mood
- Manual override — pins mood for 1/2/4 hours
- WebSocket connection between extension and backend
- Backend deployed on Railway
- Dashboard deployed on Vercel
- Mood history logged to MongoDB Atlas
- Config changes push from dashboard → backend → extension via WebSocket instantly

### What we are building now (Phase 2)
- `SignalWeights` type in shared — weights for each signal (time, typing, spotify, weather, git)
- `DEFAULT_SIGNAL_WEIGHTS` constant in shared
- Weighted mood engine in `extension/src/moodEngine.ts` — replaces thin MVP version
- `extension/src/signals/typingSignal.ts` — keystroke tracker, privacy-first
- Signal weight sliders in `dashboard/src/pages/SignalsPage.tsx`
- `signalWeights` field added to User model in backend
- Backend config routes updated to persist signalWeights

### What is NOT built yet (future phases)
- Spotify signal (OAuth, audio features API) — Phase 3
- Weather signal (OpenWeatherMap) — Phase 3
- Git activity signal (commit frequency, revert ratio) — Phase 3
- Publishing to VS Code Marketplace
- Shareable mood reports

---

## Infrastructure

| Service | Platform | URL |
|---------|----------|-----|
| Backend | Railway | `https://moode-code-api.onrender.com` (confirm actual URL) |
| Dashboard | Vercel | `https://moodcode-dashboard.vercel.app` |
| Database | MongoDB Atlas | Free tier, allow all IPs (0.0.0.0/0) |

**Extension default settings (`extension/package.json`):**
```json
"moodcode.backendUrl": "https://your-railway-url.railway.app",
"moodcode.wsUrl": "wss://your-railway-url.railway.app",
"moodcode.dashboardUrl": "https://moodcode-dashboard.vercel.app",
"moodcode.pollIntervalMs": 60000
```

**Deployment configs:**
- `railway.json` at monorepo root — builds shared + backend, starts with `node backend/dist/index.js`
- `vercel.json` at monorepo root — builds shared + dashboard, rewrites all routes to `index.html` for SPA routing

---

## Monorepo Structure

Flat monorepo at the root — no `packages/` wrapper folder. Uses **npm workspaces**.

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
├── .env.example             # Template for environment variables
├── .gitignore
└── MOODCODE_CONTEXT.md      # This file
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

**Purpose:** The glue between all packages. Pure TypeScript with zero runtime dependencies. Both the extension and backend import from here. Prevents type drift between packages.

```
shared/
├── src/
│   ├── types/
│   │   ├── mood.ts          # MoodName type
│   │   ├── config.ts        # TimeBracket, SignalWeights, UserConfig interfaces
│   │   ├── websocket.ts     # ClientMessage, ServerMessage discriminated unions
│   │   └── signals.ts       # (future) Spotify/weather/git signal payload types
│   └── constants/
│       ├── themes.ts        # THEME_DEFAULTS — default mood → theme mappings
│       └── brackets.ts      # DEFAULT_BRACKETS + DEFAULT_SIGNAL_WEIGHTS
├── package.json             # exports: cjs (require) + esm (import)
├── tsconfig.base.json
├── tsconfig.cjs.json        # → dist/cjs (Node / extension via esbuild)
└── tsconfig.esm.json        # → dist/esm (Vite / dashboard)
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
  start: number;    // hour 0–23
  end: number;      // hour 0–23
  mood: MoodName;
  theme: string;
}

export interface SignalWeights {
  time: number;      // 0–100
  typing: number;    // 0–100
  spotify: number;   // 0–100 (future)
  weather: number;   // 0–100 (future)
  git: number;       // 0–100 (future)
}

export interface UserConfig {
  brackets: TimeBracket[];
  themeMappings: Record<MoodName, string>;
  signalWeights: SignalWeights;
}
```

`websocket.ts`
```ts
export type ServerMessage =
  | { type: 'config_update'; brackets: TimeBracket[] }
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
  { start: 10, end: 22, mood: 'deep_work',  theme: 'Tokyo Night' },
  { start: 12, end: 14, mood: 'post_lunch', theme: 'One Dark Pro' },
  { start: 22, end: 6,  mood: 'late_night', theme: 'Dracula' },
];

export const DEFAULT_SIGNAL_WEIGHTS: SignalWeights = {
  time:    100,  // MVP: time is 100% until other signals are added
  typing:  0,    // disabled until typing signal implemented
  spotify: 0,
  weather: 0,
  git:     0,
};
```

---

### `extension/`

**Purpose:** The VS Code extension. Bundled with esbuild into a single `out/extension.js`. Deployed as `.vsix`. Connects to Railway backend over WebSocket.

```
extension/
├── src/
│   ├── extension.ts         # Entry point. activate() wires everything up.
│   ├── themeManager.ts      # Calls VS Code colorTheme API
│   ├── wsClient.ts          # WebSocket client — connects to Railway backend
│   ├── statusBar.ts         # Status bar item showing current mood
│   ├── moodEngine.ts        # Weighted scoring engine (Phase 2 — being built now)
│   ├── override.ts          # Manual override — pins mood for 1/2/4 hours
│   ├── commands.ts          # Registers VS Code commands
│   └── signals/
│       ├── timeSignal.ts    # Time-of-day signal — getMoodFromTime()
│       ├── typingSignal.ts  # Typing tracker (Phase 2 — being built now)
│       ├── spotifySignal.ts # (future Phase 3)
│       ├── gitSignal.ts     # (future Phase 3)
│       └── weatherSignal.ts # (future Phase 3)
├── .vscodeignore            # Excludes everything except out/extension.js
├── package.json             # Extension manifest + hosted URLs as defaults
└── tsconfig.json
```

**Build:** `npm run bundle -w extension` — esbuild bundles everything including `@moodcode/shared` into `out/extension.js`. Always compile shared first.

**Bundle command:**
```
esbuild src/extension.ts --bundle --outfile=out/extension.js --external:vscode --platform=node --target=node18 --format=cjs --conditions=require
```

**Extension activation flow:**
1. `activate()` called when VS Code loads (`onStartupFinished`)
2. Reads `userId` from `globalState` — generates UUID on first run
3. `wsClient.ts` connects to `wss://railway-url`, sends `{ type: 'register', userId }`
4. Fetches config from `GET /api/config/:userId` — loads brackets, themeMappings, signalWeights
5. Typing tracker starts listening to `onDidChangeTextDocument`
6. `setInterval` every 60s → `evaluateAndApply()` → weighted mood engine → theme switch
7. Every 5min → typing stats computed → `signalScores.typing` updated → re-evaluate
8. `config_update` WS message → update brackets in memory → re-evaluate immediately

**Weighted mood engine (`moodEngine.ts`):**
- Takes `brackets`, `signalWeights`, `signalScores` as input
- Normalizes weights to sum to 1.0
- Converts each MoodName to a numeric score, applies weights, rounds to nearest MoodName
- Falls back to time signal if no signals have weight > 0

**Important behaviours:**
- Works offline — falls back to `DEFAULT_BRACKETS` + `DEFAULT_SIGNAL_WEIGHTS` if backend unreachable
- `userId` stored in `ExtensionContext.globalState` — no auth, no login
- Manual override bypasses the mood engine entirely for chosen duration
- Privacy-first typing: content never logged, only aggregate stats (WPM, backspace ratio, pause count)

---

### `backend/`

**Purpose:** Node.js + Express server deployed on Railway. Persists config to MongoDB Atlas, serves REST API, runs WebSocket server bridging dashboard → extension.

```
backend/
├── src/
│   ├── index.ts             # Entry point. Express + WebSocket server on same port.
│   ├── db.ts                # Mongoose connection to MongoDB Atlas
│   ├── routes/
│   │   ├── config.ts        # GET + PUT /api/config/:userId
│   │   ├── logs.ts          # GET /api/logs/:userId, POST /api/logs
│   │   └── auth.ts          # (future) Spotify OAuth callback
│   ├── models/
│   │   ├── User.ts          # userId, brackets, themeMappings, signalWeights, timestamps
│   │   ├── MoodLog.ts       # userId, mood, theme, source, timestamp
│   │   └── SpotifyToken.ts  # (future)
│   ├── services/
│   │   ├── spotifyPoller.ts # (future)
│   │   └── weatherFetcher.ts# (future)
│   ├── ws/
│   │   ├── server.ts        # userId → WebSocket map. Broadcasts config_update.
│   │   └── handlers.ts      # Handles register, ping, log_mood messages
│   └── middleware/
│       └── cors.ts          # Allows Vercel dashboard + extension origins
├── package.json
└── tsconfig.json
```

**REST API:**

| Method | Path | What it does |
|--------|------|--------------|
| `GET` | `/health` | Health check — returns `{ status: 'ok' }` |
| `GET` | `/api/config/:userId` | Returns brackets + themeMappings + signalWeights |
| `PUT` | `/api/config/:userId` | Saves config → broadcasts WS config_update to extension |
| `GET` | `/api/logs/:userId` | Mood history (`?days=7` or `?days=30`) |
| `POST` | `/api/logs` | Extension logs each theme switch |

**WebSocket flow:**
```
Dashboard → PUT /api/config/:userId
Backend   → User.save() to MongoDB Atlas
          → broadcastConfigUpdate(userId, brackets) 
          → wsMap.get(userId).send({ type: 'config_update', brackets })
Extension → receives → updates brackets → evaluateAndApply() → theme switches
```

**WebSocket logging (added for debugging):**
- `[WS] Client connected from {ip}` — on connection
- `[WS] User registered: {userId}` — on register message
- `[WS] Pushing config update to {userId}` — on broadcastConfigUpdate
- `[WS] Cannot push to {userId} — not connected` — if socket missing

**MongoDB models:**

`User`:
```ts
{
  userId: string,
  brackets: TimeBracket[],
  themeMappings: Record<MoodName, string>,
  signalWeights: SignalWeights,
  createdAt: Date,
  updatedAt: Date
}
```

`MoodLog`:
```ts
{
  userId: string,
  mood: MoodName,
  theme: string,
  source: 'time' | 'typing' | 'spotify' | 'weather' | 'git' | 'override',
  timestamp: Date
}
```

**Environment variables (set in Railway dashboard):**
```
MONGODB_URI = mongodb+srv://...@cluster.mongodb.net/moodcode
PORT = 3001
SESSION_SECRET = random_secret
NODE_ENV = production
```

---

### `dashboard/`

**Purpose:** React + Vite app deployed on Vercel. Personal config UI — edit time brackets, theme mappings, signal weights, view mood history.

```
dashboard/
├── src/
│   ├── main.tsx             # Vite entry. Mounts React + Router.
│   ├── App.tsx              # Root. React Router routes.
│   ├── pages/
│   │   ├── BracketsPage.tsx # Edit time brackets (/)
│   │   ├── ThemesPage.tsx   # Map moods → theme names (/themes)
│   │   ├── HistoryPage.tsx  # Recharts mood history (/history)
│   │   └── SignalsPage.tsx  # Signal weight sliders (/signals) — being built now
│   ├── components/
│   │   ├── BracketEditor.tsx
│   │   ├── MoodChart.tsx
│   │   ├── SignalToggle.tsx  # Toggle + weight slider per signal — being built now
│   │   └── OverrideBanner.tsx
│   ├── hooks/
│   │   ├── useConfig.ts     # Fetches + mutates UserConfig (brackets + weights)
│   │   └── useLogs.ts       # Fetches mood history
│   └── api/
│       ├── client.ts        # Axios: baseURL from VITE_API_URL env var
│       ├── config.ts        # getConfig(), saveConfig()
│       └── logs.ts          # getLogs()
├── vite.config.ts           # No proxy — uses VITE_API_URL directly
├── package.json
└── tsconfig.json
```

**Environment variables:**
```
VITE_API_URL = https://your-railway-url.railway.app  (set in Vercel dashboard)
```

**Routes:**
- `/` → BracketsPage
- `/themes` → ThemesPage
- `/history` → HistoryPage
- `/signals` → SignalsPage (being built now)

**SPA routing:** `vercel.json` rewrites all routes to `index.html` so React Router handles navigation client-side.

**userId:** Always passed as `?userId=<uuid>` query param. `MoodCode: Open Dashboard` command in extension opens the correct URL automatically.

---

## Default Mood → Theme Mappings

| Mood | Hours | Theme | Feel |
|------|-------|-------|------|
| `morning` | 6–10 | GitHub Light Default | Clean, airy |
| `deep_work` | 10–22 | Tokyo Night | Focused, dark |
| `post_lunch` | 12–14 | One Dark Pro | Easy on eyes |
| `late_night` | 22–6 | Dracula | Deep dark |

Post-lunch overlaps deep_work — first-match-wins, order post_lunch before deep_work in the array.

---

## Full End-to-End Flow (Phase 2)

```
[Every 60 seconds]
extension → getTimeSignalMood(brackets) → signalScores.time
         → getMood(brackets, signalWeights, signalScores) → MoodName
         → applyTheme() → VS Code colorTheme updated
         → statusBar.update()
         → POST /api/logs

[Every 5 minutes]
extension/typingSignal → getStats() → { wpm, backspaceRatio, pauseCount }
                       → getMoodFromTyping(stats) → signalScores.typing
                       → evaluateAndApply() → re-evaluate with new typing score

[When dashboard saves config]
dashboard → PUT /api/config/:userId
backend   → User.save() to MongoDB
          → broadcastConfigUpdate(userId, brackets)
          → wsMap.get(userId).send({ type: 'config_update', brackets })
extension → updates brackets + signalWeights in memory
          → evaluateAndApply() immediately

[On VS Code startup]
extension → getOrCreateUserId()
          → fetchConfig() → loads brackets + themeMappings + signalWeights
          → wsClient connects → sends register message
          → evaluateAndApply()
```

---

## Rules for AI Assistants Working on This Project

1. **Current phase is Phase 2.** We are building the weighted mood engine and typing signal. Do not implement Spotify, weather, or git signals yet.
2. **No auth system.** `userId` is a UUID from VS Code `globalState`. No login, no JWT, no sessions.
3. **Dashboard is personal.** No multi-user, no roles, no user management.
4. **Backend is on Railway, dashboard on Vercel.** Not localhost. Update URLs accordingly.
5. **`shared/` is the source of truth for types.** Change types in `shared/src/types/` first, then update consumers. Always recompile shared before building extension or dashboard.
6. **Extension uses esbuild bundling.** `npm run bundle` not `npm run compile`. `@moodcode/shared` is bundled in — not a runtime dependency.
7. **Weighted mood engine:** normalizes weights, converts MoodName to numeric score, applies weights, converts back. Falls back to time signal if all weights are 0.
8. **Typing signal is privacy-first.** Only aggregate stats (WPM, backspace ratio, pause count) leave the machine. Content is never logged or sent anywhere.
9. **Extension must work offline.** Falls back to `DEFAULT_BRACKETS` + `DEFAULT_SIGNAL_WEIGHTS` if backend unreachable. Never crash.
10. **First-match-wins for bracket evaluation.** Top-to-bottom, stop at first match.
11. **WebSocket carries config_update only.** Not for signal data, not for mood scoring. Extension computes mood locally.
12. **signalWeights are stored in MongoDB** via the User model and returned as part of `GET /api/config/:userId`. Always include in UserConfig type.

## Phase 3 (upcoming) — not implemented yet
- Spotify signal: fetch listening history, map to moods
- Weather signal: fetch weather from API
- Git signal: analyze last commit message
- Don't implement these until explicitly asked.