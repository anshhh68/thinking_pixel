const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authGuard, requireRole } = require("../middleware/auth");
const { getPagination, paginatedResponse } = require("../utils/pagination");
const { logAudit } = require("../utils/audit");

const prisma = new PrismaClient();
const router = express.Router();

router.use(authGuard);

router.get("/invoices", requireRole("STAFF", "HOD", "ADMIN"), async (req, res) => {
  const { page, pageSize, skip, take } = getPagination(req.query);
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      include: { job: true, client: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.invoice.count(),
  ]);
  if (req.query.paginated === "true") {
    return res.json(paginatedResponse({ items: invoices, total, page, pageSize }));
  }
  return res.json(invoices);
});

router.get("/outstanding", requireRole("STAFF", "HOD", "ADMIN"), async (_req, res) => {
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } },
    include: { job: true, client: true },
    orderBy: { dueDate: "asc" },
  });
  const now = new Date();
  const enriched = invoices.map((invoice) => {
    const outstandingAmount = invoice.amount - invoice.amountPaid;
    const daysOverdue =
      now > invoice.dueDate
        ? Math.ceil((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
    return { ...invoice, outstandingAmount, daysOverdue };
  });
  res.json(enriched);
});

router.post("/invoices", requireRole("STAFF", "HOD", "ADMIN"), async (req, res) => {
  const { jobId, amount, dueDate, notes } = req.body;
  if (!jobId || !amount || !dueDate) {
    return res.status(400).json({ message: "jobId, amount and dueDate are required" });
  }
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return res.status(404).json({ message: "Job not found" });
  if (job.clientApprovalStatus !== "APPROVED") {
    return res.status(400).json({ message: "Invoice can only be created after client approval" });
  }

  const invoice = await prisma.invoice.create({
    data: {
      jobId,
      clientId: job.clientId,
      amount: Number(amount),
      dueDate: new Date(dueDate),
      notes: notes || null,
      invoiceNumber: `INV-${Date.now()}`,
    },
  });
  await prisma.notification.create({
    data: {
      audienceRole: "CLIENT",
      type: "INVOICE_CREATED",
      title: `Invoice ${invoice.invoiceNumber} created`,
      message: `Invoice amount ${invoice.amount} due on ${invoice.dueDate.toISOString().slice(0, 10)}.`,
    },
  });
  await logAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "INVOICE_CREATED",
    entityType: "Invoice",
    entityId: invoice.id,
    payload: { invoiceNumber: invoice.invoiceNumber, amount: invoice.amount },
  });
  console.log(`[EMAIL_STUB] Invoice created notification sent: ${invoice.invoiceNumber}`);
  res.status(201).json(invoice);
});

router.patch("/invoices/:id/payment", requireRole("STAFF", "HOD", "ADMIN"), async (req, res) => {
  const { id } = req.params;
  const { paidAmount } = req.body;
  if (!paidAmount || Number(paidAmount) <= 0) {
    return res.status(400).json({ message: "paidAmount must be greater than zero" });
  }
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return res.status(404).json({ message: "Invoice not found" });

  const nextAmountPaid = invoice.amountPaid + Number(paidAmount || 0);
  let nextStatus = "PARTIALLY_PAID";
  if (nextAmountPaid >= invoice.amount) {
    nextStatus = "PAID";
  } else if (new Date() > invoice.dueDate) {
    nextStatus = "OVERDUE";
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { amountPaid: nextAmountPaid, status: nextStatus },
  });
  await prisma.notification.create({
    data: {
      audienceRole: "ADMIN",
      type: "PAYMENT_UPDATED",
      title: `Payment updated for ${invoice.invoiceNumber}`,
      message: `Paid amount now ${updated.amountPaid} / ${updated.amount}. Status: ${updated.status}.`,
    },
  });
  await logAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "INVOICE_PAYMENT_UPDATED",
    entityType: "Invoice",
    entityId: updated.id,
    payload: { paidAmount: Number(paidAmount), status: updated.status },
  });
  res.json(updated);
});

router.post("/invoices/:id/reminder", requireRole("STAFF", "HOD", "ADMIN"), async (req, res) => {
  const { id } = req.params;
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return res.status(404).json({ message: "Invoice not found" });

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      remindersSent: { increment: 1 },
      lastReminderAt: new Date(),
      status: invoice.status === "PAID" ? "PAID" : "OVERDUE",
    },
  });
  await prisma.notification.create({
    data: {
      audienceRole: "CLIENT",
      type: "PAYMENT_REMINDER",
      title: `Payment reminder for ${invoice.invoiceNumber}`,
      message: `Outstanding payment reminder sent. Reminders sent: ${updated.remindersSent}.`,
    },
  });
  await logAudit({
    actorId: req.user.id,
    actorRole: req.user.role,
    action: "INVOICE_REMINDER_SENT",
    entityType: "Invoice",
    entityId: updated.id,
  });
  console.log(`[EMAIL_STUB] Reminder sent for invoice ${invoice.invoiceNumber}`);
  res.json({
    message: "Manual reminder marked as sent",
    invoice: updated,
  });
});

module.exports = router;
