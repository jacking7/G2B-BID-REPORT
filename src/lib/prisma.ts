import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "node:path";

const connectionString = process.env.DATABASE_URL ?? "file:./dev.db";
const sqlitePath = connectionString.replace(/^file:/, "");
const dbPath = path.isAbsolute(sqlitePath)
  ? sqlitePath
  : path.join(process.cwd(), "prisma", path.basename(sqlitePath));

const adapter = new PrismaBetterSqlite3({ url: dbPath });

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
