const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function startReminderScheduler() {
  // Every day at 09:00 server time.
  cron.schedule("0 9 * * *", async () => {
    try {
      const now = new Date();
      const overdueInvoices = await prisma.invoice.findMany({
        where: {
          status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
          dueDate: { lt: now },
        },
      });

      for (const invoice of overdueInvoices) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: "OVERDUE",
            remindersSent: { increment: 1 },
            lastReminderAt: now,
          },
        });

        await prisma.notification.create({
          data: {
            audienceRole: "CLIENT",
            type: "AUTO_PAYMENT_REMINDER",
            title: `Automatic overdue reminder: ${invoice.invoiceNumber}`,
            message: `Invoice ${invoice.invoiceNumber} is overdue. Reminder has been automatically sent.`,
          },
        });

        console.log(`[EMAIL_STUB] Auto reminder sent for invoice ${invoice.invoiceNumber}`);
      }

      if (overdueInvoices.length > 0) {
        console.log(`Scheduler processed ${overdueInvoices.length} overdue invoices.`);
      }
    } catch (err) {
      console.error("REMINDER_SCHEDULER_FAILED", err);
    }
  });
}

module.exports = {
  startReminderScheduler,
};
