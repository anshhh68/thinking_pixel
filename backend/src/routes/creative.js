const express = require("express");
const multer = require("multer");
const { PrismaClient } = require("@prisma/client");
const { authGuard, requireRole } = require("../middleware/auth");

const prisma = new PrismaClient();
const router = express.Router();

// Store file buffer in memory, convert to base64 data URL, save in DB (prototype)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authGuard);

router.post(
  "/tasks/:taskId/upload",
  requireRole("STAFF", "HOD", "ADMIN"),
  upload.single("file"),
  async (req, res) => {
    const { taskId } = req.params;
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const lastVersion = await prisma.assetVersion.findFirst({
      where: { taskId },
      orderBy: { versionNumber: "desc" },
    });
    const versionNumber = (lastVersion?.versionNumber || 0) + 1;
    const created = await prisma.assetVersion.create({
      data: { taskId, versionNumber, fileUrl: dataUrl },
    });
    res.status(201).json(created);
  }
);

module.exports = router;
