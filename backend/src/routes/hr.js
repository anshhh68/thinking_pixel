const express = require("express");
const prisma = require("../lib/prisma");
const { authGuard, requireCap } = require("../middleware/auth");
const { hasCap } = require("../config/permissions");

const router = express.Router();

router.use(authGuard);

// GET /hr/users-without-employee — Users that don't have an Employee record yet
router.get("/users-without-employee", requireCap("manageHR"), async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { not: "CLIENT" },
        employee: null,
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /hr/employees
router.get("/employees", async (_req, res) => {
  try {
    const employees = await prisma.employee.findMany({ include: { user: true } });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /hr/employees
router.post("/employees", requireCap("manageHR"), async (req, res) => {
  try {
    const { userId, department, joinDate } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Validate user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(400).json({ message: "User not found. Please select a valid user." });
    }

    // Check if employee record already exists
    const existing = await prisma.employee.findUnique({ where: { userId } });
    if (existing) {
      return res.status(409).json({ message: "This user already has an employee record." });
    }

    const employee = await prisma.employee.create({
      data: { userId, department, joinDate: joinDate ? new Date(joinDate) : null },
      include: { user: true },
    });
    res.status(201).json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /hr/attendance
router.post("/attendance", requireCap("manageHR"), async (req, res) => {
  try {
    const { employeeId, date, status } = req.body;
    if (!employeeId || !date || !status) {
      return res.status(400).json({ message: "employeeId, date, and status are required" });
    }
    const attendance = await prisma.attendance.create({
      data: { employeeId, date: new Date(date), status },
    });
    res.status(201).json(attendance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /hr/attendance
router.get("/attendance", async (req, res) => {
  try {
    const attendance = await prisma.attendance.findMany({
      include: { employee: { include: { user: true } } },
      orderBy: { date: "desc" },
      take: 100,
    });
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /hr/leave-requests
router.get("/leave-requests", async (req, res) => {
  try {
    const where = hasCap(req.user.role, "manageHR")
      ? {}
      : { employee: { userId: req.user.id } };
    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: { employee: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /hr/leave-requests — staff can only submit for their own employee record
router.post("/leave-requests", async (req, res) => {
  try {
    const { employeeId, startDate, endDate, reason } = req.body;
    if (!employeeId || !startDate || !endDate) {
      return res.status(400).json({ message: "employeeId, startDate, and endDate are required" });
    }

    // Ownership check: non-HR users can only submit leave for themselves
    if (!hasCap(req.user.role, "manageHR")) {
      const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
      if (!emp || emp.userId !== req.user.id) {
        return res.status(403).json({ message: "You can only submit leave requests for yourself." });
      }
    }

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
        message: `Employee requested leave from ${startDate} to ${endDate}.`,
      },
    });
    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /hr/leave-requests/:id/approve
router.patch("/leave-requests/:id/approve", requireCap("manageHR"), async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /hr/leave-requests/:id/reject
router.patch("/leave-requests/:id/reject", requireCap("manageHR"), async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: "REJECTED" },
    });
    await prisma.notification.create({
      data: {
        audienceRole: "STAFF",
        type: "LEAVE_REJECTED",
        title: "Leave request rejected",
        message: `Leave request ${id} has been rejected.`,
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
