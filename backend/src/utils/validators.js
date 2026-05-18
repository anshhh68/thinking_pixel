/**
 * Shared input validators for API routes.
 * Keeps validation logic DRY and consistent across endpoints.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Must match the Role enum in schema.prisma
const VALID_ROLES = [
  "CLIENT", "STAFF", "HOD", "ADMIN",
  "FINANCE_MANAGER",
  "ACCOUNT_DIRECTOR", "ACCOUNT_MANAGER", "ACCOUNT_EXECUTIVE",
  "STRATEGY_HEAD", "CONTENT_STRATEGIST",
  "CREATIVE_DIRECTOR", "ART_DIRECTOR", "SENIOR_GRAPHIC_DESIGNER",
  "GRAPHIC_DESIGNER", "JUNIOR_GRAPHIC_DESIGNER", "ILLUSTRATOR",
  "VIDEO_EDITOR",
];

/**
 * Validate email format.
 * @param {string} email
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return { valid: false, reason: "Email is required" };
  }
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) {
    return { valid: false, reason: "Invalid email format" };
  }
  return { valid: true };
}

/**
 * Validate password strength.
 * Rules: ≥ 8 chars, at least one letter and one number.
 * @param {string} password
 * @returns {{ valid: boolean, reason?: string }}
 */
function validatePassword(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, reason: "Password is required" };
  }
  if (password.length < 8) {
    return { valid: false, reason: "Password must be at least 8 characters" };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one number" };
  }
  return { valid: true };
}

/**
 * Validate role against the Prisma Role enum.
 * @param {string} role
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateRole(role) {
  if (!role || typeof role !== "string") {
    return { valid: false, reason: "Role is required" };
  }
  if (!VALID_ROLES.includes(role)) {
    return { valid: false, reason: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` };
  }
  return { valid: true };
}

module.exports = { validateEmail, validatePassword, validateRole, VALID_ROLES };
