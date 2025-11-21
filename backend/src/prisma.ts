import * as Prisma from "@prisma/client";

// Some environments / packaging setups may not expose a named export in a way
// TypeScript always recognizes. Use a safe-any access to ensure the runtime
// PrismaClient is constructed while keeping the types working at compile time.
const PrismaClientCtor: any =
  (Prisma as any).PrismaClient ||
  (Prisma as any).default?.PrismaClient ||
  (Prisma as any).default;
const prisma = new PrismaClientCtor();

export default prisma;
