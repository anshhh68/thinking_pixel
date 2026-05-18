# Thinking Pixel IMS — Design Plan

Two production features: (1) Indian GST on invoices, (2) Real-time bell notifications.

---

# TASK 1: Indian GST Integration

## 1.1 Decisions (opinionated)

- **Store, don't recompute.** Tax snapshots must be immutable per invoice. GST rates change, GSTIN of buyer can change, and audit/PDF must reproduce exactly what was issued. Compute once on create/edit, persist every field, never recalc on read.
- **Line-item model.** A single `amount` field is wrong for production. Real invoices have multiple SAC lines (e.g., "Social Media Mgmt 18%", "Print Design 18%", reimbursable expenses 0%). Add `InvoiceLineItem`.
- **Place of supply drives CGST/SGST vs IGST.** Compare seller state (org config) to buyer state (client GSTIN first 2 digits = state code, fallback to client address state).
- **Money in paise (Int), not Float.** `Float` causes rounding drift on tax. Migrate `amount` and all monetary fields to `Int` paise. Format at the edge.

## 1.2 Schema changes (Prisma)

New `OrgSettings` singleton (seller side):
```prisma
model OrgSettings {
  id           String @id @default(uuid())
  legalName    String
  gstin        String   // 15 char, validated
  stateCode    String   // "27" for MH, "29" for KA, etc.
  address      String
  pan          String?
  bankName     String?
  bankAccount  String?
  bankIfsc     String?
  defaultSac   String   @default("998361")
  invoicePrefix String  @default("TP")
}
```

Extend `Client`:
```prisma
gstin       String?
stateCode   String?    // derived from gstin[0..2] or address
isB2B       Boolean  @default(false)
billingAddress String?
```

Replace `Invoice.amount` with computed totals + add fields:
```prisma
model Invoice {
  id              String @id @default(uuid())
  invoiceNumber   String @unique
  jobId           String
  clientId        String
  // snapshot of seller + buyer at issue time
  sellerGstin     String
  sellerStateCode String
  sellerSnapshot  Json     // legalName, address, bank info
  buyerGstin      String?
  buyerStateCode  String?
  buyerSnapshot   Json     // name, billing address
  placeOfSupply   String   // state code
  supplyType      String   // "INTRA" | "INTER" | "EXPORT"
  // totals (paise, Int)
  subtotal        Int      // sum of taxable amounts
  cgstTotal       Int      @default(0)
  sgstTotal       Int      @default(0)
  igstTotal       Int      @default(0)
  cessTotal       Int      @default(0)
  roundOff        Int      @default(0)
  grandTotal      Int
  amountPaid      Int      @default(0)
  // existing
  dueDate         DateTime
  status          String   @default("PENDING")  // PENDING|PARTIAL|PAID|OVERDUE|CANCELLED
  notes           String?
  remindersSent   Int      @default(0)
  lastReminderAt  DateTime?
  issuedAt        DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  lineItems       InvoiceLineItem[]
  job             Job @relation(...)
  client          Client @relation(...)
}

model InvoiceLineItem {
  id            String  @id @default(uuid())
  invoiceId     String
  description   String
  sacCode       String   // default 998361
  quantity      Float    @default(1)
  unitPrice     Int      // paise, pre-tax
  discount      Int      @default(0) // paise
  taxableValue  Int      // (qty * unitPrice) - discount
  gstRate       Float    // 0|5|12|18|28
  cgst          Int
  sgst          Int
  igst          Int
  cess          Int      @default(0)
  lineTotal     Int      // taxableValue + taxes
  sortOrder     Int      @default(0)
  invoice       Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  @@index([invoiceId])
}
```

Migration: keep old `amount` for one release as `legacyAmount`, backfill `subtotal/grandTotal = round(legacyAmount*100)`, drop in next migration.

## 1.3 Backend (Express)

New file `backend/src/services/gstCalculator.js` — pure functions:
- `computeLine({ qty, unitPrice, discount, gstRate, supplyType })` → `{ taxableValue, cgst, sgst, igst, lineTotal }`
- `determineSupplyType(sellerStateCode, buyerStateCode, exportFlag)` → `"INTRA" | "INTER" | "EXPORT"`
- `validateGstin(gstin)` → regex `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` + checksum
- `bankerRound(paise)` for round-off

Rules:
- INTRA → cgst = sgst = round(taxable * rate/2 / 100); igst = 0
- INTER → igst = round(taxable * rate / 100); cgst = sgst = 0
- EXPORT → all zero, mark "LUT" or "with payment of IGST" (config flag)
- Always round **per line**, not on totals — matches GSTR-1 filing.

Endpoints in `backend/src/routes/accounts.js` (or new `invoices.js`):
- `POST /api/invoices` — body `{ jobId, clientId, dueDate, lineItems[], notes }`. Server snapshots seller from `OrgSettings`, buyer from `Client`, computes totals, persists.
- `PUT /api/invoices/:id` — only if status === PENDING and no payments; otherwise force "credit note" flow (out of scope v1, but block edit).
- `GET /api/invoices/:id` — returns full line items + snapshots (no recompute).
- `GET /api/invoices/:id/pdf` — server-rendered HTML→PDF via `puppeteer-core` + `@sparticuz/chromium` OR simpler: return print-friendly HTML, browser prints. Recommend the HTML route for Render free tier.
- `POST /api/invoices/:id/payment` — Int paise, update status (PARTIAL if `amountPaid < grandTotal`, PAID if equal, never overpay).
- `GET /api/reports/gstr1?month=YYYY-MM` — aggregates by SAC + rate for filing.

Validation middleware: zod schema rejects invoice if `isB2B && !buyerGstin`, or if `supplyType` mismatches state codes.

## 1.4 Frontend

`/accounts/invoices/new` — multi-line builder:
- Header: Job picker (auto-fills client), Client GSTIN (read-only from client; "Edit client" link), Place of Supply dropdown (auto from GSTIN, override allowed), Invoice date, Due date.
- Line items table: Description, SAC (default 998361), Qty, Unit Price (₹), Discount, GST%, then **live computed** Taxable / CGST / SGST / IGST / Line Total columns. Add/Remove row.
- Footer panel (sticky right): Subtotal, CGST total, SGST total, IGST total, Round-off, **Grand Total** big bold, "Amount in words" (Indian numbering — `lakh`, `crore`).
- "Preview" → opens `/accounts/invoices/[id]/view` which is the print-ready template.

`/accounts/invoices/[id]/view` — GST-compliant template:
- Top: "TAX INVOICE" centered, invoice number, date, place of supply.
- Two columns: Seller (name, address, GSTIN, PAN, state+code) | Buyer ("Bill To" with GSTIN, address, state+code).
- Line items table with columns: #, Description, SAC, Qty, Rate, Taxable, CGST(rate+amt) OR SGST OR IGST depending on supply type.
- Totals block bottom-right; bank details + signature block bottom-left.
- Print CSS `@media print` to hide nav.

Inline-style components (no Tailwind) live in `frontend/components/invoice/`:
- `InvoiceLineRow.jsx`, `InvoiceTotalsPanel.jsx`, `GstinInput.jsx` (with validation chip), `InvoicePrintView.jsx`.

## 1.5 Store vs compute

| Field | Store | Compute |
|---|---|---|
| Per-line cgst/sgst/igst | ✅ store | — |
| Totals (subtotal, grandTotal) | ✅ store | — |
| Seller/Buyer GSTIN/address | ✅ snapshot JSON | — |
| Supply type | ✅ store | — |
| Status (PAID/PARTIAL/OVERDUE) | store base + derive OVERDUE | OVERDUE = `dueDate < now() && status != PAID` (computed in serializer) |
| Amount in words | — | compute at render |
| GSTR-1 report | — | aggregate query |

---

# TASK 2: Real-time Bell Notifications

## 2.1 Schema changes

Minimal. Add to `Notification`:
```prisma
link        String?     // e.g., "/jobs/abc-123" — where click navigates
icon        String?     // optional emoji/key for UI
readAt      DateTime?   // keep isRead too for fast filter; readAt for analytics
```
Index for hot path:
```prisma
@@index([userId, isRead, createdAt])
@@index([audienceRole, isRead, createdAt])
```

## 2.2 Backend endpoints

New routes in `backend/src/routes/notifications.js`:

- `GET /api/notifications/unread-count` — returns `{ count, latestId }`. Cheap. This is what polls every 10s.
  - Query: `WHERE (userId=:me OR audienceRole IN (me.role,'ALL')) AND isRead=false`.
- `GET /api/notifications/recent?limit=10` — last 10 (read + unread, unread first then by createdAt desc). Used when popup opens.
- `GET /api/notifications?page=&pageSize=` — full page list (already exists, keep).
- `PATCH /api/notifications/:id/read` — mark single read.
- `PATCH /api/notifications/read-all` — mark all unread for user as read.
- `POST /api/notifications` (internal helper, not exposed) — used by job/chat/invoice services.

**Performance:** unread-count endpoint must be O(index) — use composite index above. Cache nothing (Postgres count over indexed bool is fast enough for the user count this app has).

**Polling key trick:** include `If-None-Match`-style header. Server returns `ETag: <latestId>-<count>`; client sends `If-None-Match`, server returns 304 if unchanged. Cuts response payload to ~0 bytes on idle.

## 2.3 Frontend architecture

**State location: React Context** — `NotificationContext` at app root (`frontend/app/providers.jsx`). Reasons:
- Bell lives in Navbar; full page at `/notifications` also reads same data → context dedupes polling.
- Single poll loop, not one per consumer.

File layout:
- `frontend/contexts/NotificationContext.jsx` — provider, polls `unread-count` every **10s** (not 5; see conflict section), exposes `{ unreadCount, recent, refresh(), markRead(id), markAllRead() }`.
- `frontend/components/notifications/NotificationBell.jsx` — bell icon + red badge (hidden if 0, shows "9+" if >9). On click toggles popup.
- `frontend/components/notifications/NotificationPopup.jsx` — absolute-positioned dropdown anchored to bell, 360px wide, max-height 480px, scrollable. Header "Notifications" + "Mark all read" button. Body: list of 10. Footer: "View all" → `/notifications`.
- `frontend/components/notifications/NotificationItem.jsx` — icon, title (bold if unread), message (1 line truncated), `timeAgo(createdAt)`, blue unread dot. Click → `markRead(id)` then `router.push(link)`.

**Popup positioning (no Tailwind):**
```js
// in NotificationBell
const [open, setOpen] = useState(false);
const ref = useRef(null);
// click-outside via useEffect on document mousedown
// popup style: { position:'absolute', top:'48px', right:0, zIndex:1000,
//   background:'#fff', border:'1px solid #e5e7eb', borderRadius:12,
//   boxShadow:'0 10px 30px rgba(0,0,0,0.12)', width:360 }
```
Wrap bell in `position:relative` container so popup anchors correctly.

**Auto-appear without refresh:** poll loop calls `unread-count`. If `count > prevCount` OR `latestId !== prevLatestId`, fetch `recent` and update state. Popup re-renders automatically. Optional: subtle bell shake animation on increment.

**Optimistic mark-as-read:** decrement count locally before request resolves; rollback on error.

## 2.4 Polling conflict with chat

Current: chat polls every 5s. Adding another 5s timer doubles request rate and causes thundering herd on Render free tier.

Solution — **single shared poll scheduler**:
- Create `frontend/lib/pollScheduler.js`: a module-level `setInterval` at 5s. Consumers `register(key, intervalMs, fn)`.
- Notifications registers at 10s (every other tick).
- Chat registers at 5s (every tick).
- Both fire from the same `setInterval`, so the tab makes coordinated requests, and `visibilitychange` can pause both at once (huge battery win when tab hidden).
- When `document.hidden`, scheduler pauses entirely; on `visibilitychange→visible`, immediately runs all registered fns once, then resumes.

Backoff: if 3 consecutive `unread-count` calls fail, scheduler doubles that consumer's interval (10→20→40, cap 60s) until success.

## 2.5 Notification triggers (where to emit)

Wire `NotificationService.create(...)` into:
- Job assignment → notify assignee (`link: /jobs/:id`)
- Job status change → notify client + HOD
- Chat @mention → notify mentioned user (`link: /chat/:channelId`)
- Invoice created/sent → notify client (`link: /accounts/invoices/:id/view`)
- Invoice payment received → notify ADMIN + HOD
- Invoice overdue (cron) → notify client + accounts
- Task due tomorrow (cron) → notify assignee

---

# Delivery order

1. Prisma migration (GST + notification fields + indexes) — single PR.
2. Backend: `gstCalculator` service + invoice routes + tests.
3. Backend: notification endpoints + ETag.
4. Frontend: `pollScheduler` + `NotificationContext` + bell popup. Migrate chat to scheduler.
5. Frontend: invoice builder + print view.
6. Cron jobs for overdue invoices + daily digest.
