# MoodCode VS Code Extension

**Your VS Code theme, matched to your day and workflow.**

MoodCode is a VS Code extension that automatically switches your editor color theme based on real-time signals from your environment. The extension processes multiple signals—time of day, typing metrics, Spotify player updates, weather conditions, and git log history—to evaluate your current developer context and apply your favorite color themes.

---

## Current Features

### 1. Blended Telemetry Engine
The extension combines environmental data points to compute your current mood:
* **Time of Day** (`time`): Traditional hour schedule matching configured brackets.
* **Keystroke Tracker** (`typing`): Privacy-first keystroke analytics. Measures words per minute (WPM), backspace corrections, and keyboard idle durations. *Keystroke content is never captured, logged, or sent.*
* **Spotify Playback** (`spotify`): Receives real-time player telemetry from the backend. Maps energy, acousticness, tempo, and positivity (valence) to editor moods.
* **Local Weather** (`weather`): Syncs local conditions via backend IP geolocation (OpenWeatherMap API), adjusting your editor based on temperature and climate conditions.
* **Git Behavior** (`git`): Analyzes the last 20 workspace commits via a local `git log` child process. Flags debugging cycles (high revert count and fix commit density) or high-velocity flow states.

### 2. Manual Overrides
Freeze your theme state by pinning a mood for 1, 2, or 4 hours from the command palette. The blended engine is bypassed until the override timer expires.

### 3. Status Bar Telemetry
Displays your active mood state and the primary driving telemetry source (e.g. `Morning`, `Deep Work [Git]`) directly in the VS Code status bar.

### 4. Offline Fallbacks
Sensible default brackets and themes are built into the extension, allowing it to function and switch themes offline or if your backend is down.

---

## Extension Commands

| Command | ID | Description |
|---------|----|-------------|
| `MoodCode: Set Mood Override…` | `moodcode.override` | Freeze a mood state for 1, 2, or 4 hours |
| `MoodCode: Refresh Mood` | `moodcode.refresh` | Re-evaluate and re-apply current theme mappings immediately |
| `MoodCode: Open Dashboard` | `moodcode.openDashboard` | Open the personal React dashboard containing your `userId` |

---

## Extension Settings

Customize connection addresses by adding these settings to your VS Code `settings.json`:

| Setting | Default | Description |
|---------|---------|-------------|
| `moodcode.backendUrl` | `https://moodcode-api-production.up.railway.app` | The REST API server endpoint |
| `moodcode.wsUrl` | `wss://moodcode-api-production.up.railway.app` | The real-time WebSocket updates channel |
| `moodcode.dashboardUrl` | `https://moodcode-dashboard.vercel.app` | Your deployed personal settings dashboard URL |
| `moodcode.pollIntervalMs` | `60000` | Recheck timer duration for time brackets (ms) |

Example `settings.json`:

```json
{
  "moodcode.backendUrl": "http://localhost:3001",
  "moodcode.wsUrl": "ws://localhost:3001",
  "moodcode.dashboardUrl": "http://localhost:5173",
  "moodcode.pollIntervalMs": 60000
}
```

---

## Default Schedule

When no weight sliders are set, the extension falls back to these default schedules:

| Mood | Hours (24h) | Default Theme |
|------|-------------|---------------|
| Morning | 6 – 10 | GitHub Light Default |
| Post-lunch | 12 – 14 | One Dark Pro |
| Deep work | 10 – 22 | Tokyo Night |
| Late night | 22 – 6 | Dracula |

*Overlapping brackets use a **first-match-wins** evaluation rule. Put narrower custom slots (like post-lunch) before broader defaults (like deep work).*

---

## Development

To build the extension within the monorepo workspace:

1. **Compile Code**:
   ```bash
   # Compile shared libraries & bundle extension with esbuild
   npm run compile
   ```

2. **Package .vsix**:
   ```bash
   # Build the extension VSIX package
   npm run package -w extension
   ```

3. **Install Package**:
   ```bash
   # Install generated vsix in VS Code
   code --install-extension moodcode-0.0.1.vsix --force
   ```
