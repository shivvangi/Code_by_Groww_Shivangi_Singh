# Smart Wishlist - Code, By Groww

An intelligent, real-time stock watchlist platform featuring automated "Meaningful Change" detection, dual-currency tracking (INR / USD), interactive card stack & grid interfaces, and integrated market news.

---

## 🌟 Key Features

- **Meaningful Change Detection**: Automatically flags and prioritizes stocks in your watchlist that require immediate attention:
  - **Volume Spike**: Current trading volume exceeds $1.5\times$ the 10-day average volume.
  - **Price Drift**: Price moved $\ge 2\%$ since the user's previous session/view.
- **Dynamic Prioritization**: Stocks requiring attention are elevated to the front of the stack/grid, accompanied by contextual change reason badges.
- **Dual Currency Conversion**: Toggle between **USD ($)** and **INR (₹)** on the fly with live exchange rate integration.
- **Interactive Stack & Grid Views**:
  - **Stack View**: Fluid, gesture-friendly 3D card stack navigation powered by Framer Motion.
  - **Grid View**: Comprehensive overview displaying all tracked equities at a glance.
- **Live Market News & Sparkline Trends**: 7-day interactive price history charts and curated news for tracked tickers.
- **Session Tracking & Persistence**: Real-time Supabase database integration storing user sessions, last-viewed timestamps, and watchlists with Row Level Security (RLS).

---

## 🏗️ Architecture

```
grow_hack/
├── backend/                  # Express + TypeScript API Server
│   ├── src/
│   │   ├── routes/           # Watchlist, search, & news routes
│   │   ├── services/         # Yahoo Finance integration & change analysis
│   │   └── supabase.ts       # Supabase database client
│   ├── .env.example          # Environment variables template
│   └── package.json
│
├── frontend/                 # Next.js 16 + React 19 Frontend
│   ├── src/
│   │   ├── app/              # App Router pages & styles
│   │   ├── components/       # Stock cards, search modal, news feed, currency toggle
│   │   └── lib/              # API client & Supabase helpers
│   ├── .env.local.example    # Frontend environment variables template
│   └── package.json
│
└── supabase_schema.sql       # Database schema and RLS policies
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended, v20+ / v24 supported)
- npm or yarn

### 1. Database Setup (Supabase)
Run the queries in `supabase_schema.sql` inside your Supabase project's SQL Editor to initialize `user_sessions` and `watchlists` tables with appropriate Row Level Security policies.

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env

# Start development server (runs on http://localhost:5001)
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install --legacy-peer-deps
cp .env.local.example .env.local

# Start Next.js development server (runs on http://localhost:3000)
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Running Tests

Both backend and frontend are comprehensively tested using Vitest.

### Backend Tests
```bash
cd backend
npm run test
```

### Frontend Tests
```bash
cd frontend
npm run test
```
