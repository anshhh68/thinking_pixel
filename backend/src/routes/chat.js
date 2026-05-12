const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authGuard, requireRole } = require("../middleware/auth");

const prisma = new PrismaClient();
const router = express.Router();

router.use(authGuard);

// List all channels (one per client)
router.get("/channels", requireRole("STAFF", "HOD", "ADMIN"), async (_req, res) => {
  const channels = await prisma.chatChannel.findMany({
    include: { client: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(channels);
});

// Get messages for a channel (supports ?since=ISO for polling)
router.get("/channels/:channelId/messages", requireRole("STAFF", "HOD", "ADMIN"), async (req, res) => {
  const { channelId } = req.params;
  const { since } = req.query;
  const where = { channelId };
  if (since) where.createdAt = { gt: new Date(since) };
  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  res.json(messages);
});

// Post a message
router.post("/channels/:channelId/messages", requireRole("STAFF", "HOD", "ADMIN"), async (req, res) => {
  const { channelId } = req.params;
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ message: "body is required" });

  const channel = await prisma.chatChannel.findUnique({ where: { id: channelId } });
  if (!channel) return res.status(404).json({ message: "Channel not found" });

  const msg = await prisma.chatMessage.create({
    data: {
      channelId,
      senderId: req.user.id,
      senderName: req.user.name,
      body: body.trim(),
    },
  });
  res.status(201).json(msg);
});

// Rename a channel
router.patch("/channels/:channelId", requireRole("HOD", "ADMIN"), async (req, res) => {
  const { channelId } = req.params;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "name is required" });
  const updated = await prisma.chatChannel.update({
    where: { id: channelId },
    data: { name: name.trim() },
  });
  res.json(updated);
});

module.exports = router;
