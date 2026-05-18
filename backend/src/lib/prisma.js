const { PrismaClient } = require("@prisma/client");

// Singleton PrismaClient — prevents connection pool exhaustion in production.
// In dev, Next.js / nodemon hot-reloading can create multiple instances;
// caching on `global` avoids that.

/** @type {PrismaClient} */
const prisma = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

module.exports = prisma;
