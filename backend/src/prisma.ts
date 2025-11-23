// Safe import for @prisma/client when using ESM + CommonJS generated client
import pkg from "@prisma/client";

// Support various package shapes; use any to satisfy TypeScript while keeping runtime safe
const PrismaClientCtor: any =
  (pkg as any).PrismaClient ||
  (pkg as any).default?.PrismaClient ||
  (pkg as any).default ||
  pkg;

const prisma = new PrismaClientCtor();

export default prisma;
