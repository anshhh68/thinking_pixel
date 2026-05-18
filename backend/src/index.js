const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

// ─── Startup Validation ─────────────────────────────────────────────────────

// Fail fast if JWT_SECRET is not configured
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is required.");
  process.exit(1);
}

// In production, enforce a strong JWT_SECRET (≥ 32 chars)
if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET.length < 32) {
  console.error("FATAL: JWT_SECRET must be at least 32 characters in production.");
  console.error("       Generate one: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"");
  process.exit(1);
}

// Warn in development if JWT_SECRET looks weak
if (process.env.NODE_ENV !== "production" && process.env.JWT_SECRET.length < 16) {
  console.warn("⚠  JWT_SECRET is very short — use a stronger secret, even in dev.");
}

// ─── Route Imports ──────────────────────────────────────────────────────────

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
const inviteRoutes = require("./routes/invites");
const { startReminderScheduler } = require("./jobs/reminderScheduler");

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Security Headers ──────────────────────────────────────────────────────

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// ─── CORS — restrict to frontend origin in production ──────────────────────

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:3000",
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));

// ─── Rate Limiters ─────────────────────────────────────────────────────────

// General API rate limit — 100 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});
app.use("/api", generalLimiter);

// Login endpoint — 15 attempts per 15 min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
});
app.use("/api/auth/login", loginLimiter);

// Invite creation — 10 per hour per IP (prevent invite spam)
const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many invites sent. Please try again later." },
});
app.use("/api/invites", inviteLimiter);

// ─── Static Files ──────────────────────────────────────────────────────────

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ─── Health Check ──────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "thinking-pixel-backend" });
});

// ─── API Routes ────────────────────────────────────────────────────────────

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
app.use("/api/invites", inviteRoutes);

// ─── Global Error Handler ──────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    message: err.message || "Internal server error",
    code: err.code || "INTERNAL_ERROR",
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  startReminderScheduler();
});
