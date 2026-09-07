<p align="center">
  <img src="public/logo1.svg" alt="Agri Monitor Logo" width="120" />
</p>

<h1 align="center">Agri Monitor</h1>

<p align="center">
  <strong>Pakistan's #1 AI-Powered Agricultural Monitoring Platform</strong><br />
  Smart crop management, real-time weather intelligence, market rates, expert Agri Doctor consultations and AI-driven insights — all in one dashboard.
</p>

<p align="center">
  <a href="https://agrimonitorai.netlify.app/">
    <img src="https://img.shields.io/badge/Live_Demo-Netlify-brightgreen?style=flat-square" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Vite-8-purple?style=flat-square&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-skyblue?style=flat-square&logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Firebase-Auth_%2B_Firestore_%2B_RTDB-orange?style=flat-square&logo=firebase" alt="Firebase" />
</p>

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Agri Doctor](#agri-doctor)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Scripts](#scripts)

---

## About

**Agri Monitor** is a full-featured web application built to help farmers and agronomists manage their crops from sowing to harvest. By simply registering a crop and its sowing date, the platform generates personalised daily tasks, AI-powered recommendations, irrigation schedules, growth timelines, weather alerts and market intelligence — all tailored to the individual field. Farmers can also book a private consultation slot and talk directly to a real Agri Doctor.

The platform connects to external AI endpoints for intelligent analysis (crop disease detection from photos, recommendation generation, timeline planning) and stores all user data securely in Firebase (Authentication + Firestore + Realtime Database).

> **Live URL:** [https://agrimonitorai.netlify.app/](https://agrimonitorai.netlify.app/)

---

## Features

### Dashboard

| Module | Description |
|--------|-------------|
| **Dashboard Home** | Overview of all crops, quick-start guide cards and navigation to every dashboard section. |
| **Add New Crop** | Register a crop with its sowing date, image and field details to unlock all AI features. |
| **Crop Progress** | Today's tasks, mark them done, log field activities and record daily crop condition. |
| **Crop Timeline** | Full lifecycle plan — germination, vegetative, flowering, maturity stages with estimated harvest date. |
| **Crop Suggestion** | AI recommendations for irrigation, nutrition, pest & disease monitoring matched to your crop's real data. |
| **Weather Forecast** | Hourly and daily forecasts with farming-specific guidance for irrigation, spraying and harvest planning. |
| **Weather Alerts** | Proactive warnings for heavy rain, heatwaves, frost and wind that can affect your crops. |
| **Disaster Alerts** | Regional disaster feed with impact analysis, maps and safety recommendations. |
| **Global Market Rates** | World commodity prices from a live market feed with watchlist, price alerts, comparison and AI decision support. |
| **Agri Doctor** | Book a private 2-hour consultation slot with a real Agri Doctor — text, crop photos and voice notes, paid from a credit wallet. See [Agri Doctor](#agri-doctor). |
| **AI Chatbot** | Floating assistant on every dashboard page — ask about crop diseases, weather or care, and attach photos for AI analysis. |

### Public Pages

- **Home** — Hero video, feature highlights, blog section and call-to-action.
- **Features** — Detailed breakdown of platform capabilities.
- **Services** — Overview of all agri-services offered.
- **Blogs** — Agricultural knowledge articles.
- **Contact Us** — Get in touch form.
- **Login / Sign Up** — Firebase Authentication with Google sign-in support.

---

## Agri Doctor

**Agri Doctor** is the platform's human-expert layer. Instead of an AI answer, a farmer books a private consultation slot and talks to a real Agri Doctor inside the dashboard.

### How It Works

1. The farmer opens **Dashboard → Expert Consultation → Agri Doctor** and picks one of the fixed daily 2-hour slots (`08:00–10:00` … `18:00–20:00`) for today or the next two days.
2. Booking costs **5 credits** and reserves one of **3 seats** in that slot. Once all three seats are taken the slot shows **Full**.
3. The private chat opens **exactly at the slot's own start time** — booking the 11:00 slot at 08:00 shows an *Upcoming* card counting down to 11:00 — and closes automatically 2 hours later.
4. While the window is open, both sides can send **text, images and voice notes**; every message is stored in Firestore.
5. When the window ends the consultation moves to **Past consultations** as a read-only thread, so the doctor's advice can be re-read at any time.

### Credits & Lifecycle Rules

| Rule | Behaviour |
|------|-----------|
| Free credits | 100 granted once per account on first visit |
| Cost per slot | 5 credits, deducted atomically inside a Firestore transaction |
| Slot capacity | 3 farmers per slot, then **Full** |
| Window length | 2 hours, starting at the slot's own start hour |
| Attended booking | `closed` → kept in **Past consultations** |
| No-show booking | `removed` → hidden from the farmer and the seat is released; credits are **not** refunded |

> **Note:** Attendance is recorded the moment the farmer sends their first message. The lifecycle sweep (close attended windows / clear no-shows) runs on page load and every 30 seconds from both the farmer page and the doctor console, so windows still close when nobody is watching. It is overlap-guarded and idempotent.

### Doctor Console

The doctor side is a separate protected route — it is **not** part of the farmer dashboard and shares no layout with it.

| Item | Detail |
|------|--------|
| **URL** | `/doctor` |
| **Gate** | Username + password, defined in `src/doctor/doctorAuth.js` (`DOCTOR_CREDENTIALS`) |
| **Identity** | Passing the gate also establishes a dedicated Firebase Auth session, which is what the Firestore rules authorise against. On first login the account is auto-provisioned. |
| **Views** | Queue (live windows first, then upcoming) · Unread · All · Closed · No-shows |
| **Sign out** | Only signs out when the current Firebase user is the doctor account, so a farmer session is never clobbered |

> **Security note:** the doctor username/password is a UI gate only — it ships inside the client bundle and must not be treated as a secret. Real authorisation is enforced by the `isDoctor()` rule in `firestore.rules`, which matches the signed-in account's email. Keep the two in sync, and use a separate browser profile (or incognito) when testing the doctor console next to a farmer session.

### Required Firestore Rules

`firestore.rules` must be **published** in the Firebase console (Firestore Database → Rules → Publish) before the doctor console can read other users' sessions. This repository has no `firebase.json` / `.firebaserc`, so the rules cannot be deployed from the CLI.

```
match /agriDoctor/main/credits/{uid}                        → owner only
match /agriDoctor/main/slots/{slotKey}                      → any signed-in user, or the doctor
match /agriDoctor/main/sessions/{sessionId}                 → owner or doctor
match /agriDoctor/main/sessions/{sessionId}/messages/{id}   → owner or doctor
```

### Data Model

Everything lives under one root collection with a fixed `main` hub document, because a Firestore **collection** path must have an odd number of segments (`agriDoctor/slots` would be a document path and throws *Invalid collection reference*):

```
agriDoctor/main/credits/{uid}                       # { balance, grantedAt }
agriDoctor/main/slots/{date}__{slotId}              # { booked }  (capacity 3)
agriDoctor/main/sessions/{sessionId}                # { userId, date, startMs, endMs, status, unread… }
agriDoctor/main/sessions/{sessionId}/messages/{id}  # { type, text, mediaData, senderRole, createdAtMs }
```

| Field | Purpose |
|-------|---------|
| `startMs` / `endMs` | Local epoch-ms window bounds. The composer is locked before `startMs` and read-only after `endMs`. |
| `bookedAtMs` | Numeric booking stamp — ordering never relies on `serverTimestamp()`, so no composite indexes are needed. |
| `status` | `active` → `closed` (attended) or `removed` (no-show) |
| `userAttended` | Set on the farmer's first message; decides closed vs removed |
| `unreadForUser` / `unreadForDoctor` | Per-viewer unread counters, cleared on open |

> Images and voice notes are compressed client-side (`browser-image-compression`, `MediaRecorder`) and stored inline as base64 to stay under Firestore's 1 MB per-document limit.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React 19 |
| **Build Tool** | Vite 8 |
| **Styling** | Tailwind CSS 4 |
| **UI Components** | shadcn/ui (Radix UI primitives + class-variance-authority) |
| **Icons** | Lucide React, Tailwind Icons, Font Awesome |
| **Routing** | React Router DOM 7 |
| **Backend / Auth** | Firebase (Authentication, Firestore, Realtime Database) |
| **Forms** | React Hook Form |
| **Markdown** | react-markdown + remark-gfm |
| **Image Processing** | browser-image-compression |
| **Email Notification Workflow** | N8N, Docker, Nginx, Duckdns|
| **Workflow Deployment** | Alibaba Cloud (ECS)|
| **Deployment** | Netlify (Node 22 runtime) |
| **Version Control** | Git, Github |
| **IDE** | Qoder |

---

## Project Structure

```
agrimonitor/
├── public/                  # Static assets (logos, favicon)
├── router/                  # Routing configuration & layouts
│   ├── routers.jsx          # All route definitions
│   ├── layout.jsx           # Public pages layout (Navbar + Footer)
│   ├── dashboardLayout.jsx  # Dashboard layout (Sidebar + Chatbot)
│   └── lazyWithRetry.js     # Chunk-failure self-healing wrapper
├── src/
│   ├── assets/              # Images, backgrounds, videos
│   ├── components/          # Shared UI components
│   │   └── ui/              # shadcn/ui primitives (button, card, dialog, etc.)
│   ├── dashboard/           # Dashboard pages & sub-components
│   │   ├── marketplace/     # Global Market Rates sub-components
│   │   ├── timeline/        # Crop timeline sub-components
│   │   ├── weather/         # Weather forecast sub-components
│   │   ├── disasteralerts/  # Disaster alert sub-components
│   │   ├── agridoctor/      # Agri Doctor sub-components (farmer side)
│   │   └── ...              # Other dashboard pages
│   ├── doctor/              # Doctor console — separate protected /doctor route
│   ├── features/            # Auth context, protected routes
│   ├── lib/                 # Utility functions & helpers
│   ├── pages/               # Public pages (home, login, services, etc.)
│   ├── services/            # AI & data services (timeline, weather, market, etc.)
│   └── styles/              # Global CSS & shadcn theme
├── .env.example             # Environment variable template
├── .env.production          # Production env values (committed)
├── firestore.rules          # Firestore security rules (must be published manually)
├── netlify.toml             # Netlify build & redirect config
├── vite.config.js           # Vite configuration
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 22.12.0 (Vite 8 requirement)
- **npm** >= 10

### Installation

```bash
# Clone the repository
git clone https://github.com/ShayanSheikh1936/Agri-Monitor.git
cd agrimonitor

# Install dependencies
npm install

# Create your local environment file
cp .env.example .env.local
```

### Running Locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the next available port).

### Building for Production

```bash
npm run build
```

The production-ready output will be in the `dist/` directory.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Purpose | Consumed By |
|----------|---------|-------------|
| `Qwen-Model` | Images Analisis and predictions using Qwen2.5 VL 72B Instruct | `Vite_API_URL, Vite_DASHBOARD_URL` |
| `VITE_API_URL` | Chatbot AI endpoint (POST) | `src/components/chatbots.jsx` |
| `VITE_DASHBOARD_URL` | Dashboard AI endpoint (timeline, image analysis, recommendations, suggestions) | `src/services/timelineGenerator.js` |
| `VITE_WEBHOOK_URL` | Notification webhook URL | Welcome Notification, Weather Alert notifications |
| `VITE_DISASTER_API_URL` | Disaster alert feed (leave empty for mock data) | `src/services/disasterAlertService.js` |
| `VITE_MARKET_API_URL` | Global commodity market feed | `src/services/marketRateService.js` |

> **Note:** `.env.local` is gitignored. For Netlify deployments, add all variables to `.env.production` (committed) or set them in the Netlify UI under Site Configuration > Environment Variables.

---

## Deployment

The project is configured for **Netlify** deployment:

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** 22
- **SPA fallback:** `/* → /index.html` (status 200) for deep-link support
- **Cache strategy:** HTML files are never cached; hashed assets are cached for 1 year

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server with HMR |
| `npm run build` | Build the app for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint on all source files |

---


<p align="center">
  Built with care for the farming community.
</p>
