import * as Prisma from "@prisma/client";
// Some environments / packaging setups may not expose a named export in a way
// TypeScript always recognizes. Use a safe-any access to ensure the runtime
// PrismaClient is constructed while keeping the types working at compile time.
const PrismaClientCtor = Prisma.PrismaClient ||
    Prisma.default?.PrismaClient ||
    Prisma.default;
const prisma = new PrismaClientCtor();
export default prisma;
//# sourceMappingURL=prisma.js.map