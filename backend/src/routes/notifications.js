const express = require("express");
const prisma = require("../lib/prisma");
const { authGuard, requireCap } = require("../middleware/auth");
const { getPagination, paginatedResponse } = require("../utils/pagination");
const { logAudit } = require("../utils/audit");


const router = express.Router();

router.use(authGuard);

// Build the shared WHERE for "notifications visible to this user"
function userWhere(user, extra = {}) {
  return {
    OR: [{ userId: user.id }, { audienceRole: user.role }],
    ...extra,
  };
}

// GET /notifications/unread-count — cheap poll endpoint with ETag
router.get("/unread-count", async (req, res) => {
  const where = userWhere(req.user, { isRead: false });
  const [count, latest] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findFirst({ where: userWhere(req.user), orderBy: { createdAt: "desc" }, select: { id: true } }),
  ]);
  const etag = `${latest?.id ?? "none"}-${count}`;
  if (req.headers["if-none-match"] === etag) return res.status(304).end();
  res.set("ETag", etag).json({ count, latestId: latest?.id ?? null });
});

// GET /notifications/recent — last 10 for popup (unread first, then by date)
router.get("/recent", async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: userWhere(req.user),
    orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
    take: 10,
  });
  res.json(notifications);
});

// GET /notifications — paginated full list
router.get("/", async (req, res) => {
  const unreadOnly = req.query.unread === "true";
  const { page, pageSize, skip, take } = getPagination(req.query);
  const where = userWhere(req.user, unreadOnly ? { isRead: false } : {});

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.notification.count({ where }),
  ]);

  if (req.query.paginated === "true") {
    return res.json(paginatedResponse({ items: notifications, total, page, pageSize }));
  }
  return res.json(notifications);
});

// PATCH /notifications/:id/read
router.patch("/:id/read", async (req, res) => {
  const existing = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: "Notification not found" });
  if (existing.userId && existing.userId !== req.user.id) return res.status(403).json({ message: "Forbidden" });

  const updated = await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true, readAt: new Date() },
  });
  res.json(updated);
});

// PATCH /notifications/read-all — mark all unread for this user as read
router.patch("/read-all", async (req, res) => {
  const now = new Date();
  await prisma.notification.updateMany({
    where: userWhere(req.user, { isRead: false }),
    data: { isRead: true, readAt: now },
  });
  res.json({ ok: true });
});

// POST /notifications/broadcast
router.post("/broadcast", requireCap("viewLeadership"), async (req, res) => {
  const { audienceRole, title, message, type, link } = req.body;
  if (!audienceRole || !title || !message) {
    return res.status(400).json({ message: "audienceRole, title, message are required" });
  }
  const created = await prisma.notification.create({
    data: { audienceRole, title, message, type: type || "GENERAL", link: link || null },
  });
  await logAudit({
    actorId: req.user.id, actorRole: req.user.role,
    action: "NOTIFICATION_BROADCAST", entityType: "Notification", entityId: created.id,
    payload: { audienceRole, type: type || "GENERAL" },
  });
  res.status(201).json(created);
});

module.exports = router;
