const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authGuard, requireRole } = require("../middleware/auth");
const { getPagination, paginatedResponse } = require("../utils/pagination");

const prisma = new PrismaClient();
const router = express.Router();

router.use(authGuard);
router.use(requireRole("ADMIN", "HOD"));

router.get("/", async (req, res) => {
  const { page, pageSize, skip, take } = getPagination(req.query);
  const action = req.query.action;
  const entityType = req.query.entityType;

  const where = {
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json(paginatedResponse({ items: logs, total, page, pageSize }));
});

module.exports = router;
