const express = require("express");
const prisma = require("../lib/prisma");
const { authGuard, requireCap } = require("../middleware/auth");
const { hasCap } = require("../config/permissions");


const router = express.Router();

router.use(authGuard);

// GET /api/jobsheet?date=YYYY-MM-DD&staffName=&jobId=
router.get("/", requireCap("viewJobsheet"), async (req, res) => {
  let { date, staffName, jobId } = req.query;

  // Only roles that can view team workload may query other people's tasks.
  if (!hasCap(req.user.role, "viewTeamWorkload")) staffName = req.user.name;

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

// GET /api/jobsheet/workload — HOD/ADMIN: tasks grouped by staff member
router.get("/workload", requireCap("viewTeamWorkload"), async (_req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const rows = await prisma.task.groupBy({
    by: ["assignedTo", "status"],
    _count: { _all: true },
    where: {
      assignedTo: { not: null },
      OR: [
        { status: { not: "DONE" } },
        { updatedAt: { gte: sevenDaysAgo } },
      ],
    },
  });

  const map = {};
  for (const r of rows) {
    const k = r.assignedTo;
    if (!map[k]) map[k] = { staffName: k, TODO: 0, IN_PROGRESS: 0, DONE: 0, total: 0 };
    map[k][r.status] = (map[k][r.status] || 0) + r._count._all;
    map[k].total += r._count._all;
  }

  res.json(Object.values(map).sort((a, b) => b.total - a.total));
});

// PATCH /api/jobsheet/tasks/:taskId — update job sheet fields
router.patch("/tasks/:taskId", requireCap("updateTaskStatus"), async (req, res) => {
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
