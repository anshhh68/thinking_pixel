const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authGuard, requireRole } = require("../middleware/auth");
const { getPagination, paginatedResponse } = require("../utils/pagination");
const { logAudit } = require("../utils/audit");

const prisma = new PrismaClient();
const router = express.Router();

router.use(authGuard);

router.get("/", async (req, res) => {
  const { page, pageSize, skip, take } = getPagination(req.query);
  const [clients, total] = await Promise.all([
    prisma.client.findMany({ orderBy: { createdAt: "desc" }, skip, take }),
    prisma.client.count(),
  ]);
  if (req.query.paginated === "true") {
    return res.json(paginatedResponse({ items: clients, total, page, pageSize }));
  }
  return res.json(clients);
});

router.post("/", requireRole("STAFF", "HOD", "ADMIN"), async (req, res) => {
  const { name, contactInfo, requirements, scope, timeline, priority } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "name is required" });
  }
  const created = await prisma.client.create({
    data: { name, contactInfo, requirements, scope, timeline, priority },
  });
  await logAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "CLIENT_CREATED",
    entityType: "Client",
    entityId: created.id,
    payload: { name: created.name },
  });
  res.status(201).json(created);
});

router.put("/:id", requireRole("STAFF", "HOD", "ADMIN"), async (req, res) => {
  const { id } = req.params;
  const updated = await prisma.client.update({
    where: { id },
    data: req.body,
  });
  await logAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "CLIENT_UPDATED",
    entityType: "Client",
    entityId: updated.id,
    payload: req.body,
  });
  res.json(updated);
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const { id } = req.params;
  await prisma.client.delete({ where: { id } });
  await logAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "CLIENT_DELETED",
    entityType: "Client",
    entityId: id,
  });
  res.status(204).send();
});

module.exports = router;
