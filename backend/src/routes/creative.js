const express = require("express");
const multer = require("multer");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { authGuard, requireRole } = require("../middleware/auth");

const prisma = new PrismaClient();
const router = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, "../../uploads")),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.use(authGuard);

router.post(
  "/tasks/:taskId/upload",
  requireRole("STAFF", "HOD", "ADMIN"),
  upload.single("file"),
  async (req, res) => {
    const { taskId } = req.params;
    const lastVersion = await prisma.assetVersion.findFirst({
      where: { taskId },
      orderBy: { versionNumber: "desc" },
    });
    const versionNumber = (lastVersion?.versionNumber || 0) + 1;
    const created = await prisma.assetVersion.create({
      data: {
        taskId,
        versionNumber,
        fileUrl: `/uploads/${req.file.filename}`,
      },
    });
    res.status(201).json(created);
  }
);

module.exports = router;
