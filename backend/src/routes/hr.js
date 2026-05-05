const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authGuard, requireRole } = require("../middleware/auth");

const prisma = new PrismaClient();
const router = express.Router();

router.use(authGuard);

router.get("/employees", async (_req, res) => {
  const employees = await prisma.employee.findMany({ include: { user: true } });
  res.json(employees);
});

router.post("/employees", requireRole("ADMIN", "HOD"), async (req, res) => {
  const { userId, department, joinDate } = req.body;
  const employee = await prisma.employee.create({
    data: { userId, department, joinDate: joinDate ? new Date(joinDate) : null },
  });
  res.status(201).json(employee);
});

router.post("/attendance", requireRole("ADMIN", "HOD"), async (req, res) => {
  const { employeeId, date, status } = req.body;
  const attendance = await prisma.attendance.create({
    data: { employeeId, date: new Date(date), status },
  });
  res.status(201).json(attendance);
});

router.post("/leave-requests", async (req, res) => {
  const { employeeId, startDate, endDate, reason } = req.body;
  const leave = await prisma.leaveRequest.create({
    data: {
      employeeId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
    },
  });
  await prisma.notification.create({
    data: {
      audienceRole: "ADMIN",
      type: "LEAVE_REQUEST",
      title: "New leave request submitted",
      message: `Employee ${employeeId} requested leave from ${startDate} to ${endDate}.`,
    },
  });
  res.status(201).json(leave);
});

router.patch("/leave-requests/:id/approve", requireRole("ADMIN", "HOD"), async (req, res) => {
  const { id } = req.params;
  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: { status: "APPROVED" },
  });
  await prisma.notification.create({
    data: {
      audienceRole: "STAFF",
      type: "LEAVE_APPROVED",
      title: "Leave request approved",
      message: `Leave request ${id} has been approved.`,
    },
  });
  res.json(updated);
});

module.exports = router;
