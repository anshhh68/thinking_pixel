# Thinking Pixel IMS

> Internal Management System for Thinking Pixel — a creative digital agency.
> Covers the full agency workflow: clients → jobs → creative tasks → client approval → invoicing.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)

---

## What It Does
 i
| Module | Features |
|--------|----------|
| **Auth** | JWT login, role-based access (12 roles), demo accounts |
| **Clients** | Create and manage client records with priority, scope, timeline |
| **Jobs** | Full job pipeline — create, assign, track progress with Kanban view |
| **Creative Studio** | Upload asset versions, version timeline, mark tasks ready for review |
| **HOD Approvals** | Approve or request rework on creative tasks with feedback comments |
| **Client Review** | Public token-based portal for clients to approve or reject deliverables |
| **HR** | Employee roster, attendance marking, leave requests with approval workflow |
| **Accounts** | Invoice creation (approved jobs only), payment recording, overdue reminders |
| **Leadership** | Agency-wide KPI dashboard — HR, finance, jobs, and task breakdown |
| **Notifications** | In-app notification feed with unread filtering and pagination |
| **Audit Logs** | Immutable action log for compliance and accountability |

---

## Role-Based Access Control

| Role | Dashboard | Clients | Jobs | Creative | HR | Accounts | Leadership | Approvals | Audit |
|------|:---------:|:-------:|:----:|:--------:|:--:|:--------:|:----------:|:---------:|:-----:|
| ADMIN | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| HOD | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| CREATIVE_DIRECTOR | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | ✓ | — |
| SENIOR_GRAPHIC_DESIGNER | ✓ | — | ✓ | ✓ | — | — | — | ✓ | — |
| GRAPHIC_DESIGNER | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| MOTION_VIDEO_EDITOR | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| CONTENT_STRATEGIST | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — |
| ACCOUNT_MANAGER | ✓ | ✓ | ✓ | — | — | ✓ | ✓ | — | — |
| ACCOUNT_EXECUTIVE | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| ACCOUNTANT_FINANCE | ✓ | — | — | — | — | ✓ | — | — | ✓ |
| HR_MANAGER | ✓ | — | — | — | ✓ | — | ✓ | — | — |
| CLIENT | — | — | — | — | — | — | — | — | — |

> CLIENT role only accesses the public `/client-review/[token]` portal — no login required.

---

## Tech Stack

```
frontend/          Next.js 16 (App Router) · React 19 · Inline design system
backend/           Express 5 · Prisma 5 · PostgreSQL · JWT auth
scripts/           dev-all.js — starts both services concurrently
```

---

## Local Setup

### Prerequisites
- Node.js 20+
- PostgreSQL database

### 1. Clone & install

```bash
git clone https://github.com/HemVaria/Ims.git
cd Ims
npm install          # installs root workspace deps

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

**Backend** — create `backend/.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/thinking_pixel"
JWT_SECRET="your-strong-secret-here"
PORT=4000
```

**Frontend** — create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_BASE=http://localhost:4000/api
```

### 3. Set up the database

```bash
cd backend
npx prisma migrate deploy --schema=src/prisma/schema.prisma
npx prisma generate --schema=src/prisma/schema.prisma
node src/prisma/seed.js    # seed demo accounts
```

### 4. Run

```bash
# From project root — starts both backend (4000) and frontend (3000)
node scripts/dev-all.js
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@thinkingpixel.com` | `Admin@123` | ADMIN |
| `hod@thinkingpixel.com` | `Hod@123` | HOD |
| `staff@thinkingpixel.com` | `Staff@123` | STAFF |
| `client@thinkingpixel.com` | `Client@123` | CLIENT |

---

## Deployment

### Frontend → Vercel

1. Import repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** → `frontend`
3. Add environment variable:
   ```
   NEXT_PUBLIC_API_BASE = https://your-backend.railway.app/api
   ```

### Backend → Railway

1. New project on [railway.app](https://railway.app) → add PostgreSQL service
2. Deploy backend service from this repo — set **Root Directory** → `backend`
3. Add environment variables:
   ```
   DATABASE_URL  = (Railway Postgres URL)
   JWT_SECRET    = your-strong-secret
   PORT          = 4000
   ```
4. Set start command:
   ```
   npx prisma migrate deploy --schema=src/prisma/schema.prisma && node src/index.js
   ```

### Automated CI/CD (GitHub Actions)

Add `.github/workflows/deploy.yml` to auto-deploy on every push to `main`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
          vercel-args: '--prod'
```

> Set `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` in GitHub repo → Settings → Secrets.
> Railway auto-deploys on push when connected to GitHub — no extra config needed.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/clients` | List clients |
| POST | `/api/clients` | Create client |
| GET | `/api/jobs` | List jobs (paginated) |
| POST | `/api/jobs` | Create job |
| POST | `/api/jobs/:id/tasks` | Add task to job |
| PATCH | `/api/jobs/tasks/:id/ready` | Mark task ready for review |
| PATCH | `/api/jobs/tasks/:id/hod-decision` | HOD approve/rework |
| POST | `/api/jobs/:id/client-review-link` | Generate client review token |
| GET | `/api/jobs/public/:token` | Public client review data |
| POST | `/api/jobs/public/:token/decision` | Client approve/reject |
| POST | `/api/creative/tasks/:id/upload` | Upload asset version |
| GET | `/api/hr/employees` | List employees |
| POST | `/api/hr/leave-requests` | Submit leave request |
| GET | `/api/accounts/invoices` | List invoices (paginated) |
| POST | `/api/accounts/invoices` | Create invoice |
| PATCH | `/api/accounts/invoices/:id/payment` | Record payment |
| GET | `/api/leadership/kpis` | Agency-wide KPIs |
| GET | `/api/notifications` | Notifications (paginated) |
| GET | `/api/audit-logs` | Audit log (paginated) |

---

## Project Structure

```
Ims/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express app entry
│   │   ├── middleware/auth.js    # JWT middleware
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Data model
│   │   │   ├── seed.js           # Demo data seeder
│   │   │   └── migrations/
│   │   ├── routes/               # auth, clients, jobs, hr, creative, accounts...
│   │   ├── jobs/                 # Reminder scheduler
│   │   └── utils/                # Audit helper, pagination
│   └── package.json
├── frontend/
│   ├── app/                      # Next.js App Router pages
│   │   ├── dashboard/
│   │   ├── clients/
│   │   ├── jobs/
│   │   ├── creative/
│   │   ├── hr/
│   │   ├── accounts/
│   │   ├── approvals/hod/
│   │   ├── client-review/[token]/
│   │   ├── leadership/
│   │   ├── notifications/
│   │   └── audit/
│   ├── components/               # AppShell, Sidebar, Navbar, ui.js
│   ├── lib/                      # api.js, theme.js, auth.js
│   └── package.json
├── scripts/dev-all.js            # Concurrent dev runner
└── package.json
```
