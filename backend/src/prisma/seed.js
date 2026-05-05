const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function upsertUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash },
    create: { name, email, role, passwordHash },
  });
}

async function main() {
  const admin = await upsertUser({
    name: "Admin User",
    email: "admin@thinkingpixel.com",
    password: "Admin@123",
    role: "ADMIN",
  });
  const hod = await upsertUser({
    name: "HOD User",
    email: "hod@thinkingpixel.com",
    password: "Hod@123",
    role: "HOD",
  });
  const staff = await upsertUser({
    name: "Staff User",
    email: "staff@thinkingpixel.com",
    password: "Staff@123",
    role: "STAFF",
  });
  await upsertUser({
    name: "Client User",
    email: "client@thinkingpixel.com",
    password: "Client@123",
    role: "CLIENT",
  });

  const client = await prisma.client.upsert({
    where: { id: "seed-client-001" },
    update: {
      name: "Seed Client",
      contactInfo: "seed-client@example.com",
      requirements: "Website + social creatives",
      scope: "Brand + campaigns",
      timeline: "30 days",
      priority: "HIGH",
    },
    create: {
      id: "seed-client-001",
      name: "Seed Client",
      contactInfo: "seed-client@example.com",
      requirements: "Website + social creatives",
      scope: "Brand + campaigns",
      timeline: "30 days",
      priority: "HIGH",
    },
  });

  const job = await prisma.job.upsert({
    where: { id: "seed-job-001" },
    update: {
      title: "Seed Brand Campaign",
      owner: staff.name,
      priority: "HIGH",
      status: "CLIENT_APPROVED",
      clientApprovalStatus: "APPROVED",
    },
    create: {
      id: "seed-job-001",
      clientId: client.id,
      title: "Seed Brand Campaign",
      owner: staff.name,
      priority: "HIGH",
      status: "CLIENT_APPROVED",
      clientApprovalStatus: "APPROVED",
    },
  });

  const task = await prisma.task.upsert({
    where: { id: "seed-task-001" },
    update: {
      jobId: job.id,
      assignedTo: staff.name,
      description: "Landing page hero creative",
      status: "DONE",
      readyForReview: true,
      hodReviewStatus: "APPROVED",
    },
    create: {
      id: "seed-task-001",
      jobId: job.id,
      assignedTo: staff.name,
      description: "Landing page hero creative",
      status: "DONE",
      readyForReview: true,
      hodReviewStatus: "APPROVED",
    },
  });

  await prisma.assetVersion.upsert({
    where: { id: "seed-version-001" },
    update: {
      taskId: task.id,
      versionNumber: 1,
      fileUrl: "/uploads/seed-asset.png",
    },
    create: {
      id: "seed-version-001",
      taskId: task.id,
      versionNumber: 1,
      fileUrl: "/uploads/seed-asset.png",
    },
  });

  await prisma.employee.upsert({
    where: { userId: staff.id },
    update: { department: "Creative" },
    create: { userId: staff.id, department: "Creative" },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const staffEmployee = await prisma.employee.findUnique({ where: { userId: staff.id } });
  const hodEmployee = await prisma.employee.upsert({
    where: { userId: hod.id },
    update: { department: "Management" },
    create: { userId: hod.id, department: "Management" },
  });
  const adminEmployee = await prisma.employee.upsert({
    where: { userId: admin.id },
    update: { department: "Operations" },
    create: { userId: admin.id, department: "Operations" },
  });

  if (staffEmployee) {
    await prisma.attendance.upsert({
      where: { id: "seed-attendance-001" },
      update: { employeeId: staffEmployee.id, date: today, status: "PRESENT" },
      create: { id: "seed-attendance-001", employeeId: staffEmployee.id, date: today, status: "PRESENT" },
    });
  }

  await prisma.attendance.upsert({
    where: { id: "seed-attendance-002" },
    update: { employeeId: hodEmployee.id, date: today, status: "PRESENT" },
    create: { id: "seed-attendance-002", employeeId: hodEmployee.id, date: today, status: "PRESENT" },
  });

  await prisma.attendance.upsert({
    where: { id: "seed-attendance-003" },
    update: { employeeId: adminEmployee.id, date: today, status: "PRESENT" },
    create: { id: "seed-attendance-003", employeeId: adminEmployee.id, date: today, status: "PRESENT" },
  });

  await prisma.leaveRequest.upsert({
    where: { id: "seed-leave-001" },
    update: {
      employeeId: staffEmployee?.id || hodEmployee.id,
      startDate: today,
      endDate: today,
      reason: "Personal errand",
      status: "PENDING",
    },
    create: {
      id: "seed-leave-001",
      employeeId: staffEmployee?.id || hodEmployee.id,
      startDate: today,
      endDate: today,
      reason: "Personal errand",
      status: "PENDING",
    },
  });

  await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-SEED-001" },
    update: {
      jobId: job.id,
      clientId: client.id,
      amount: 50000,
      amountPaid: 10000,
      dueDate: new Date(Date.now() - 86400000),
      status: "OVERDUE",
      remindersSent: 1,
    },
    create: {
      jobId: job.id,
      clientId: client.id,
      invoiceNumber: "INV-SEED-001",
      amount: 50000,
      amountPaid: 10000,
      dueDate: new Date(Date.now() - 86400000),
      status: "OVERDUE",
      remindersSent: 1,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        audienceRole: "STAFF",
        type: "SYSTEM",
        title: "Seed data ready",
        message: "Demo seed has been populated successfully.",
      },
      {
        audienceRole: "ADMIN",
        type: "SYSTEM",
        title: "Audit baseline",
        message: "System is ready for smoke testing.",
      },
    ],
  });

  console.log("Seed completed successfully.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
