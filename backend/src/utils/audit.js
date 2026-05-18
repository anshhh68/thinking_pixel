const prisma = require("../lib/prisma");



async function logAudit({ actorId, actorRole, action, entityType, entityId, payload }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actorId || null,
        actorRole: actorRole || null,
        action,
        entityType,
        entityId: entityId || null,
        payload: payload || null,
      },
    });
  } catch (err) {
    console.error("AUDIT_LOG_FAILED", err.message);
  }
}

module.exports = {
  logAudit,
};
