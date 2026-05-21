# MoodCode — AI Assistant Context

> Read this file before helping with any code in this project.
> This is the single source of truth for what MoodCode is, how it's structured, and what phase we're in.

---

## What is MoodCode?

MoodCode is a **VS Code extension + personal web dashboard** that dynamically switches your editor theme based on real-time signals from your environment. It reads signals like Spotify activity, git behavior, time of day, local weather, and typing patterns — combines them into a weighted mood score — and switches your VS Code theme automatically.

The **web dashboard** is a **personal config UI** (not a multi-user admin panel). It runs locally at `localhost:5173` and is only ever used by the developer themselves to configure time brackets, theme mappings, and review mood history.

**Tech stack:** MERN (MongoDB, Express, React, Node.js) + VS Code Extension API + WebSockets

---

## Current Phase: MVP — Time-based theme switching only

We are building the **MVP**. The MVP implements **one signal only: time of day**. No Spotify, no weather, no git reader, no typing tracker yet.

### What the MVP does
- VS Code extension checks the current hour every 60 seconds
- Compares it against configurable time brackets (e.g. 6–10 = morning)
- Switches the VS Code theme automatically when the mood changes
- Shows current mood in the VS Code status bar
- Supports manual override (pin a mood for 1/2/4 hours)
- Web dashboard lets you edit time brackets and theme mappings
- Dashboard config changes push to the extension instantly via WebSocket
- Mood switch events are logged to MongoDB and shown as a history chart

### What is NOT built in MVP (future phases)
- Spotify signal (OAuth, audio features API)
- Weather signal (OpenWeatherMap)
- Git activity signal (commit frequency, revert ratio)
- Typing pattern tracker (WPM, backspace ratio)
- Signal weight sliders in dashboard
- Publishing to VS Code Marketplace
- Shareable mood reports

---

## Monorepo Structure

Flat monorepo at the root — no `packages/` wrapper folder. Uses **npm workspaces**.

```
moodcode/
├── shared/                  # Shared TypeScript types and constants
├── extension/               # VS Code extension
├── backend/                 # Node.js + Express + WebSocket server
├── dashboard/               # React + Vite personal config dashboard
├── package.json             # npm workspaces root
├── .env.example             # Template for all environment variables
├── .gitignore
└── turbo.json               # Add later when build caching is needed
```

Root `package.json` workspaces config (add `backend` and `dashboard` to the array when those packages exist):
```json
"workspaces": ["shared", "extension"]
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
│   │   ├── mood.ts          # MoodName enum + MoodState interface
│   │   ├── config.ts        # TimeBracket interface + UserConfig schema
│   │   ├── websocket.ts     # All WS message shapes (ClientMessage, ServerMessage)
│   │   └── signals.ts       # (future) typed interfaces for Spotify/weather/git payloads
│   └── constants/
│       ├── themes.ts        # Default mood → VS Code theme name mappings
│       └── brackets.ts      # Default time bracket config (out-of-box experience)
├── package.json
├── tsconfig.base.json
├── tsconfig.cjs.json       # → dist/cjs (Node / extension)
└── tsconfig.esm.json       # → dist/esm (Vite / dashboard)
```

**Build:** `npm run compile -w shared` emits dual packages — `dist/cjs` for `require`, `dist/esm` for `import` (see `package.json` `exports`). Run after changing shared source.

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
  theme: string;    // VS Code theme name e.g. "GitHub Light"
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
  morning:    'GitHub Light',
  deep_work:  'Tokyo Night',
  post_lunch: 'One Dark Pro',
  late_night: 'Dracula',
};
```

`brackets.ts`
```ts
export const DEFAULT_BRACKETS: TimeBracket[] = [
  { start: 6,  end: 10, mood: 'morning',    theme: 'GitHub Light' },
  { start: 10, end: 22, mood: 'deep_work',  theme: 'Tokyo Night'  },
  { start: 12, end: 14, mood: 'post_lunch', theme: 'One Dark Pro' },
  { start: 22, end: 6,  mood: 'late_night', theme: 'Dracula'      },
];
```

---

### `extension/`

**Purpose:** The VS Code extension. Runs inside VS Code. Compiled TypeScript → JS, packaged as `.vsix`. Connects to the backend over WebSocket and switches themes via the VS Code API.

```
extension/
├── src/
│   ├── extension.ts         # Entry point. activate() wires everything up.
│   ├── themeManager.ts      # Calls VS Code API to switch themes
│   ├── wsClient.ts          # WebSocket client — connects to backend
│   ├── statusBar.ts         # Status bar item showing current mood
│   ├── moodEngine.ts        # MVP: returns time signal. Future: weighted scoring.
│   ├── override.ts          # Manual override — pins mood for 1/2/4 hours
│   ├── commands.ts          # Registers VS Code commands
│   └── signals/
│       ├── timeSignal.ts    # MVP ONLY — reads hour, returns MoodName
│       ├── spotifySignal.ts # (future Phase 2)
│       ├── gitSignal.ts     # (future Phase 2)
│       ├── typingSignal.ts  # (future Phase 4)
│       └── weatherSignal.ts # (future Phase 2)
├── package.json             # Extension manifest (activation events, commands, publisher)
└── tsconfig.json
```

**MVP activation flow:**
1. `extension.ts` → `activate()` is called when VS Code loads
2. Reads `userId` from `ExtensionContext.globalState` (generates UUID on first run)
3. `wsClient.ts` connects to `ws://localhost:3001`, sends `{ type: 'register', userId }`
4. `setInterval` every 60s calls `moodEngine.ts`
5. `moodEngine.ts` calls `timeSignal.ts` → returns `MoodName`
6. If mood changed → `themeManager.ts` switches theme → `statusBar.ts` updates
7. Extension calls `POST /api/logs` to log the switch
8. If `config_update` WS message arrives → re-evaluate immediately

**Core VS Code API call:**
```ts
await vscode.workspace.getConfiguration('workbench')
  .update('colorTheme', themeName, vscode.ConfigurationTarget.Global);
```

**`timeSignal.ts` (the MVP brain):**
```ts
export function getMoodFromTime(brackets: TimeBracket[]): MoodName {
  const hour = new Date().getHours();
  for (const bracket of brackets) {
    if (hour >= bracket.start && hour < bracket.end) return bracket.mood;
  }
  return 'deep_work'; // fallback
}
```

**Important behaviours:**
- Extension must work offline without backend — falls back to `DEFAULT_BRACKETS` from `shared/`
- `userId` is a UUID stored in `ExtensionContext.globalState` — no login, no auth
- Manual override suppresses the polling loop for the chosen duration (1/2/4 hours)
- First-match-wins for bracket evaluation (top-to-bottom, stop at first match)

---

### `backend/`

**Purpose:** Local Node.js + Express server on `localhost:3001`. Persists config to MongoDB, serves REST API, runs the WebSocket server that bridges the dashboard → extension.

```
backend/
├── src/
│   ├── index.ts             # Entry point. Starts Express + ws server.
│   ├── db.ts                # Mongoose connection setup
│   ├── routes/
│   │   ├── config.ts        # GET + PUT /api/config/:userId
│   │   ├── logs.ts          # GET /api/logs/:userId, POST /api/logs
│   │   └── auth.ts          # (future) Spotify OAuth callback
│   ├── models/
│   │   ├── User.ts          # userId, brackets, themeMappings, timestamps
│   │   ├── MoodLog.ts       # userId, mood, theme, source, timestamp
│   │   └── SpotifyToken.ts  # (future)
│   ├── services/
│   │   ├── moodEngine.ts    # (future) server-side weighted scoring
│   │   ├── spotifyPoller.ts # (future)
│   │   └── weatherFetcher.ts# (future)
│   ├── ws/
│   │   ├── server.ts        # userId → WebSocket map. Broadcasts config_update.
│   │   └── handlers.ts      # Handles incoming WS messages from extension
│   └── middleware/
│       └── cors.ts          # Allows localhost:5173 + extension origin
├── .env                     # Never committed
├── package.json
└── tsconfig.json
```

**REST API (MVP):**

| Method | Path | What it does |
|--------|------|--------------|
| `GET` | `/api/config/:userId` | Returns bracket config + theme mappings |
| `PUT` | `/api/config/:userId` | Saves config → broadcasts WS update to extension |
| `GET` | `/api/logs/:userId` | Mood history (`?days=7` or `?days=30`) |
| `POST` | `/api/logs` | Extension logs each theme switch |

**WebSocket broadcast flow:**
```
Dashboard  →  PUT /api/config/:userId
Backend    →  MongoDB.save()
           →  wsMap.get(userId).send({ type: 'config_update', brackets })
Extension  →  receives message → re-evaluates mood immediately
```

**MongoDB models:**

`User`:
```ts
{ userId: string, brackets: TimeBracket[], themeMappings: Record<MoodName, string>, createdAt, updatedAt }
```

`MoodLog`:
```ts
{ userId: string, mood: MoodName, theme: string, source: 'time' | 'spotify' | 'weather' | 'git' | 'typing' | 'override', timestamp: Date }
```

---

### `dashboard/`

**Purpose:** Personal React config UI at `localhost:5173`. Only used by you. Not deployed anywhere — local only.

```
dashboard/
├── src/
│   ├── main.tsx             # Vite entry. Mounts React + Router.
│   ├── App.tsx              # Root. Defines routes.
│   ├── pages/
│   │   ├── BracketsPage.tsx # Edit time brackets (MVP core page)
│   │   ├── ThemesPage.tsx   # Map moods → VS Code theme names
│   │   ├── HistoryPage.tsx  # Recharts mood history chart
│   │   └── SignalsPage.tsx  # (future) Signal weight sliders
│   ├── components/
│   │   ├── BracketEditor.tsx  # Hour inputs + mood selector rows
│   │   ├── MoodChart.tsx      # Recharts wrapper
│   │   ├── SignalToggle.tsx   # (future)
│   │   └── OverrideBanner.tsx # Shows when extension is in override mode
│   ├── hooks/
│   │   ├── useConfig.ts     # Fetch + mutate bracket config
│   │   └── useLogs.ts       # Fetch mood history
│   └── api/
│       ├── client.ts        # Axios: baseURL=localhost:3001, userId header
│       ├── config.ts        # getConfig(), saveConfig()
│       └── logs.ts          # getLogs()
├── vite.config.ts           # Proxies /api/* → localhost:3001
├── package.json
└── tsconfig.json
```

**Routes (MVP):**
- `/` → BracketsPage — edit brackets, Save → PUT /api/config → WS push to extension
- `/themes` → ThemesPage — map MoodName → theme string
- `/history` → HistoryPage — Recharts line chart, 7 or 30 day

---

## Default Mood → Theme Mappings

| Mood | Hours | Theme | Feel |
|------|-------|-------|------|
| `morning` | 6–10 | GitHub Light | Clean, airy |
| `deep_work` | 10–22 | Tokyo Night | Focused, dark |
| `post_lunch` | 12–14 | One Dark Pro | Easy on eyes |
| `late_night` | 22–6 | Dracula | Deep dark |

Post-lunch overlaps deep_work — first-match-wins, so order brackets with post_lunch before deep_work in the array.

---

## Full End-to-End Flow (MVP)

```
[Every 60 seconds inside VS Code]
extension/moodEngine.ts
  → signals/timeSignal.ts → getMoodFromTime(brackets) → MoodName
  → themeManager.ts → vscode API → colorTheme updated
  → statusBar.ts → status bar label updated
  → POST /api/logs → mood event saved to MongoDB

[When you save config in the dashboard]
dashboard/BracketsPage → PUT /api/config/:userId
backend/routes/config.ts → User.save() to MongoDB
backend/ws/server.ts → wsMap.get(userId).send({ type: 'config_update', brackets })
extension/wsClient.ts → receives message → triggers immediate re-evaluation
```

---

## Environment Variables

```bash
# backend/.env  (never committed)
MONGODB_URI=mongodb://localhost:27017/moodcode
PORT=3001
SESSION_SECRET=your_secret_here   # needed later for Spotify OAuth

# dashboard — no .env needed, vite.config.ts proxy handles API routing in dev
```

---

## Rules for AI Assistants Working on This Project

1. **MVP = time signal only.** Do not implement or suggest Spotify, weather, git, or typing signals. Those are future phases.
2. **No auth system.** `userId` is a UUID from VS Code `globalState`, sent as a request header. No login, no sessions, no JWT in MVP.
3. **Dashboard is personal.** No multi-user, no roles, no user management.
4. **Backend is local only.** No deployment, no cloud services, no environment-specific configs beyond localhost.
5. **`shared/` is the source of truth for types.** If a type needs changing, change it in `shared/src/types/` first, then update consumers.
6. **`moodEngine.ts` stays thin in MVP.** It just calls `timeSignal.ts`. Do not add multi-signal logic until Phase 2.
7. **First-match-wins for brackets.** Evaluate top-to-bottom, return on first match.
8. **Extension must work offline.** If backend/WebSocket is unavailable, fall back to `DEFAULT_BRACKETS` from `shared/`. Never crash.
9. **Future signal files exist as stubs only.** `spotifySignal.ts`, `gitSignal.ts` etc. exist in the folder but are empty stubs — do not implement them in MVP.
10. **WebSocket is for real-time config push only** in MVP. Not for mood scoring, not for signal data. Just `config_update` and `register`/`log_mood`/`ping`.