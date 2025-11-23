// Safe import for @prisma/client when using ESM + CommonJS generated client
import pkg from "@prisma/client";
// Support various package shapes; use any to satisfy TypeScript while keeping runtime safe
const PrismaClientCtor = pkg.PrismaClient ||
    pkg.default?.PrismaClient ||
    pkg.default ||
    pkg;
const prisma = new PrismaClientCtor();
export default prisma;
//# sourceMappingURL=prisma.js.map