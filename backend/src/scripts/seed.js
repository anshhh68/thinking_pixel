/**
 * Production seed — creates the initial admin user.
 * Safe to run multiple times (idempotent).
 *
 * ADMIN_EMAIL and ADMIN_PASS must be set as environment variables.
 *
 * Usage:
 *   ADMIN_EMAIL=you@company.com ADMIN_PASS=StrongP@ss1 node src/scripts/seed.js
 */
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { validateEmail, validatePassword } = require("../utils/validators");

// ── Require credentials from environment — no hardcoded defaults ────────────

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASS = process.env.ADMIN_PASS;
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";

if (!ADMIN_EMAIL || !ADMIN_PASS) {
  console.error("FATAL: ADMIN_EMAIL and ADMIN_PASS environment variables are required.");
  console.error("  Example: ADMIN_EMAIL=you@co.com ADMIN_PASS=Str0ngP@ss node src/scripts/seed.js");
  process.exit(1);
}

const emailCheck = validateEmail(ADMIN_EMAIL);
if (!emailCheck.valid) {
  console.error(`FATAL: ${emailCheck.reason}`);
  process.exit(1);
}

const pwCheck = validatePassword(ADMIN_PASS);
if (!pwCheck.valid) {
  console.error(`FATAL: ${pwCheck.reason}`);
  process.exit(1);
}

// ── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding admin user...");

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`✓ Admin user already exists: ${ADMIN_EMAIL} (id: ${existing.id})`);
    if (existing.role !== "ADMIN") {
      await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
      console.log("  → Role updated to ADMIN");
    }
    return;
  }

  const hash = await bcrypt.hash(ADMIN_PASS, 10);
  const user = await prisma.user.create({
    data: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash: hash,
      role: "ADMIN",
    },
  });

  await prisma.employee.create({
    data: {
      userId: user.id,
      department: "Management",
      joinDate: new Date(),
    },
  });

  console.log(`✓ Admin user created: ${ADMIN_EMAIL} (id: ${user.id})`);
  console.log("✓ Employee record created");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
