const express = require("express");
const prisma = require("../lib/prisma");
const { authGuard, requireRole, requireCap } = require("../middleware/auth");


const router = express.Router();

router.use(authGuard);

// ─── Channels ────────────────────────────────────────────────────────────────

router.get("/channels", async (_req, res) => {
  const channels = await prisma.chatChannel.findMany({
    include: { client: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(channels);
});

router.post("/channels", requireCap("createChatChannel"), async (req, res) => {
  const { name, description, clientId } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "name is required" });

  const data = { name: name.trim(), description: description?.trim() || null };
  if (clientId) {
    const exists = await prisma.client.findUnique({ where: { id: clientId } });
    if (!exists) return res.status(404).json({ message: "Client not found" });
    data.clientId = clientId;
  }
  const channel = await prisma.chatChannel.create({ data, include: { client: { select: { id: true, name: true } } } });
  res.status(201).json(channel);
});

router.patch("/channels/:channelId", requireCap("createChatChannel"), async (req, res) => {
  const { name, description } = req.body;
  const data = {};
  if (name?.trim()) data.name = name.trim();
  if (description !== undefined) data.description = description?.trim() || null;
  const updated = await prisma.chatChannel.update({
    where: { id: req.params.channelId },
    data,
    include: { client: { select: { id: true, name: true } } },
  });
  res.json(updated);
});

router.delete("/channels/:channelId", requireRole("ADMIN"), async (req, res) => {
  await prisma.chatChannel.delete({ where: { id: req.params.channelId } });
  res.json({ ok: true });
});

// ─── Messages ────────────────────────────────────────────────────────────────

router.get("/channels/:channelId/messages", async (req, res) => {
  const { channelId } = req.params;
  const { since, limit = "60" } = req.query;
  const where = { channelId };
  if (since) where.createdAt = { gt: new Date(since) };
  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: Number(limit),
  });
  res.json(messages);
});

router.post("/channels/:channelId/messages", async (req, res) => {
  const { channelId } = req.params;
  const { body, attachmentUrl, attachmentName, attachmentType } = req.body;

  if (!body?.trim() && !attachmentUrl) {
    return res.status(400).json({ message: "body or attachment is required" });
  }
  const channel = await prisma.chatChannel.findUnique({ where: { id: channelId } });
  if (!channel) return res.status(404).json({ message: "Channel not found" });

  const msg = await prisma.chatMessage.create({
    data: {
      channelId,
      senderId: req.user.id,
      senderName: req.user.name,
      body: body?.trim() || null,
      attachmentUrl: attachmentUrl || null,
      attachmentName: attachmentName || null,
      attachmentType: attachmentType || null,
    },
  });

  // Clear typing indicator for sender
  await prisma.chatTyping.deleteMany({ where: { channelId, userId: req.user.id } }).catch(() => null);

  res.status(201).json(msg);
});

router.patch("/messages/:msgId", async (req, res) => {
  const { msgId } = req.params;
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ message: "body is required" });

  const msg = await prisma.chatMessage.findUnique({ where: { id: msgId } });
  if (!msg) return res.status(404).json({ message: "Message not found" });
  if (msg.senderId !== req.user.id && req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Cannot edit another user's message" });
  }
  if (msg.deletedAt) return res.status(400).json({ message: "Cannot edit a deleted message" });

  const updated = await prisma.chatMessage.update({
    where: { id: msgId },
    data: { body: body.trim(), editedAt: new Date() },
  });
  res.json(updated);
});

router.delete("/messages/:msgId", async (req, res) => {
  const { msgId } = req.params;
  const msg = await prisma.chatMessage.findUnique({ where: { id: msgId } });
  if (!msg) return res.status(404).json({ message: "Message not found" });
  if (msg.senderId !== req.user.id && req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Cannot delete another user's message" });
  }
  const updated = await prisma.chatMessage.update({
    where: { id: msgId },
    data: { deletedAt: new Date(), body: null, attachmentUrl: null },
  });
  res.json(updated);
});

// ─── Typing indicators ───────────────────────────────────────────────────────

router.post("/channels/:channelId/typing", async (req, res) => {
  const { channelId } = req.params;
  await prisma.chatTyping.upsert({
    where: { channelId_userId: { channelId, userId: req.user.id } },
    update: { userName: req.user.name },
    create: { channelId, userId: req.user.id, userName: req.user.name },
  });
  res.json({ ok: true });
});

router.get("/channels/:channelId/typing", async (req, res) => {
  const { channelId } = req.params;
  const cutoff = new Date(Date.now() - 4000);
  const typers = await prisma.chatTyping.findMany({
    where: { channelId, updatedAt: { gt: cutoff }, userId: { not: req.user.id } },
  });
  res.json(typers);
});

module.exports = router;
