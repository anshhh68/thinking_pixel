const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authGuard, requireRole } = require("../middleware/auth");

const prisma = new PrismaClient();
const router = express.Router();

router.use(authGuard);

// GET /api/jobsheet?date=YYYY-MM-DD&staffName=&jobId=
router.get("/", requireRole("STAFF", "HOD", "ADMIN"), async (req, res) => {
  const { date, staffName, jobId } = req.query;

  const taskWhere = {};
  if (staffName) taskWhere.assignedTo = { contains: staffName, mode: "insensitive" };
  if (jobId) taskWhere.jobId = jobId;
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    taskWhere.dueDate = { gte: start, lt: end };
  }

  const tasks = await prisma.task.findMany({
    where: taskWhere,
    include: { job: { include: { client: { select: { id: true, name: true } } } } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    take: 200,
  });

  res.json(tasks);
});

// PATCH /api/jobsheet/tasks/:taskId — update job sheet fields
router.patch("/tasks/:taskId", requireRole("STAFF", "HOD", "ADMIN"), async (req, res) => {
  const { taskId } = req.params;
  const { quantity, copyStatus, brief, size, status } = req.body;
  const data = {};
  if (quantity !== undefined) data.quantity = quantity === "" ? null : Number(quantity);
  if (copyStatus !== undefined) data.copyStatus = copyStatus || null;
  if (brief !== undefined) data.brief = brief || null;
  if (size !== undefined) data.size = size || null;
  if (status !== undefined) data.status = status;

  const task = await prisma.task.update({ where: { id: taskId }, data });
  res.json(task);
});

module.exports = router;
