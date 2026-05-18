const jwt = require("jsonwebtoken");
const { hasCap } = require("../config/permissions");

const authGuard = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (_err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return next();
};

// Capability-based guard — preferred over requireRole. Resolves the user's
// role to its capability set via config/permissions.js.
const requireCap = (cap) => (req, res, next) => {
  if (!req.user || !hasCap(req.user.role, cap)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return next();
};

module.exports = {
  authGuard,
  requireRole,
  requireCap,
};
