# MoodCode

Switch your VS Code color theme automatically based on the time of day and your personal mood configuration.

MoodCode watches the clock, maps each part of your day to a mood (morning, deep work, post-lunch, late night), and applies the theme you chose. Use the optional local dashboard to edit brackets and theme mappings; changes sync to VS Code instantly over WebSocket.

---

## Features

- **Time-based themes** — Re-evaluates your mood on a configurable interval (default: every 60 seconds).
- **Status bar** — Shows the current mood in the VS Code status bar.
- **Mood override** — Pin any mood for 1, 2, or 4 hours via the command palette.
- **Config dashboard** — Open your personal settings UI in the browser (`MoodCode: Open Dashboard`).
- **Live updates** — Saving brackets in the dashboard pushes changes to the extension without reloading.
- **Bundled backend (optional)** — When installed from a `.vsix`, the extension can start its bundled API server automatically.
- **Offline-friendly** — Uses sensible default brackets and themes if the backend is down.

---

## Requirements

1. **VS Code** 1.120 or newer  
2. **MongoDB** — Local instance (default URI: `mongodb://localhost:27017/moodcode`)  
3. **Theme extensions** — Install themes that match your mappings, for example:
   - [GitHub Light](https://marketplace.visualstudio.com/items?itemName=GitHub.github-vscode-theme)
   - [Tokyo Night](https://marketplace.visualstudio.com/items?itemName=enkia.tokyo-night)
   - [One Dark Pro](https://marketplace.visualstudio.com/items?itemName=zhuangtongfa.material-theme)
   - [Dracula Official](https://marketplace.visualstudio.com/items?itemName=dracula-theme.theme-dracula)

The **config dashboard** is optional for basic use (defaults work out of the box). For full setup, run the MoodCode backend and dashboard from the [project repository](https://github.com/your-org/moodcode) or rely on the extension’s bundled server when installed from a `.vsix`.

---

## Getting started

### Install from a `.vsix`

1. Build or download `moodcode-0.0.1.vsix`.
2. In VS Code: **Extensions** → **⋯** → **Install from VSIX…**
3. Ensure **MongoDB** is running.
4. Reload VS Code. The extension activates on startup and can start the bundled backend when `moodcode.autoStartBackend` is enabled (default: `true`).
5. Run **MoodCode: Open Dashboard** to configure brackets (requires the dashboard dev server or a hosted URL — see repository README).

### First run

- A unique `userId` is generated and stored in VS Code global state (no login).
- Default time brackets and theme mappings apply until you save custom config via the dashboard or API.

---

## Commands

| Command | Description |
|---------|-------------|
| `MoodCode: Set Mood Override…` | Pin a mood for 1, 2, or 4 hours |
| `MoodCode: Refresh Mood` | Re-evaluate and apply the current mood immediately |
| `MoodCode: Open Dashboard` | Open the config UI in your browser with your `userId` |

---

## Extension settings

| Setting | Default | Description |
|---------|---------|-------------|
| `moodcode.backendUrl` | `http://localhost:3001` | REST API base URL |
| `moodcode.wsUrl` | `ws://localhost:3001` | WebSocket URL for config updates |
| `moodcode.dashboardUrl` | `http://localhost:5173` | Config dashboard URL |
| `moodcode.pollIntervalMs` | `60000` | Mood re-check interval (ms), minimum `10000` |
| `moodcode.autoStartBackend` | `true` | Start bundled or workspace backend on activate |
| `moodcode.mongodbUri` | `mongodb://localhost:27017/moodcode` | MongoDB URI passed to the auto-started backend |

Example `settings.json`:

```json
{
  "moodcode.backendUrl": "http://localhost:3001",
  "moodcode.autoStartBackend": true,
  "moodcode.mongodbUri": "mongodb://localhost:27017/moodcode"
}
```

---

## Default schedule

| Mood | Hours (24h) | Default theme |
|------|-------------|---------------|
| Morning | 6 – 10 | GitHub Light |
| Deep work | 10 – 22 | Tokyo Night |
| Post-lunch | 12 – 14 | One Dark Pro |
| Late night | 22 – 6 | Dracula |

Order matters: overlapping brackets use **first match wins**. Put post-lunch before deep work in your config.

---

## Development

From the monorepo root:

```bash
npm install
npm run dev          # backend + dashboard
```

In VS Code, open the `moodcode` folder and press **F5** (*Run Extension*) to launch an Extension Development Host.

```bash
cd extension
npm run compile
npm run watch        # TypeScript watch
npm test
```

Package for distribution (use the maintained CLI):

```bash
npx @vscode/vsce package
```

Prepublish compiles the extension and bundles the backend into `extension/server/`.

---

## Known issues

- **MongoDB must be running** — The extension cannot start the database for you.
- **Dashboard is separate in dev** — When hacking on the monorepo, start the dashboard with `npm run dev` at the root; the `.vsix` bundles the API server, not the Vite UI.
- **Theme names must match** — Theme strings must match installed theme IDs exactly, or VS Code will not switch themes.

---

## Release notes

### 0.0.1

- MVP: time-of-day mood detection and automatic theme switching
- Status bar mood display and manual override (1 / 2 / 4 hours)
- WebSocket config sync and mood switch logging via local backend
- Optional auto-start of bundled backend on activation

---

## More information

- [MoodCode repository](https://github.com/your-org/moodcode)
- [Issue tracker](https://github.com/your-org/moodcode/issues)
- [VS Code Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

**Enjoy coding in sync with your day.**
