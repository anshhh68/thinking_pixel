# Thinking Pixel IMS — AI Context File
_Last updated: 2026-05-09_

---

## 1. What This Project Is

**Thinking Pixel IMS** (Internal Management System) — a full-stack web app built for Thinking Pixel, a creative agency. It manages clients, jobs, tasks, HR, invoicing, approvals, and audit logs — all under a role-based access control (RBAC) system.

**Live URLs:**
- Frontend: https://thinking-pixel-ims.vercel.app
- Backend: Render (service name: `ims-backend`)
- GitHub repo: https://github.com/HemVaria/Ims (private)

---

## 2. Tech Stack

| Layer      | Technology                                              |
|------------|---------------------------------------------------------|
| Frontend   | Next.js 15 (App Router), pure CSS-in-JS (no Tailwind)  |
| Backend    | Node.js + Express.js                                    |
| ORM        | Prisma v5                                               |
| Database   | PostgreSQL on **Neon** (free tier)                      |
| Auth       | Custom JWT (no NextAuth)                                |
| Hosting    | Vercel (frontend) + Render (backend)                    |
| CI/CD      | GitHub push to `main` triggers auto-deploy on both      |

---

## 3. RBAC — Role-Based Access Control

Four roles, each sees a different set of pages:

| Role   | Pages Accessible                                                            |
|--------|-----------------------------------------------------------------------------|
| ADMIN  | Dashboard, Clients, Jobs, HR, Accounts, Creative, Leadership, Notifications, Audit |
| HOD    | Dashboard, Approvals (HOD), Jobs, Creative, Notifications                   |
| STAFF  | Dashboard, Jobs (assigned), Creative (own tasks), Notifications             |
| CLIENT | Client Review page only (via unique token link)                             |

Demo accounts seeded at deploy:
- `admin@thinkingpixel.com` / `Admin@123`
- `hod@thinkingpixel.com` / `Hod@123`
- `staff@thinkingpixel.com` / `Staff@123`
- `client@thinkingpixel.com` / `Client@123`

---

## 4. Database Schema (Prisma — PostgreSQL on Neon)

Models:
- **User** — id, name, email, passwordHash, role (CLIENT/STAFF/HOD/ADMIN)
- **Client** — name, contactInfo, requirements, scope, timeline, priority
- **Job** — linked to Client; title, owner, dueDate, priority, status, clientReviewToken
- **Task** — linked to Job; assignedTo, status (TODO/IN_PROGRESS/DONE), readyForReview, hodReviewStatus
- **AssetVersion** — file versions per task (fileUrl, versionNumber)
- **Employee** — linked to User; department, joinDate
- **Attendance** — per Employee, per day
- **LeaveRequest** — per Employee, with status (PENDING/APPROVED/REJECTED)
- **Invoice** — linked to Job + Client; amount, amountPaid, dueDate, status
- **Notification** — per user or per role; isRead flag
- **AuditLog** — actorId, actorRole, action, entityType, entityId, payload

---

## 5. Frontend Structure

```
frontend/
  app/
    page.js                      <- redirects to /login
    login/page.js                <- login form (client-side, custom JWT)
    dashboard/page.js            <- summary cards by role
    clients/page.js              <- client management (ADMIN)
    jobs/page.js                 <- job + task management
    creative/page.js             <- creative team task view
    hr/page.js                   <- HR: employees, attendance, leaves
    accounts/page.js             <- invoicing + payments
    leadership/page.js           <- leadership analytics
    approvals/hod/page.js        <- HOD review queue
    notifications/page.js        <- notifications center
    audit/page.js                <- audit logs (ADMIN)
    client-review/[token]/       <- public client approval page
  components/
    AppShell.js                  <- layout wrapper + auth guard (client-side)
    Sidebar.js                   <- role-filtered navigation
    Navbar.js                    <- top bar with notifications + user menu
    ThemeProvider.js             <- wraps lib/theme.js ThemeProvider
  lib/
    api.js                       <- fetch wrapper using NEXT_PUBLIC_API_BASE
    auth.js                      <- localStorage token/user helpers
    theme.js                     <- DARK/LIGHT theme tokens + ThemeProvider
    navigation.js                <- role-based nav config
```

---

## 6. Backend Structure

```
backend/
  src/
    index.js                     <- Express app, all routes mounted, reminder scheduler
    routes/
      auth.js                    <- POST /api/auth/login, /register, /me
      clients.js                 <- CRUD /api/clients
      jobs.js                    <- CRUD /api/jobs, tasks, client review token
      hr.js                      <- /api/hr: employees, attendance, leaves
      creative.js                <- /api/creative: task status + asset upload
      accounts.js                <- /api/accounts: invoices
      notifications.js           <- /api/notifications
      leadership.js              <- /api/leadership: analytics
      auditLogs.js               <- /api/audit-logs
    middleware/
      auth.js                    <- JWT verify middleware
      rbac.js                    <- role check middleware
    prisma/
      schema.prisma              <- full data model
      seed.js                    <- seeds 4 demo users on deploy
    jobs/
      reminderScheduler.js       <- cron job for invoice payment reminders
```

---

## 7. Environment Variables

### Render (backend)
| Key          | Value                                   |
|--------------|-----------------------------------------|
| DATABASE_URL | PostgreSQL connection string from Neon  |
| JWT_SECRET   | thinking-pixel-ims-secret-2026          |
| NODE_ENV     | production                              |
| PORT         | 4000                                    |

### Vercel (frontend)
| Key                  | Value                              |
|----------------------|------------------------------------|
| NEXT_PUBLIC_API_BASE | Render backend URL + /api          |

---

## 8. Deployment Flow

1. Push to `main` on GitHub
2. **Vercel** auto-builds Next.js and deploys the frontend
3. **Render** auto-runs the build command then starts the backend
   - Build: `npm install && npx prisma migrate deploy --schema=src/prisma/schema.prisma && node src/prisma/seed.js`
   - Start: `node src/index.js`

NOTE: Vercel only deploys successfully from verified GitHub commits (pushed by the real account, not bot/API-pushed commits). Bot-pushed commits cause ERROR state on Vercel.

---

## 9. What MCP Is (Claude Code Context)

**MCP = Model Context Protocol** — a standard that lets Claude Code connect to external tools and services via MCP servers running locally.

In this project, the following MCP servers were used during development:

| MCP Server       | What It Did                                                          |
|------------------|----------------------------------------------------------------------|
| Vercel MCP       | Listed deployments, checked build logs, queried project info         |
| Context Mode MCP | Ran file analysis in a sandbox to avoid flooding Claude context      |
| Context7 MCP     | Fetched live library docs (Next.js, Prisma, etc.) during development |

### How Claude used Vercel MCP:
- `list_teams` — found the Vercel team ID
- `list_projects` — found the project ID (prj_usemsDXGuUMFrrN3H36pnf3Y4maw)
- `list_deployments` — identified which deployments were READY vs ERROR
- `get_deployment_build_logs` — read build logs to debug failures

MCP servers are configured in Claude Code settings. They run locally and call external APIs using tokens stored in your environment.

---

## 10. Key Decisions and Gotchas

- No Supabase, no Fly.io — user preference. Using Neon + Render instead.
- No NextAuth — custom JWT stored in localStorage.
- No Tailwind — all styles are inline CSS-in-JS using theme tokens (DARK/LIGHT objects).
- Render free instances spin down after 15 min of inactivity (cold start ~30s on next request).
- Neon free tier: 0.5GB storage, sufficient for this app.
- Render Shell requires a paid plan — all DB operations happen at build time via prisma migrate deploy.
- Bot commit issue: GitHub API-pushed commits are "unverified" and Vercel rejects them for production. Always push from the real HemVaria GitHub account to trigger a successful Vercel deploy.
- The render.yaml in the repo root was NOT picked up automatically — the build command must be manually set in the Render dashboard under Settings.
