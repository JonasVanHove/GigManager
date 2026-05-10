import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const isDev = process.env.NODE_ENV === "development";
  
  // Verify DATABASE_URL is set
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    const msg = "Missing DATABASE_URL environment variable";
    console.error("[Prisma]", msg);
    throw new Error(msg);
  }

  try {
    const client = new PrismaClient({
      log: isDev ? ["query", "warn", "error"] : ["error"],
      errorFormat: "pretty",
    });
    
    if (isDev) {
      console.log("[Prisma] Client initialized successfully");
    }
    
    return client;
  } catch (err) {
    console.error("[Prisma] Failed to create client:", err);
    throw err;
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
