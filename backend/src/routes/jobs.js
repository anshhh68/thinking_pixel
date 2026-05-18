const express = require("express");
const crypto = require("crypto");
const prisma = require("../lib/prisma");
const { authGuard, requireRole, requireCap } = require("../middleware/auth");
const { getPagination, paginatedResponse } = require("../utils/pagination");
const { logAudit } = require("../utils/audit");


const router = express.Router();

// Public client portal endpoints (no auth required).
router.get("/public/:token", async (req, res) => {
  const { token } = req.params;
  const job = await prisma.job.findFirst({
    where: { clientReviewToken: token },
    include: {
      client: true,
      tasks: {
        where: { readyForReview: true },
        include: { versions: { orderBy: { versionNumber: "desc" } } },
      },
    },
  });
  if (!job) return res.status(404).json({ message: "Invalid review link" });
  return res.json(job);
});

router.post("/public/:token/decision", async (req, res) => {
  const { token } = req.params;
  const { status, comment } = req.body;
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ message: "status must be APPROVED or REJECTED" });
  }
  const job = await prisma.job.findFirst({ where: { clientReviewToken: token } });
  if (!job) return res.status(404).json({ message: "Invalid review link" });

  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      clientApprovalStatus: status,
      clientApprovalComment: comment || null,
      status: status === "APPROVED" ? "CLIENT_APPROVED" : "REWORK_REQUIRED",
    },
  });
  await prisma.notification.create({
    data: {
      audienceRole: "STAFF",
      type: "CLIENT_DECISION",
      title: `Client ${status} job ${updated.title}`,
      message: comment || `Client decision recorded as ${status}.`,
    },
  });
  await logAudit({
    actorId: null,
    actorRole: "CLIENT",
    action: `CLIENT_JOB_${status}`,
    entityType: "Job",
    entityId: updated.id,
    payload: { comment: comment || null },
  });
  return res.json(updated);
});

router.use(authGuard);

router.get("/", async (req, res) => {
  const { page, pageSize, skip, take } = getPagination(req.query);
  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      include: { client: true, tasks: { include: { versions: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.job.count(),
  ]);
  if (req.query.paginated === "true") {
    return res.json(paginatedResponse({ items: jobs, total, page, pageSize }));
  }
  return res.json(jobs);
});

router.get("/hod/queue", requireCap("approveTasks"), async (_req, res) => {
  const queue = await prisma.task.findMany({
    where: { readyForReview: true, hodReviewStatus: "PENDING" },
    include: {
      job: { include: { client: true } },
      versions: { orderBy: { versionNumber: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(queue);
});

router.post("/", requireCap("manageJobs"), async (req, res) => {
  const { clientId, title, owner, dueDate, priority, status } = req.body;
  if (!clientId || !title) {
    return res.status(400).json({ message: "clientId and title are required" });
  }
  const job = await prisma.job.create({
    data: {
      clientId,
      title,
      owner,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority,
      status: status || "OPEN",
    },
  });
  await logAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "JOB_CREATED",
    entityType: "Job",
    entityId: job.id,
    payload: { title: job.title, clientId: job.clientId },
  });
  res.status(201).json(job);
});

router.post("/:jobId/tasks", requireCap("manageJobs"), async (req, res) => {
  const { jobId } = req.params;
  const { assignedTo, description, status, dueDate } = req.body;
  if (!description || !description.trim()) {
    return res.status(400).json({ message: "description is required" });
  }
  const task = await prisma.task.create({
    data: {
      jobId,
      assignedTo,
      description,
      status: status || "TODO",
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });
  await logAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "TASK_CREATED",
    entityType: "Task",
    entityId: task.id,
    payload: { jobId, description: task.description },
  });
  res.status(201).json(task);
});

router.patch("/tasks/:taskId/status", requireCap("updateTaskStatus"), async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;
  const updated = await prisma.task.update({ where: { id: taskId }, data: { status } });
  res.json(updated);
});

router.patch("/tasks/:taskId/ready", requireCap("updateTaskStatus"), async (req, res) => {
  const { taskId } = req.params;
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { readyForReview: true },
  });
  await prisma.notification.create({
    data: {
      audienceRole: "HOD",
      type: "TASK_READY_REVIEW",
      title: "Task marked ready for review",
      message: `Task ${updated.id} is ready for HOD review.`,
    },
  });
  await logAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "TASK_MARKED_READY",
    entityType: "Task",
    entityId: updated.id,
  });
  res.json(updated);
});

router.patch("/tasks/:taskId/hod-decision", requireCap("approveTasks"), async (req, res) => {
  const { taskId } = req.params;
  const { status, comment } = req.body;
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ message: "status must be APPROVED or REJECTED" });
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      hodReviewStatus: status,
      hodReviewComment: comment || null,
      status: status === "APPROVED" ? "DONE" : "REWORK",
      readyForReview: status === "APPROVED",
    },
  });
  await prisma.notification.create({
    data: {
      audienceRole: "STAFF",
      type: "HOD_DECISION",
      title: `HOD ${status} task`,
      message: comment || `Task moved to ${updated.status}.`,
    },
  });
  await logAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: `HOD_TASK_${status}`,
    entityType: "Task",
    entityId: updated.id,
    payload: { comment: comment || null },
  });
  res.json(updated);
});

router.post("/:jobId/client-review-link", requireCap("manageJobs"), async (req, res) => {
  const { jobId } = req.params;
  const token = crypto.randomUUID();
  const updated = await prisma.job.update({
    where: { id: jobId },
    data: { clientReviewToken: token, clientApprovalStatus: "PENDING", status: "CLIENT_REVIEW" },
  });
  await prisma.notification.create({
    data: {
      audienceRole: "CLIENT",
      type: "CLIENT_REVIEW_LINK",
      title: "New client review requested",
      message: `A review link is available for job ${updated.title}.`,
    },
  });
  await logAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "CLIENT_REVIEW_LINK_GENERATED",
    entityType: "Job",
    entityId: updated.id,
    payload: { token },
  });
  console.log(`[EMAIL_STUB] Client review link generated for job ${updated.id}`);
  res.json({
    token,
    reviewUrl: `${req.protocol}://${req.get("host")}/client-review/${token}`,
    jobId: updated.id,
  });
});

router.patch("/:jobId", requireCap("manageJobs"), async (req, res) => {
  const { jobId } = req.params;
  const { title, owner, dueDate, priority, status } = req.body;
  const updated = await prisma.job.update({
    where: { id: jobId },
    data: {
      ...(title && { title }),
      ...(owner !== undefined && { owner }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(priority && { priority }),
      ...(status && { status }),
    },
  });
  await logAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "JOB_UPDATED",
    entityType: "Job",
    entityId: updated.id,
    payload: req.body,
  });
  res.json(updated);
});

router.delete("/:jobId", requireRole("ADMIN"), async (req, res) => {
  const { jobId } = req.params;
  await prisma.job.delete({ where: { id: jobId } });
  await logAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "JOB_DELETED",
    entityType: "Job",
    entityId: jobId,
  });
  res.status(204).send();
});

router.delete("/tasks/:taskId", requireRole("ADMIN"), async (req, res) => {
  const { taskId } = req.params;
  await prisma.task.delete({ where: { id: taskId } });
  await logAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "TASK_DELETED",
    entityType: "Task",
    entityId: taskId,
  });
  res.status(204).send();
});

module.exports = router;
