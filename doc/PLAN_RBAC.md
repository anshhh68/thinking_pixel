# RBAC Redesign — 13 Roles across 5 Departments

## Context

The custom client needs department-based RBAC. Today the backend `enum Role`
(`backend/src/prisma/schema.prisma:10`) only has **4 values** — `CLIENT, STAFF, HOD,
ADMIN` — and every route guard hard-codes `requireRole("STAFF","HOD","ADMIN")`.
The granular roles in `frontend/components/Sidebar.js` (`CREATIVE_DIRECTOR`, etc.) are
**dead code** — the DB can never store them, so everyone is really just STAFF/HOD/ADMIN.

This plan introduces 13 real functional roles + `ADMIN` (superuser) + `CLIENT`
(external) = **15 enum values**, grouped into 5 departments, with **per-role custom
permissions** driven by a single shared config (capabilities + sidebar tabs).

## Departments & Roles (13)

| Department | Roles |
|---|---|
| **Account & Finance** (1) | `FINANCE_MANAGER` |
| **Account Management** (3) | `ACCOUNT_DIRECTOR`, `ACCOUNT_MANAGER`, `ACCOUNT_EXECUTIVE` |
| **Content & Strategy** (2) | `STRATEGY_HEAD`, `CONTENT_STRATEGIST` |
| **Creative** (6) | `CREATIVE_DIRECTOR`, `ART_DIRECTOR`, `SENIOR_GRAPHIC_DESIGNER`, `GRAPHIC_DESIGNER`, `JUNIOR_GRAPHIC_DESIGNER`, `ILLUSTRATOR` |
| **Motion Graphics / Video Editing** (1) | `VIDEO_EDITOR` |

Plus system roles: `ADMIN` (full access), `CLIENT` (external review page only).

## Per-Role Permission Matrix

Sidebar tabs: `dashboard, clients, jobs, creative, hr, accounts, notifications,
leadership, approvals, audit, chat, jobsheet`.
Capabilities: `manageClients, deleteClients, manageJobs, approveTasks, uploadCreative,
manageFolders, manageInvoices, recordPayments, viewFinance, manageHR, viewLeadership,
viewAudit, createChatChannel, viewTeamWorkload`.

| Role | Sidebar Tabs | Capabilities |
|---|---|---|
| `ADMIN` | all 12 | all |
| `FINANCE_MANAGER` | dashboard, accounts, clients, jobs, audit, notifications, chat | manageInvoices, recordPayments, viewFinance, viewAudit |
| `ACCOUNT_DIRECTOR` | dashboard, clients, jobs, accounts, leadership, approvals, notifications, chat, jobsheet | manageClients, manageJobs, approveTasks, viewFinance, viewLeadership, viewTeamWorkload, createChatChannel |
| `ACCOUNT_MANAGER` | dashboard, clients, jobs, accounts, notifications, chat, jobsheet | manageClients, manageJobs, viewFinance |
| `ACCOUNT_EXECUTIVE` | dashboard, clients, jobs, notifications, chat | manageJobs |
| `STRATEGY_HEAD` | dashboard, clients, jobs, creative, leadership, approvals, notifications, chat, jobsheet | manageJobs, approveTasks, viewLeadership, createChatChannel |
| `CONTENT_STRATEGIST` | dashboard, clients, jobs, creative, notifications, chat | manageJobs, uploadCreative |
| `CREATIVE_DIRECTOR` | dashboard, jobs, creative, approvals, leadership, notifications, chat, jobsheet | approveTasks, manageFolders, uploadCreative, viewTeamWorkload, createChatChannel |
| `ART_DIRECTOR` | dashboard, jobs, creative, approvals, notifications, chat, jobsheet | approveTasks, manageFolders, uploadCreative |
| `SENIOR_GRAPHIC_DESIGNER` | dashboard, jobs, creative, notifications, chat | uploadCreative, manageFolders |
| `GRAPHIC_DESIGNER` | dashboard, jobs, creative, notifications, chat | uploadCreative |
| `JUNIOR_GRAPHIC_DESIGNER` | dashboard, jobs, creative, notifications, chat | uploadCreative |
| `ILLUSTRATOR` | dashboard, jobs, creative, notifications, chat | uploadCreative |
| `VIDEO_EDITOR` | dashboard, jobs, creative, notifications, chat | uploadCreative |
| `CLIENT` | (none — external `/client-review` only) | — |

> Tabs/caps are starting recommendations — adjust freely before implementation.

## Architecture — single source of truth

Replace scattered hard-coded role lists with one shared config on each side.

### Backend
1. **`schema.prisma`** — expand `enum Role` to the 15 values above.
2. **New `backend/src/config/permissions.js`** — `ROLE_CAPS = { ROLE: [caps] }`,
   `DEPARTMENTS = { dept: [roles] }`, helper `hasCap(role, cap)`.
3. **`backend/src/middleware/auth.js`** — add `requireCap(cap)` middleware next to
   the existing `requireRole`.
4. **Route guards** — replace `requireRole("STAFF","HOD","ADMIN")` across
   `routes/*.js` with `requireCap(...)` (e.g. invoices → `requireCap("manageInvoices")`,
   approvals → `requireCap("approveTasks")`, folders → `requireCap("manageFolders")`,
   audit → `requireCap("viewAudit")`, delete-client → `requireCap("deleteClients")`).
5. **Data migration** — existing rows hold `STAFF/HOD/ADMIN`. Since this is a fresh
   custom-client deploy, simplest is to re-seed users with new roles. If preserving
   data: map `ADMIN→ADMIN`, `HOD→` department head, `STAFF→` a sensible default per
   employee. `prisma db push` already runs via `postinstall`.

### Frontend
6. **New `frontend/lib/permissions.js`** — `ROLE_TABS = { ROLE: [tabIds] }`,
   `ROLE_CAPS`, `DEPARTMENTS`, helpers `canSee(role, tab)` / `hasCap(role, cap)`.
   This becomes the one place permissions are defined.
7. **`Sidebar.js`** — replace `ROLE_NAV` with derivation from `ROLE_TABS`.
8. **`AppShell.js`** — replace `ROLE_PATHS` with derivation from `ROLE_TABS`
   (route-level access guard).
9. **`Navbar.js`** — "Create" menu items gated via `hasCap` (e.g. New Invoice needs
   `manageInvoices`, New Client needs `manageClients`).
10. **HR employee form** (`frontend/app/hr/page.js`) — role dropdown lists the 13
    roles grouped by department using `DEPARTMENTS`.
11. Page-level action buttons (approve, delete, upload) gated via `hasCap`.

## Verification

1. `cd backend && node_modules/.bin/prisma validate --schema src/prisma/schema.prisma`
   — schema valid.
2. `cd frontend && npm run build` — builds clean.
3. Seed one user per role; log in as each and confirm sidebar tabs + route access
   match the matrix; confirm 403s on disallowed API actions (e.g. `GRAPHIC_DESIGNER`
   cannot POST an invoice).
4. Confirm `CLIENT` still reaches only `/client-review` and `ADMIN` sees everything.
5. Commit + push to **both** remotes (`ims` for Render, `origin` for Vercel).

---

## Progress — PAUSED 2026-05-16

Nothing committed or pushed. All changes are local and uncommitted. The backend
is in a **consistent, working state** — `creative.js` is untouched and still uses
`requireRole` (which still exists in `auth.js`), so the app runs fine as-is.

### DONE
- `backend/src/prisma/schema.prisma` — `enum Role` expanded to 17 values
  (CLIENT, STAFF, HOD, ADMIN kept as legacy + 13 new department roles).
- `backend/src/config/permissions.js` — NEW. `CAPS`, `DEPARTMENTS`, `ROLE_CAPS`,
  `hasCap()`. Universal caps `viewJobsheet` + `updateTaskStatus` auto-granted to
  every non-CLIENT role.
- `backend/src/middleware/auth.js` — added `requireCap(cap)` middleware
  (alongside existing `requireRole`).
- Route guards converted `requireRole` → `requireCap` in **9 of 10** route files:
  `accounts.js`, `auditLogs.js`, `clients.js`, `leadership.js`, `notifications.js`,
  `chat.js`, `hr.js`, `jobsheet.js`, `jobs.js`. Also updated `hr.js` leave-request
  filter and `jobsheet.js` own-tasks filter to use `hasCap`.

### LEFT TO DO
1. **`backend/src/routes/creative.js`** — not started. Convert:
   - import → add `requireCap` (keep `requireRole` for the ADMIN-only delete)
     and `const { hasCap } = require("../config/permissions");`
   - `POST/PATCH /folders` → `requireCap("manageFolders")`
   - `DELETE /folders/:id` → keep `requireRole("ADMIN")`
   - both upload routes (`requireRole("STAFF","HOD","ADMIN")`) → `requireCap("uploadCreative")`
   - `PATCH /versions/:id`, `DELETE /versions/:id` → `requireCap("manageFolders")`
   - `/drive` handler: replace `isStaff` (`req.user.role === "STAFF"`) with a
     cap-based `restricted = !hasCap(req.user.role, "approveTasks")`.
2. **`frontend/lib/permissions.js`** — NEW. `ROLE_TABS`, `ROLE_CAPS`, `DEPARTMENTS`,
   helpers `canSee(role,tab)` / `hasCap(role,cap)`.
3. **`frontend/components/Sidebar.js`** — replace `ROLE_NAV` with `ROLE_TABS` derivation.
4. **`frontend/components/AppShell.js`** — replace `ROLE_PATHS` with `ROLE_TABS` derivation.
5. **`frontend/components/Navbar.js`** — gate "Create" menu items via `hasCap`.
6. **`frontend/app/hr/page.js`** — role dropdown grouped by `DEPARTMENTS`.
7. Decide user migration (re-seed vs map existing STAFF/HOD accounts).
8. Validate schema, `npm run build`, commit, push to `ims` + `origin`.
