import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: ["warn", "error"],
});

// Graceful shutdown support for database connections
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
