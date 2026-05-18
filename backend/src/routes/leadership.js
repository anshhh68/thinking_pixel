const express = require("express");
const prisma = require("../lib/prisma");
const { authGuard, requireCap } = require("../middleware/auth");


const router = express.Router();

router.use(authGuard);
router.use(requireCap("viewLeadership"));

router.get("/kpis", async (_req, res) => {
  const [jobs, tasks, invoices, employees, pendingLeaves] = await Promise.all([
    prisma.job.findMany({ select: { id: true, status: true } }),
    prisma.task.findMany({ select: { id: true, status: true, readyForReview: true } }),
    prisma.invoice.findMany({ select: { amount: true, amountPaid: true, status: true } }),
    prisma.employee.count(),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
  ]);

  const jobsOpen = jobs.filter((j) => j.status === "OPEN").length;
  const jobsClientReview = jobs.filter((j) => j.status === "CLIENT_REVIEW").length;
  const jobsApproved = jobs.filter((j) => j.status === "CLIENT_APPROVED").length;

  const tasksTodo = tasks.filter((t) => t.status === "TODO").length;
  const tasksInProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const tasksRework = tasks.filter((t) => t.status === "REWORK").length;
  const tasksReadyReview = tasks.filter((t) => t.readyForReview).length;

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.amount, 0);
  const totalCollected = invoices.reduce((sum, i) => sum + i.amountPaid, 0);
  const overdueCount = invoices.filter((i) => i.status === "OVERDUE").length;
  const outstandingAmount = totalInvoiced - totalCollected;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaysAttendance = await prisma.attendance.groupBy({
    by: ["status"],
    where: { date: { gte: today, lt: tomorrow } },
    _count: { status: true },
  });
  const attendanceMap = Object.fromEntries(todaysAttendance.map((r) => [r.status, r._count.status]));

  res.json({
    hr: {
      totalEmployees: employees,
      attendanceToday: {
        PRESENT: attendanceMap.PRESENT || 0,
        ABSENT: attendanceMap.ABSENT || 0,
        LEAVE: attendanceMap.LEAVE || 0,
      },
      pendingLeaves,
    },
    jobs: {
      total: jobs.length,
      open: jobsOpen,
      clientReview: jobsClientReview,
      approved: jobsApproved,
    },
    tasks: {
      total: tasks.length,
      todo: tasksTodo,
      inProgress: tasksInProgress,
      rework: tasksRework,
      readyForReview: tasksReadyReview,
    },
    finance: {
      totalInvoiced,
      totalCollected,
      outstandingAmount,
      overdueCount,
    },
  });
});

module.exports = router;
