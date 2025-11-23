import "dotenv/config";
import pkg from "@prisma/client";
const PrismaClientCtor = pkg.PrismaClient ||
    pkg.default?.PrismaClient ||
    pkg.default ||
    pkg;
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
// Ensure DATABASE_URL is available
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Set it in backend/.env or your environment before starting the server.");
}
// Create a pg Pool and PrismaPg adapter
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
// Initialize Prisma Client with the adapter (cast to any to avoid typing mismatches)
const prisma = new PrismaClientCtor({ adapter });
export default prisma;
//# sourceMappingURL=prisma.js.map