# Phoenix Dashboard

A self-hosted, always-on widget dashboard designed to turn any phone into a smart display. Built as a progressive web app with a modular widget system, section-based layout, encrypted API key storage, and a responsive grid that adapts from phones to desktops.

## Features

- **PWA** — installable on any device, works offline with cached data
- **Section-based layout** — organize widgets into named sections with flexible layouts (full-width, left/right splits, left-full-height, right-full-height)
- **4-group tabs** — separate dashboard views into up to 8 independent groups
- **Drag & drop** — reorder widgets across sections with mouse or touch
- **Dark / light theme** — toggle from settings
- **Orientation lock** — force portrait, landscape, or auto
- **Encrypted secrets** — API keys stored with AES-256-GCM encryption
- **Password-protected dashboard** — environment-variable-based password gate (`VITE_DASHBOARD_PASSWORD`)
- **Shared state across devices** — all settings save to the server's `dashboard-state.json`, visible to every logged-in device
- **localStorage fallback** — offline-capable with cached state when the server is unreachable
- **Per-widget refresh** — configurable refresh intervals with stale data detection
- **Safe area support** — respects notches, rounded corners, and system insets
- **Offline banner** — shows cached data indicator when connectivity is lost
- **Retry with backoff** — automatic retry on failed API requests
- **Smart home controls** — control Tuya Cloud devices (lights, robot vacuum) directly from the dashboard

## Widgets

| Widget | Description | API Required |
|--------|-------------|:------------:|
| **Clock** | Time and date with 12h/24h format, timezone, seconds toggle | No |
| **Weather** | Current conditions with geocoding | [OpenWeatherMap](https://openweathermap.org/api) |
| **Weather Forecast** | Upcoming hours forecast with geocoding | [OpenWeatherMap](https://openweathermap.org/api) |
| **Animated GIFs** | Rotating GIF display from static URLs or Giphy API | [Giphy](https://developers.giphy.com/) (optional) |
| **Lights** | Control smart lights — on/off, brightness, color picker, temperature presets | [Tuya Cloud](https://iot.tuya.com/) |
| **Robot Vacuum** | Control robot vacuum — power, start/stop/dock, battery, status | [Tuya Cloud](https://iot.tuya.com/) |
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
# Required — used to encrypt stored API keys
ENCRYPTION_KEY=change-me-to-a-32-byte-random-string!!

# Required — set a password to lock the dashboard
VITE_DASHBOARD_PASSWORD=your-password-here

# Optional — global fallback API keys (can also be set per-widget in Settings)
OPENWEATHER_API_KEY=
GIPHY_API_KEY=

# Optional — Tuya Cloud (for Lights & Robot Vacuum widgets)
TUYA_ACCESS_ID=
TUYA_ACCESS_SECRET=
TUYA_API_ENDPOINT=https://openapi.tuyaus.com
TUYA_USER_CODE=
TUYA_USER_TOKEN=
TUYA_USER_EXPIRY=
TUYA_KNOWN_DEVICE_IDS=

# Optional — server port (default: 3001)
PORT=3001
```

### Run (Development)

```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 5173) with hot reload.

> **Note:** After changing `VITE_DASHBOARD_PASSWORD` in `.env`, restart the dev server. Vite reads env vars at startup.

### Build & Run (Production)

```bash
npm run build
npm run start
```

The backend serves the compiled frontend from `frontend/dist/` on port 3001.

### Tuya Cloud Setup (Lights & Vacuum)

1. Create a developer account at [Tuya IoT Platform](https://iot.tuya.com/)
2. Create a project with the **Smart Home** industry and **Device Management** capability
3. Under **Authorize API Services**, add: Smart Home Basic Service, IoT Core, IoT Enhanced Web
4. Link your smart home devices to the project via the Tuya Smart / Smart Life app
5. Copy your **Access ID** and **Access Secret** into `.env` as `TUYA_ACCESS_ID` and `TUYA_ACCESS_SECRET`
6. If devices can't be discovered via API, set `TUYA_KNOWN_DEVICE_IDS` to a comma-separated list of device IDs (visible in the Tuya platform device list)

## Project Structure

```
phoenix-dashboard/
├── backend/
│   └── src/
│       ├── server.ts              # Express entry point
│       ├── types.ts               # Shared types (WidgetDefinition, DashboardSection, etc.)
│       ├── config/encryption.ts   # AES-256-GCM encrypt/decrypt
│       ├── db/index.ts            # JSON file persistence (dashboard-state.json)
│       ├── routes/api.ts          # REST API routes
│       └── widgets/               # Per-widget route handlers + registry
│           ├── registry.ts        # Widget definitions and config schemas
│           ├── weather/route.ts   # OpenWeatherMap proxy + cache
│           ├── gifs/route.ts      # Giphy proxy + cache
│           ├── lights/route.ts    # Tuya Cloud light controls (toggle, brightness, color, temp)
│           ├── vacuum/route.ts    # Tuya Cloud vacuum controls (power, start, stop, dock)
│           ├── tuya/client.ts     # Tuya Cloud API client (HMAC-SHA256 auth, iot-03 endpoints)
│           └── ai-qa/route.ts     # AI Q&A (stubbed)
├── frontend/
│   └── src/
│       ├── main.tsx               # Bootstrap + PWA registration
│       ├── App.tsx                # Routes with auth gate
│       ├── auth.tsx               # AuthProvider + useAuth (password via VITE_DASHBOARD_PASSWORD)
│       ├── api.ts                 # API fetch helpers with retry + stale-while-revalidate
│       ├── types.ts               # Frontend types (WidgetProps, WidgetState, etc.)
│       ├── styles/index.css       # All styles (CSS Grid, themes, responsive, login)
│       ├── components/            # Shared components (WidgetCard)
│       ├── hooks/                 # useWidgetData, useSectionDragDrop, useOnlineStatus
│       ├── utils/                 # storage (cache layer), id (UUID generator)
│       ├── pages/                 # Dashboard, Settings, Login
│       └── widgets/               # Widget components
│           ├── registry.ts        # Frontend widget registry
│           ├── clock/Widget.tsx
│           ├── weather/Widget.tsx, ForecastWidget.tsx
│           ├── gifs/Widget.tsx
│           ├── lights/Widget.tsx  # Light controls (toggle, brightness, color, temperature presets)
│           ├── vacuum/Widget.tsx  # Robot vacuum (power, start/stop/dock, battery, status)
│           └── ai-qa/Widget.tsx
└── .env.example
```

## API

All endpoints are prefixed with `/api`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/dashboard` | Full dashboard state (widgets + sections + settings) |
| `PUT` | `/api/dashboard` | Save full dashboard state (shared across devices) |
| `GET` | `/api/widgets/registry` | Available widget definitions |
| `PUT` | `/api/dashboard/widgets` | Save widget layout and config |
| `PUT` | `/api/dashboard/settings` | Save global settings |
| `GET` | `/api/dashboard/sections` | List dashboard sections |
| `POST` | `/api/dashboard/sections` | Create a new section |
| `PUT` | `/api/dashboard/sections/reorder` | Reorder sections |
| `DELETE` | `/api/dashboard/sections/:id` | Delete a section |
| `POST` | `/api/dashboard/keys` | Store an encrypted API key |
| `GET` | `/api/dashboard/keys/:widgetId/:keyName` | Check if a key exists |
| `DELETE` | `/api/dashboard/keys/:widgetId` | Delete keys for a widget |
| `GET` | `/api/weather` | Fetch weather data |
| `GET` | `/api/gifs` | Fetch GIF URLs |
| `GET` | `/api/lights/devices` | List smart lights with status |
| `POST` | `/api/lights/control` | Control a light (toggle, brightness, color, color_temp) |
| `GET` | `/api/vacuum/status` | Get robot vacuum status (battery, state) |
| `POST` | `/api/vacuum/control` | Control vacuum (power_on, power_off, start, stop, dock) |
| `POST` | `/api/ask` | AI Q&A (stubbed) |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, React Router DOM 7, Vite 6, TypeScript 5.7 |
| Backend | Express 4, TypeScript 5.7, tsx (dev) |
| Storage | JSON file persistence (server), localStorage (client-side cache/offline fallback) |
| PWA | vite-plugin-pwa, Workbox |
| Encryption | Node.js crypto (AES-256-GCM) |

## License

MIT
