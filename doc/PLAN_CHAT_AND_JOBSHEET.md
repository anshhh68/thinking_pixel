# Implementation Plan — Chat (Client Channels) + Job Sheet

Author: planner agent. Target: Sonnet executors. Stack: Next.js 15 (App Router, JS, no Tailwind), Express + Prisma v5, PostgreSQL (Neon), JWT in localStorage (`tp_token`, `tp_user`), Render free tier (polling, no WebSockets).

Project conventions observed:
- Prisma schema: `backend/src/prisma/schema.prisma`
- Routes: `backend/src/routes/*.js`, mounted in `backend/src/index.js` under `/api/*`
- Middleware: `authGuard`, `requireRole(...roles)` from `backend/src/middleware/auth.js`
- Audit helper: `logAudit({ actorId, actorRole, action, entityType, entityId, payload })` from `../utils/audit`
- Pagination helpers: `getPagination`, `paginatedResponse` from `../utils/pagination`
- Frontend pages: `frontend/app/<section>/page.js` (JS, not TSX)
- Sidebar: `frontend/components/Sidebar.js` — extend `ALL_NAV` + add entry to each role array in `ROLE_NAV`
- Theme: `useTheme()` from `frontend/lib/theme` → `const { t } = useTheme()` for tokens (`t.accent`, `t.border`, `t.text1/2/3`, `t.sidebarBg`, etc.)
- Auth helpers (frontend): `getStoredUser()`, `getToken()` from `frontend/lib/auth`. API base usually `process.env.NEXT_PUBLIC_API_URL`.

Roles in production: ADMIN, HOD, STAFF, CLIENT plus extended roles (CREATIVE_DIRECTOR, SENIOR_GRAPHIC_DESIGNER, GRAPHIC_DESIGNER, MOTION_VIDEO_EDITOR, CONTENT_STRATEGIST, ACCOUNT_MANAGER, ACCOUNT_EXECUTIVE, ACCOUNTANT_FINANCE, COMPLIANCE_OFFICER, HR_MANAGER). When this plan says "internal staff" it means: every role except CLIENT.

---

## FEATURE 1 — Chat (Client Channels)

### 1.1 Prisma schema additions

Append to `backend/src/prisma/schema.prisma`:

```prisma
model ChatChannel {
  id        String        @id @default(uuid())
  clientId  String        @unique  // one channel per client
  name      String                  // mirrors client.name at creation; can be updated
  isArchived Boolean      @default(false)
  client    Client        @relation(fields: [clientId], references: [id], onDelete: Cascade)
  messages  ChatMessage[]
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  @@index([clientId])
}

model ChatMessage {
  id         String      @id @default(uuid())
  channelId  String
  senderId   String       // User.id of sender (must be internal staff, never CLIENT)
  senderName String       // denormalized at write-time so deleted users still display
  senderRole String       // denormalized role string at write-time
  body       String       @db.Text
  createdAt  DateTime    @default(now())
  channel    ChatChannel @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@index([channelId, createdAt])
}
```

Also add the back-relation on `Client`:

```prisma
model Client {
  // existing fields…
  chatChannel ChatChannel?
}
```

Migration command: `npx prisma migrate dev --name chat_channels` (run from `backend/`).

### 1.2 Backend — auto-create channel on client creation

Edit `backend/src/routes/clients.js`, inside the existing `POST /` handler, after `prisma.client.create(...)` succeeds and before `logAudit`:

```js
await prisma.chatChannel.create({
  data: { clientId: created.id, name: created.name },
});
```

Backfill: in same file add a one-off idempotent check OR create a script `backend/src/scripts/backfillChatChannels.js` that loops existing clients and `upsert`s a channel. Document in README; not auto-run.

### 1.3 Backend — new route file `backend/src/routes/chat.js`

Mount in `backend/src/index.js`:

```js
const chatRoutes = require("./routes/chat");
app.use("/api/chat", chatRoutes);
```

Routes (all behind `authGuard`; CLIENT role is rejected at route level via `requireRole(...STAFF_ROLES)` helper — define `STAFF_ROLES` constant = every role except `"CLIENT"`):

| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/api/chat/channels` | any internal staff | `[{ id, clientId, name, lastMessage:{body,createdAt,senderName}\|null, unreadCount?: 0 (stubbed for now) }]`, ordered by latest message desc |
| GET | `/api/chat/channels/:id/messages` | any internal staff | `{ items, total, page, pageSize }` — paginated, default pageSize 50, `?since=<ISO>` returns messages with `createdAt > since` (used by polling) |
| POST | `/api/chat/channels/:id/messages` | any internal staff | `201 { message }`. Body: `{ body: string }`. Validate non-empty, max 4000 chars. Denormalize `senderName`, `senderRole` from `req.user`. Update `channel.updatedAt`. Emit `logAudit({ action: "CHAT_MESSAGE_SENT", entityType: "ChatChannel", entityId: channelId, payload:{messageId} })`. |
| PATCH | `/api/chat/channels/:id` | ADMIN, HOD | rename/archive channel |

Notes:
- No edit/delete on messages in v1 (keeps audit story simple).
- Polling endpoint: clients should call `GET /messages?since=<lastSeenISO>` every 5s on the open channel. Server returns only new rows (cheap). Include `serverTime` in response so client can pass it back as the next `since`.
- For the channel list, run a single query: `prisma.chatChannel.findMany({ include: { messages: { orderBy:{createdAt:"desc"}, take:1 } }, orderBy:{ updatedAt: "desc" } })`.

### 1.4 RBAC

- Internal staff (every role except CLIENT) can read all channels and post in any channel. Keep simple for prototype.
- CLIENT role: blocked entirely at the route layer; not added to sidebar.
- Future tightening (NOT in v1): restrict STAFF to channels for clients whose Jobs have a Task assigned to them. Leave a `// TODO scope-by-assignment` comment.

### 1.5 Frontend pages

Create `frontend/app/chat/page.js` (client component, `"use client"`).

Layout (two-pane, full height under Navbar):

```
┌──────────────────┬────────────────────────────────┐
│ Channel list     │ Channel header (client name)   │
│ (search input)   ├────────────────────────────────┤
│ ─ client A   •2  │ Messages scroll area           │
│ ─ client B       │  [bubble: sender (role) • ts]  │
│ ─ client C       │  [bubble …]                    │
│                  ├────────────────────────────────┤
│                  │ Composer: textarea + Send btn  │
└──────────────────┴────────────────────────────────┘
```

State (React hooks, no external store):

```js
const [channels, setChannels] = useState([]);
const [activeId, setActiveId] = useState(null);
const [messages, setMessages] = useState([]);
const [lastSince, setLastSince] = useState(null);   // ISO string
const [draft, setDraft] = useState("");
const [search, setSearch] = useState("");
const [loading, setLoading] = useState(false);
```

Data flow:
1. On mount: `fetch /api/chat/channels` → set channels. Pick first as active if none selected.
2. On `activeId` change: `fetch /api/chat/channels/:id/messages` (no `since`) → replace messages, set `lastSince` to `serverTime`.
3. Polling: `useEffect` with `setInterval(5000)` keyed on `activeId`. Each tick: `fetch /messages?since=${lastSince}`. Append new items, update `lastSince`. Clear interval on unmount or activeId change.
4. Send: POST `/messages`, then optimistic append + replace temp id when response returns; update channel list `lastMessage` locally.
5. Auto-scroll to bottom on new messages unless user has scrolled up (track `isAtBottom` ref).

Styling: pure inline styles using `useTheme()` tokens. Bubble alignment by `senderId === currentUser.id` (right side, `t.accent` background; left side `t.cardBg`). Show sender name + role badge above bubble for others. Timestamp in `text3`.

Components (all colocated in the same `page.js` for simplicity, matching existing pages style; extract into `frontend/components/chat/` only if it exceeds ~400 lines):
- `ChannelList` — search filter, scrollable list.
- `MessageList` — virtualization not needed (paginated by 50); load-more button at top fetches older with `?before=<id>`.
- `Composer` — textarea, Enter sends, Shift+Enter newline, disabled while sending.

### 1.6 Navigation + RBAC wiring

In `frontend/components/Sidebar.js`:

1. Add to `ALL_NAV`: `{ id: "chat", href: "/chat", label: "Chat", icon: "◌" }`.
2. Add `"chat"` to every role array in `ROLE_NAV` EXCEPT `CLIENT`. Specifically: ADMIN, HOD, CREATIVE_DIRECTOR, SENIOR_GRAPHIC_DESIGNER, GRAPHIC_DESIGNER, MOTION_VIDEO_EDITOR, CONTENT_STRATEGIST, ACCOUNT_MANAGER, ACCOUNT_EXECUTIVE, ACCOUNTANT_FINANCE, COMPLIANCE_OFFICER, HR_MANAGER, STAFF.

### 1.7 Gotchas

- **Render cold starts**: first poll after idle may take 30s. Show a small "reconnecting…" hint if a poll takes >7s.
- **Polling cost on Neon free tier**: with 10 staff open on chat, 5s polling = 120 req/min. Index `(channelId, createdAt)` (already declared) is essential. The `since` filter keeps payloads tiny.
- **Tab visibility**: pause polling when `document.hidden`. Resume immediately on `visibilitychange` and do one catch-up fetch.
- **JSON limit**: existing `express.json({ limit: "10mb" })` is fine; cap message body at 4000 chars server-side.
- **Audit log volume**: chat messages will dominate `AuditLog`. Consider gating `logAudit` for chat behind an env flag `AUDIT_CHAT=true` (default false) — note in PR.
- **Race on send**: if user spams Enter, debounce or disable button until previous POST resolves.
- **Channel auto-create idempotency**: wrap chat-channel create in `try { ... } catch (e) { if (e.code !== "P2002") throw e }` so duplicate clients (re-running tests) don't break.
- **Backfill**: existing clients have no channel until backfill script runs. Either run script in deploy hook or lazy-create channel on first GET of a client.

---

## FEATURE 2 — Job Sheet (Staff Task Tracker)

### 2.1 Prisma schema changes — UPDATED from actual sheet design

The real sheet (provided by user) has these columns:
**Date | Client | Job Title | Quantity | Assigned To | Deadline | Copy Status | Priority | Brief | Size**

Most map to existing fields, but 4 are new and must be added to the `Task` model:

```prisma
model Task {
  // existing fields stay unchanged …
  quantity    Int?     // e.g. "2 reels", "1 leaflet"
  copyStatus  String?  // key tracking field (highlighted yellow in sheet) — free-form e.g. "Done", "WIP", "Pending"
  brief       String?  // short note e.g. "1st & 3rd", "flea market", "A4 size"
  size        String?  // physical/digital size spec e.g. "A4", "1080x1920"
}
```

Migration: `npx prisma migrate dev --name task_jobsheet_fields`

Column mapping:
| Sheet column  | Source                        |
|---------------|-------------------------------|
| Date          | Task.dueDate (or selected date filter) |
| Client        | Job → Client.name             |
| Job Title     | Job.title                     |
| Quantity      | Task.quantity (NEW)           |
| Assigned To   | Task.assignedTo               |
| Deadline      | Task.dueDate                  |
| Copy Status   | Task.copyStatus (NEW) — yellow highlighted, primary tracking field |
| Priority      | Job.priority                  |
| Brief         | Task.brief (NEW)              |
| Size          | Task.size (NEW)               |

Visual behaviour from sheet:
- Rows grouped by staff member with alternating green/white row-group background
- Red separator row between different dates
- "Copy Status" cell editable inline (click to edit, ENTER to save) via PATCH /jobs/tasks/:id/status equivalent

### 2.2 Backend — new endpoint

Create `backend/src/routes/jobsheet.js` (cleaner than overloading `/leadership`), mount as `app.use("/api/jobsheet", jobsheetRoutes)`.

| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/api/jobsheet` | `requireRole("ADMIN","HOD","CREATIVE_DIRECTOR","ACCOUNT_MANAGER","HR_MANAGER")` | snapshot object (see below) |

Query params:
- `date=YYYY-MM-DD` (defaults to today, server timezone)
- `staffId=<userId>` optional filter
- `jobId=<jobId>` optional filter
- `department=<string>` optional filter (matches `Employee.department`)

Response shape:

```json
{
  "date": "2026-05-12",
  "rows": [
    {
      "userId": "u1",
      "name": "Asha",
      "role": "GRAPHIC_DESIGNER",
      "department": "Creative",
      "tasks": [
        {
          "taskId": "t1",
          "description": "Hero banner v2",
          "status": "IN_PROGRESS",
          "dueDate": "2026-05-12T00:00:00Z",
          "readyForReview": false,
          "job": { "id": "j1", "title": "Spring campaign", "clientName": "Acme" }
        }
      ],
      "counts": { "total": 3, "todo": 1, "inProgress": 1, "review": 1, "done": 0 }
    }
  ],
  "summary": { "staffCount": 8, "taskCount": 22, "byStatus": { "TODO": 5, "IN_PROGRESS": 9, "REVIEW": 6, "DONE": 2 } }
}
```

Server implementation outline:
1. Compute date window: `start = startOfDay(date)`, `end = endOfDay(date)`.
2. Fetch tasks: `prisma.task.findMany({ where: { AND:[ { status:{ notIn:["DONE","CANCELLED"] } }, { OR:[ { dueDate:{ gte:start, lte:end } }, { createdAt:{ lte:end } } ] }, jobId?, assignedTo? ] }, include:{ job:{ include:{ client:true } } } })`.
3. Group by `assignedTo` (which is a User.id string). Skip tasks with no assignee but include them in a synthetic "Unassigned" row at the bottom.
4. Load `User` + `Employee` for all assignee ids in one `findMany`.
5. Build rows, sort by department then name.
6. Compute `summary` totals.

### 2.3 Frontend page

Create `frontend/app/jobsheet/page.js` (client component).

Layout:

```
Header: "Job Sheet" + date picker [<] [May 12, 2026] [>]  + filters (Staff dropdown, Job dropdown, Dept dropdown)  + summary chips (8 staff · 22 tasks · 9 in progress)

Table:
| Staff (role)            | Task                                | Job → Client       | Status      | Due   |
| Asha (Designer)         | Hero banner v2                      | Spring → Acme      | In Progress | Today |
|                         | Email header                        | Spring → Acme      | Review      | Today |
| Bilal (Senior Designer) | Logo refinement                     | Rebrand → Globex   | Todo        | —     |
| (Unassigned)            | Storyboard frame 3                  | Promo → Initech    | Review      | Today |
```

- Rows for staff merged vertically: first column row-spans across their tasks (use a flat table with the staff cell using `rowSpan` on the first task row, blank on subsequent — simplest within plain HTML table; avoid React-table libs per "no external UI libs").
- Status column rendered as colored pill using theme tokens (`t.accentSoft`, `t.amber`, etc.).
- Empty state: "No active tasks for this date."
- Loading skeleton: grey rows.

State:

```js
const [date, setDate] = useState(todayISO());
const [staffId, setStaffId] = useState("");
const [jobId, setJobId] = useState("");
const [department, setDepartment] = useState("");
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
```

Effects: refetch on any filter change (debounced 200ms). Use `?date=...&staffId=...&jobId=...`. Persist last-used filters in `localStorage` under `tp_jobsheet_filters` for convenience.

Dropdown data:
- Staff dropdown: GET `/api/leadership/staff` if it exists; otherwise add a tiny new endpoint `/api/hr/staff-list` returning `[{id,name,role,department}]` for ADMIN/HOD.
- Job dropdown: GET `/api/jobs?paginated=false&status=OPEN` (existing pagination support).

Export: add a "Copy as CSV" button (client-side stringify) — useful when the user gets their actual sheet design later; easy to swap layout while keeping the data API stable.

### 2.4 Navigation + RBAC wiring

`frontend/components/Sidebar.js`:
1. Add to `ALL_NAV`: `{ id: "jobsheet", href: "/jobsheet", label: "Job Sheet", icon: "◰" }`.
2. Add `"jobsheet"` to `ROLE_NAV` for: `ADMIN`, `HOD`, `CREATIVE_DIRECTOR`, `ACCOUNT_MANAGER`, `HR_MANAGER`. (Matches backend `requireRole` list. Strictly per the user's brief "ADMIN + HOD only" you can narrow this to those two; recommended scope above is a friendlier superset matching how leadership-tier roles are already treated elsewhere — confirm with user before merging.)

### 2.5 Gotchas

- **Timezone**: server uses UTC by default. Always send `date` as `YYYY-MM-DD`, convert to start/end of day in **server local tz** (`new Date(date+"T00:00:00")`). Document this; will look weird otherwise for IST team.
- **"Active today" definition**: in v1 a task counts as "today" if `(dueDate within day) OR (createdAt <= end_of_day AND status not in DONE/CANCELLED)`. This means a still-open week-old task with no due date appears every day until closed — desirable for a "what are people working on" view. Document on the page.
- **Tasks with no assignee**: render in an "Unassigned" row at bottom; HOD can use the page to spot orphans.
- **Performance**: with hundreds of tasks the single query is fine; add `@@index([assignedTo, status])` on `Task` if you anticipate growth (NOT required for prototype).
- **Layout flexibility**: keep the data API (`/api/jobsheet`) stable. When the user provides their real sheet design later, only `page.js` needs to be re-skinned — the shape already exposes rows/tasks/job/client/status/due.
- **No realtime needed**: this is a snapshot view; do NOT add polling. Add a manual "Refresh" button.

---

## Execution order (suggested)

1. `prisma/schema.prisma` → add ChatChannel/ChatMessage + Client back-relation → `migrate dev`.
2. `routes/chat.js` + mount in `index.js`.
3. Patch `routes/clients.js` POST to auto-create channel; write `scripts/backfillChatChannels.js`; run once.
4. Add `frontend/app/chat/page.js`; wire Sidebar.
5. `routes/jobsheet.js` + mount.
6. Add `frontend/app/jobsheet/page.js`; wire Sidebar.
7. Smoke test as ADMIN, HOD, STAFF, CLIENT (last must be 403 / no nav).
