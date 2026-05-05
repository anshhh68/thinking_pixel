const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authGuard, requireRole } = require("../middleware/auth");
const { getPagination, paginatedResponse } = require("../utils/pagination");
const { logAudit } = require("../utils/audit");

const prisma = new PrismaClient();
const router = express.Router();

router.use(authGuard);

router.get("/", async (req, res) => {
  const unreadOnly = req.query.unread === "true";
  const { page, pageSize, skip, take } = getPagination(req.query);
  const where = {
    OR: [{ userId: req.user.id }, { audienceRole: req.user.role }],
    ...(unreadOnly ? { isRead: false } : {}),
  };
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.notification.count({ where }),
  ]);
  if (req.query.paginated === "true") {
    return res.json(paginatedResponse({ items: notifications, total, page, pageSize }));
  }
  return res.json(notifications);
});

router.patch("/:id/read", async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: "Notification not found" });
  if (existing.userId && existing.userId !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
  res.json(updated);
});

router.post("/broadcast", requireRole("ADMIN", "HOD"), async (req, res) => {
  const { audienceRole, title, message, type } = req.body;
  if (!audienceRole || !title || !message) {
    return res.status(400).json({ message: "audienceRole, title, message are required" });
  }
  const created = await prisma.notification.create({
    data: {
      audienceRole,
      title,
      message,
      type: type || "SYSTEM",
    },
  });
  await logAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "NOTIFICATION_BROADCAST",
    entityType: "Notification",
    entityId: created.id,
    payload: { audienceRole, type: type || "SYSTEM" },
  });
  // Email stub for Phase 4.
  console.log(`[EMAIL_STUB] Broadcast to ${audienceRole}: ${title}`);
  res.status(201).json(created);
});

module.exports = router;
