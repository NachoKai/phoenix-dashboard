# Phoenix Dashboard

A self-hosted, always-on widget dashboard designed to turn any phone into a smart display. Built as a progressive web app with a modular widget system, encrypted API key storage, and a responsive grid that adapts from phones to desktops.

## Features

- **PWA** — installable on any device, works offline with cached data
- **Responsive grid** — CSS Grid layout adapts from phone landscape to desktop
- **Drag & drop** — reorder widgets with mouse or touch
- **Dark / light theme** — toggle from settings
- **Encrypted secrets** — API keys stored with AES-256-GCM encryption
- **PIN-protected settings** — optional lock on the settings page
- **localStorage persistence** — settings survive server restarts and cold starts
- **Per-widget refresh** — configurable refresh intervals with stale data detection
- **Safe area support** — respects notches, rounded corners, and system insets

## Widgets

| Widget | Description | API Required |
|--------|-------------|:------------:|
| **Clock** | Time and date with 12h/24h format, timezone, seconds toggle | No |
| **Weather** | Current conditions + 6-period forecast with geocoding | [OpenWeatherMap](https://openweathermap.org/api) |
| **Animated GIFs** | Rotating GIF display from static URLs or Giphy API | [Giphy](https://developers.giphy.com/) (optional) |
| **AI Q&A** | LLM-powered question answering | Coming soon |

## Getting Started

### Prerequisites

- Node.js 20+
- npm (workspaces support required)

### Install

```bash
git clone https://github.com/NachoKai/phoenix-dashboard.git
cd phoenix-dashboard
npm install
```

### Configure

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Required — minimum 16 characters, used to encrypt stored API keys
ENCRYPTION_KEY=your-random-string-at-least-16-chars

# Optional — global fallback API keys (can also be set per-widget in Settings)
OPENWEATHER_API_KEY=
GIPHY_API_KEY=

# Optional — protect the settings page (leave empty to disable)
SETTINGS_PIN=

# Optional — server port (default: 3001)
PORT=3001
```

### Run (Development)

```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 5173) with hot reload.

### Build & Run (Production)

```bash
npm run build
npm run start
```

The backend serves the compiled frontend from `frontend/dist/` on port 3001.

## Project Structure

```
phoenix-dashboard/
├── backend/
│   └── src/
│       ├── server.ts              # Express entry point
│       ├── config/encryption.ts   # AES-256-GCM encrypt/decrypt
│       ├── db/index.ts            # In-memory storage (settings, widgets, cache)
│       ├── routes/api.ts          # REST API routes
│       └── widgets/               # Per-widget route handlers
│           ├── weather/route.ts   # OpenWeatherMap proxy + cache
│           └── gifs/route.ts      # Giphy proxy + cache
├── frontend/
│   └── src/
│       ├── main.tsx               # Bootstrap + PWA registration
│       ├── App.tsx                # Routes
│       ├── api.ts                 # API fetch helpers
│       ├── styles/index.css       # All styles (CSS Grid, themes, responsive)
│       ├── components/            # Shared components (WidgetCard)
│       ├── hooks/                 # useWidgetData, useDragReorder, useOnlineStatus
│       ├── pages/                 # Dashboard, Settings
│       └── widgets/               # Widget components (clock, weather, gifs, ai-qa)
└── .env.example
```

## API

All endpoints are prefixed with `/api`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/dashboard` | Full dashboard state (widgets + settings) |
| `GET` | `/api/widgets/registry` | Available widget definitions |
| `PUT` | `/api/dashboard/widgets` | Save widget layout and config |
| `PUT` | `/api/dashboard/settings` | Save global settings |
| `POST` | `/api/dashboard/keys` | Store an encrypted API key |
| `GET` | `/api/dashboard/keys/:widgetId/:keyName` | Check if a key exists |
| `DELETE` | `/api/dashboard/keys/:widgetId` | Delete keys for a widget |
| `GET` | `/api/settings/pin-required` | Check if PIN is enabled |
| `POST` | `/api/settings/verify-pin` | Verify settings PIN |
| `GET` | `/api/weather` | Fetch weather data |
| `GET` | `/api/gifs` | Fetch GIF URLs |
| `POST` | `/api/ask` | AI Q&A (stubbed) |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, React Router 7, Vite 6, TypeScript 5.7 |
| Backend | Express 4, TypeScript 5.7, tsx (dev) |
| Storage | In-memory server, localStorage (client-side persistence) |
| PWA | vite-plugin-pwa, Workbox |
| Encryption | Node.js crypto (AES-256-GCM) |

## License

MIT
