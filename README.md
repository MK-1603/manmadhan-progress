# 🚀 Manmadhan Progress

> A highly advanced, unified personal productivity and life-management platform built to track goals, habits, projects, and learning, powered by AI intelligence and seamless third-party integrations.

![Architecture: Monorepo](https://img.shields.io/badge/Architecture-Monorepo-blue.svg)
![Frontend: Next.js](https://img.shields.io/badge/Frontend-Next.js-black.svg)
![Backend: Node.js](https://img.shields.io/badge/Backend-Node.js-green.svg)
![Database: Postgres](https://img.shields.io/badge/Database-PostgreSQL-blue.svg)
![ORM: Drizzle](https://img.shields.io/badge/ORM-Drizzle-orange.svg)

---

## 🌟 Core Features

- **🎯 Personal Management:** Comprehensive tracking for Goals, Habits, Projects, Tasks, and Journals.
- **📚 Learning Hub:** Dedicated tracking for Books, Podcasts, and General Learning.
- **🔐 Secure Vault:** End-to-end encrypted storage for sensitive personal information.
- **🤖 Intelligence Layer:** Built-in AI assistants powered by OpenAI, Gemini, Groq, and Nvidia NIM for automated progress summaries and smart suggestions.
- **🔗 Integrations Hub:**
  - **Google Calendar:** Two-way sync for events and time-blocking.
  - **GitHub:** Sync repositories, track issues, and pull requests directly in your dashboard.
  - **RSS Feeds:** Built-in RSS reader for staying updated on favorite blogs.
- **⚡ Real-time Sync:** Powered by WebSockets and Upstash Redis.
- **🛡️ Authentication:** Bulletproof auth powered by Better Auth (Google, GitHub, Apple, and Email OTP).

---

## 🏗️ Architecture

This project is structured as a Monorepo using npm workspaces.

- `/apps/web` - **Frontend:** Next.js (App Router), Tailwind CSS, Framer Motion, and shadcn/ui.
- `/backend` - **Backend:** Node.js, Express, Drizzle ORM, connecting to a Neon Serverless Postgres Database.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL Database (Local or Neon)
- Redis (Local or Upstash)

### 1. Clone & Install
```bash
git clone https://github.com/MK-1603/manmadhan-progress.git
cd manmadhan-progress
npm install
```

### 2. Environment Variables

You need to set up environment variables for both the backend and frontend.

**Backend (`/backend/.env`)**
Copy the `.env.example` file and fill in your keys:
```bash
cp backend/.env.example backend/.env
```
*Crucial backend variables:*
- `DATABASE_URL` (Postgres connection string)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (For OAuth & Integrations)
- `GITHUB_INTEGRATION_CLIENT_ID` / `GITHUB_INTEGRATION_CLIENT_SECRET` (For GitHub integrations)
- `GEMINI_API_KEY` (For AI features)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (For WebSockets)
- `TOKEN_ENCRYPTION_KEY` (32-byte hex string for encrypting integration tokens)

**Frontend (`/apps/web/.env.local`)**
```bash
cp apps/web/.env.example apps/web/.env.local
```

### 3. Database Setup

Run the Drizzle migrations to set up your PostgreSQL schema:

```bash
cd backend
npm run db:push
# or run the custom migration script
npx tsx run_migration.ts
```

### 4. Running the Application

Start both the backend and frontend servers:

**Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:4100
```

**Frontend:**
```bash
cd apps/web
npm run dev
# Runs on http://localhost:3000
```

---

## 🔐 OAuth & Integrations Setup

Because this app connects to personal Google Calendars and GitHub repositories, you must whitelist the following callback URLs in your respective Developer Consoles:

- **Google (Authentication):** `http://localhost:4100/api/v1/auth/google/callback`
- **Google (Calendar Integration):** `http://localhost:4100/api/v1/personal/integrations/GoogleCalendar/callback`
- **GitHub (Authentication):** `http://localhost:4100/api/v1/auth/github/callback`
- **GitHub (Integration):** `http://localhost:4100/api/v1/personal/integrations/GitHub/callback`

*(Note: During local development, Google may display a "Google hasn't verified this app" warning. You can bypass this by clicking `Advanced -> Go to [App Name] (unsafe)`).*

---

## 📄 License

This project is private and maintained by MK-1603.
