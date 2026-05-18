const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { authGuard, requireRole } = require("../middleware/auth");
const { sendInviteEmail } = require("../utils/email");
const { logAudit } = require("../utils/audit");
const { validateEmail, validatePassword, validateRole } = require("../utils/validators");

const router = express.Router();

const INVITE_EXPIRY_HOURS = 72;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ─── POST /api/invites — Create a new invite (ADMIN only) ────────────
router.post("/", authGuard, requireRole("ADMIN"), async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ message: "Email and role are required" });
    }

    // Validate email format
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ message: emailCheck.reason });
    }

    // Validate role against the enum
    const roleCheck = validateRole(role);
    if (!roleCheck.valid) {
      return res.status(400).json({ message: roleCheck.reason });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ message: "A user with this email already exists" });
    }

    // Revoke any pending invites for this email
    await prisma.invite.updateMany({
      where: { email: normalizedEmail, status: "PENDING" },
      data: { status: "REVOKED" },
    });

    // Create new invite
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);
    const invite = await prisma.invite.create({
      data: { email: normalizedEmail, role, invitedBy: req.user.id, expiresAt },
    });

    // Build invite URL and send email
    const inviteUrl = `${FRONTEND_URL}/invite/${invite.token}`;
    const emailSent = await sendInviteEmail({
      to: normalizedEmail,
      inviterName: req.user.name,
      role,
      inviteUrl,
      expiresIn: `${INVITE_EXPIRY_HOURS} hours`,
    });

    // Audit log
    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "CREATE_INVITE",
      entityType: "Invite",
      entityId: invite.id,
      payload: { email: normalizedEmail, role, emailSent },
    });

    return res.status(201).json({ ...invite, emailSent });
  } catch (err) {
    console.error("Create invite error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/invites — List all invites (ADMIN only) ────────────────
router.get("/", authGuard, requireRole("ADMIN"), async (req, res) => {
  try {
    const invites = await prisma.invite.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Fetch inviter names
    const inviterIds = [...new Set(invites.map((i) => i.invitedBy))];
    const inviters = await prisma.user.findMany({
      where: { id: { in: inviterIds } },
      select: { id: true, name: true },
    });
    const inviterMap = Object.fromEntries(inviters.map((u) => [u.id, u.name]));

    const enriched = invites.map((inv) => ({
      ...inv,
      inviterName: inviterMap[inv.invitedBy] || "Unknown",
      isExpired: inv.status === "PENDING" && new Date(inv.expiresAt) < new Date(),
    }));

    return res.json(enriched);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/invites/:id — Revoke a pending invite (ADMIN only) ──
router.delete("/:id", authGuard, requireRole("ADMIN"), async (req, res) => {
  try {
    const invite = await prisma.invite.findUnique({ where: { id: req.params.id } });
    if (!invite) return res.status(404).json({ message: "Invite not found" });
    if (invite.status !== "PENDING") {
      return res.status(400).json({ message: "Only pending invites can be revoked" });
    }

    await prisma.invite.update({
      where: { id: req.params.id },
      data: { status: "REVOKED" },
    });

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "REVOKE_INVITE",
      entityType: "Invite",
      entityId: invite.id,
      payload: { email: invite.email },
    });

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/invites/:id/resend — Resend invite email (ADMIN only) ─
router.post("/:id/resend", authGuard, requireRole("ADMIN"), async (req, res) => {
  try {
    const invite = await prisma.invite.findUnique({ where: { id: req.params.id } });
    if (!invite) return res.status(404).json({ message: "Invite not found" });
    if (invite.status !== "PENDING") {
      return res.status(400).json({ message: "Only pending invites can be resent" });
    }
    if (new Date(invite.expiresAt) < new Date()) {
      return res.status(400).json({ message: "Invite has expired — create a new one instead" });
    }

    const inviteUrl = `${FRONTEND_URL}/invite/${invite.token}`;
    const emailSent = await sendInviteEmail({
      to: invite.email,
      inviterName: req.user.name,
      role: invite.role,
      inviteUrl,
      expiresIn: `${Math.round((new Date(invite.expiresAt) - Date.now()) / 3600000)} hours`,
    });

    return res.json({ emailSent });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/invites/validate/:token — Validate invite (Public) ─────
router.get("/validate/:token", async (req, res) => {
  try {
    const invite = await prisma.invite.findUnique({
      where: { token: req.params.token },
    });

    if (!invite) {
      return res.status(404).json({ message: "Invite not found", code: "NOT_FOUND" });
    }
    if (invite.status === "ACCEPTED") {
      return res.status(410).json({ message: "This invite has already been used", code: "ALREADY_USED" });
    }
    if (invite.status === "REVOKED") {
      return res.status(410).json({ message: "This invite has been revoked", code: "REVOKED" });
    }
    if (new Date(invite.expiresAt) < new Date()) {
      return res.status(410).json({ message: "This invite has expired", code: "EXPIRED" });
    }
    if (invite.status !== "PENDING") {
      return res.status(400).json({ message: "Invalid invite", code: "INVALID" });
    }

    // Fetch inviter name
    const inviter = await prisma.user.findUnique({
      where: { id: invite.invitedBy },
      select: { name: true },
    });

    return res.json({
      email: invite.email,
      role: invite.role,
      inviterName: inviter?.name || "Thinking Pixel",
      expiresAt: invite.expiresAt,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/invites/accept/:token — Accept invite & create user ───
router.post("/accept/:token", async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ message: "Name and password are required" });
    }
    // Validate password strength
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return res.status(400).json({ message: pwCheck.reason });
    }

    const invite = await prisma.invite.findUnique({
      where: { token: req.params.token },
    });

    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }
    if (invite.status !== "PENDING") {
      return res.status(410).json({ message: "This invite is no longer valid" });
    }
    if (new Date(invite.expiresAt) < new Date()) {
      // Mark as expired
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
      return res.status(410).json({ message: "This invite has expired" });
    }

    // Check if email already taken (race condition guard)
    const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
    if (existingUser) {
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });
      return res.status(409).json({ message: "An account with this email already exists. Please sign in." });
    }

    // Create user
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: invite.email,
        passwordHash,
        role: invite.role,
      },
    });

    // Create Employee record for internal roles
    if (invite.role !== "CLIENT") {
      const deptMap = {
        FINANCE_MANAGER: "Account & Finance",
        ACCOUNT_DIRECTOR: "Account Management",
        ACCOUNT_MANAGER: "Account Management",
        ACCOUNT_EXECUTIVE: "Account Management",
        STRATEGY_HEAD: "Content & Strategy",
        CONTENT_STRATEGIST: "Content & Strategy",
        CREATIVE_DIRECTOR: "Creative",
        ART_DIRECTOR: "Creative",
        SENIOR_GRAPHIC_DESIGNER: "Creative",
        GRAPHIC_DESIGNER: "Creative",
        JUNIOR_GRAPHIC_DESIGNER: "Creative",
        ILLUSTRATOR: "Creative",
        VIDEO_EDITOR: "Motion Graphics / Video Editing",
        ADMIN: "Operations",
        HOD: "Management",
        STAFF: "General",
      };
      await prisma.employee.create({
        data: {
          userId: user.id,
          department: deptMap[invite.role] || "General",
          joinDate: new Date(),
        },
      });
    }

    // Mark invite as accepted
    await prisma.invite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    // Audit log
    await logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "ACCEPT_INVITE",
      entityType: "Invite",
      entityId: invite.id,
      payload: { email: invite.email, role: invite.role },
    });

    // Auto-login: generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Accept invite error:", err);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
