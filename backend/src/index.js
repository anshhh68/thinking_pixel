const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const clientRoutes = require("./routes/clients");
const jobRoutes = require("./routes/jobs");
const hrRoutes = require("./routes/hr");
const creativeRoutes = require("./routes/creative");
const accountsRoutes = require("./routes/accounts");
const notificationRoutes = require("./routes/notifications");
const leadershipRoutes = require("./routes/leadership");
const auditLogsRoutes = require("./routes/auditLogs");
const chatRoutes = require("./routes/chat");
const jobsheetRoutes = require("./routes/jobsheet");
const { startReminderScheduler } = require("./jobs/reminderScheduler");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "thinking-pixel-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/creative", creativeRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/leadership", leadershipRoutes);
app.use("/api/audit-logs", auditLogsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/jobsheet", jobsheetRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    message: err.message || "Internal server error",
    code: err.code || "INTERNAL_ERROR",
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  startReminderScheduler();
});
