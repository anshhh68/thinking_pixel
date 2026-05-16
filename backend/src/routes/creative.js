const express = require("express");
const multer = require("multer");
const { PrismaClient } = require("@prisma/client");
const { authGuard, requireRole, requireCap } = require("../middleware/auth");
const { hasCap } = require("../config/permissions");

const prisma = new PrismaClient();
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authGuard);

// GET /creative/drive — Client → Job → Task → Versions tree (role-filtered)
router.get("/drive", async (req, res) => {
  const restricted = !hasCap(req.user.role, "approveTasks");

  const clients = await prisma.client.findMany({
    include: {
      jobs: {
        include: {
          tasks: {
            where: restricted ? { assignedTo: req.user.name } : undefined,
            include: { versions: { orderBy: { versionNumber: "asc" } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const result = clients
    .map((c) => ({
      ...c,
      jobs: c.jobs
        .map((j) => ({ ...j, tasks: j.tasks.filter((t) => t.versions.length > 0 || !restricted) }))
        .filter((j) => !restricted || j.tasks.length > 0),
    }))
    .filter((c) => !restricted || c.jobs.length > 0);

  res.json(result);
});

// ── Folder routes ─────────────────────────────────────────────────────────────

// GET /creative/folders — list root folders (or children of parentId)
router.get("/folders", async (req, res) => {
  const { parentId } = req.query;
  const folders = await prisma.folder.findMany({
    where: { parentId: parentId || null },
    include: { _count: { select: { children: true, versions: true } } },
    orderBy: { name: "asc" },
  });
  res.json(folders);
});

// GET /creative/folders/:id — folder contents + breadcrumbs
router.get("/folders/:id", async (req, res) => {
  const folder = await prisma.folder.findUnique({
    where: { id: req.params.id },
    include: {
      children: { include: { _count: { select: { children: true, versions: true } } }, orderBy: { name: "asc" } },
      versions: { orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!folder) return res.status(404).json({ message: "Folder not found" });

  // Build breadcrumbs
  const breadcrumbs = [];
  let cur = folder;
  while (cur.parentId) {
    const parent = await prisma.folder.findUnique({ where: { id: cur.parentId }, select: { id: true, name: true, parentId: true } });
    if (!parent) break;
    breadcrumbs.unshift({ id: parent.id, name: parent.name });
    cur = parent;
  }

  res.json({ folder, breadcrumbs });
});

// POST /creative/folders — create folder (HOD/ADMIN)
router.post("/folders", requireCap("manageFolders"), async (req, res) => {
  const { name, parentId } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "name is required" });
  const folder = await prisma.folder.create({
    data: { name: name.trim(), parentId: parentId || null, createdById: req.user.id },
  });
  res.status(201).json(folder);
});

// PATCH /creative/folders/:id — rename or move (HOD/ADMIN)
router.patch("/folders/:id", requireCap("manageFolders"), async (req, res) => {
  const { name, parentId } = req.body;
  const data = {};
  if (name?.trim()) data.name = name.trim();
  if (parentId !== undefined) data.parentId = parentId || null;
  const updated = await prisma.folder.update({ where: { id: req.params.id }, data });
  res.json(updated);
});

// DELETE /creative/folders/:id — ADMIN only (cascade removes sub-folders)
router.delete("/folders/:id", requireRole("ADMIN"), async (req, res) => {
  await prisma.folder.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// POST /creative/folders/:id/upload — upload file directly into a folder
router.post(
  "/folders/:id/upload",
  requireCap("uploadCreative"),
  upload.single("file"),
  async (req, res) => {
    const { id: folderId } = req.params;
    const { displayName } = req.body;
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) return res.status(404).json({ message: "Folder not found" });

    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const created = await prisma.assetVersion.create({
      data: {
        folderId,
        taskId: null,
        versionNumber: 1,
        fileUrl: dataUrl,
        displayName: displayName || null,
        originalName: req.file.originalname || null,
        mimeType: req.file.mimetype || null,
      },
    });
    res.status(201).json(created);
  }
);

// ── Task version upload ───────────────────────────────────────────────────────

// POST /creative/tasks/:taskId/upload
router.post(
  "/tasks/:taskId/upload",
  requireCap("uploadCreative"),
  upload.single("file"),
  async (req, res) => {
    const { taskId } = req.params;
    const { displayName } = req.body;
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const lastVersion = await prisma.assetVersion.findFirst({
      where: { taskId },
      orderBy: { versionNumber: "desc" },
    });
    const versionNumber = (lastVersion?.versionNumber || 0) + 1;
    const created = await prisma.assetVersion.create({
      data: {
        taskId,
        versionNumber,
        fileUrl: dataUrl,
        displayName: displayName || null,
        originalName: req.file.originalname || null,
        mimeType: req.file.mimetype || null,
      },
    });
    res.status(201).json(created);
  }
);

// PATCH /creative/versions/:id — rename + optional move to folder
router.patch("/versions/:id", requireCap("manageFolders"), async (req, res) => {
  const { displayName, folderId } = req.body;
  if (!displayName?.trim() && folderId === undefined) return res.status(400).json({ message: "displayName or folderId is required" });
  const data = {};
  if (displayName?.trim()) data.displayName = displayName.trim();
  if (folderId !== undefined) data.folderId = folderId || null;
  const updated = await prisma.assetVersion.update({ where: { id: req.params.id }, data });
  res.json(updated);
});

// DELETE /creative/versions/:id
router.delete("/versions/:id", requireCap("manageFolders"), async (req, res) => {
  await prisma.assetVersion.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
