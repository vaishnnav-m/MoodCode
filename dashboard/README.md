# MoodCode Configuration Dashboard

**The personal control panel for your developer environment.**

This is a React + Vite + TypeScript single-page application (SPA) designed to serve as the user-facing configuration interface for MoodCode. Running locally or deployed to Vercel, it allows developers to build custom time schedules, associate moods to editor themes, tune signal weights, and explore graphical history logs tracking editor theme transitions.

---

## Features & Pages

### 1. Signals weights (`/signals`)
Configure the telemetry inputs utilized by the blended mood scoring engine. Features:
* **Interactive Sliders**: Drag weights (0–100) for active signals:
  * **Time of Day**: Traditional clock schedules.
  * **Typing Activity**: WPM and pause-based intensity score.
  * **Spotify playback**: Valence, energy, tempo, and acousticness.
  * **Local Weather**: Adapts to outside temperature and climate conditions.
  * **Git Behavior**: Analyzes active workflow velocity and revert factors.
* **Spotify OAuth Connection (`<SpotifyConnect />`)**: A dedicated connection panel linking your Spotify account for real-time player polling on the backend.
* **Effective Weight Visualizer**: Live normalized chart previewing how the VS Code extension will blend the values.

### 2. Schedule Brackets (`/`)
Organize your daily workflow schedules top-to-bottom. The engine implements a **first-match-wins** parser, allowing narrower custom focus slots (e.g., post-lunch review) to override wider defaults (e.g., deep work).

### 3. Theme Mappings (`/themes`)
Map project mood states (`morning`, `post_lunch`, `deep_work`, `late_night`) to your installed VS Code theme IDs (such as *Tokyo Night*, *GitHub Light*, or *Dracula*).

### 4. Mood History (`/history`)
A Recharts-driven dashboard detailing:
* Transitions log of active moods.
* The specific telemetry source driver that triggered each automatic theme shift.

---

## Technical Architecture

* **Framework**: React 19, TypeScript, Vite
* **Styles**: Vanilla CSS for maximized custom rendering and dynamic layouts.
* **State & Data**: Built-in hooks (`useConfig`, `useLogs`) querying the backend REST API via Axios.
* **WebSocket Integration**: Saving variables triggers instant push notifications from the backend directly to active VS Code client instances.

---

## Getting Started

### Development Command
From the monorepo root directory:
```bash
npm run dev
# Starts dashboard at http://localhost:5173
```

Or from the `dashboard` folder:
```bash
npm run dev
```

### Build for Production
To test code bundling and tree-shaking:
```bash
npm run build
```

---

## Environment Configuration

Configure this variable when deploying the dashboard (e.g. Vercel):

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | The fully qualified REST URL of the deployed Railway backend (e.g. `https://your-backend.railway.app`) |

---

## Deployment

The project is pre-configured for Vercel. SPA client-side routing is handled through the [root `vercel.json`](../vercel.json) ruleset rewriting all routes to `index.html`.
