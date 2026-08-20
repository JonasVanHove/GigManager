import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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
    const adapter = new PrismaPg({
      connectionString: dbUrl,
    });
    
    const client = new PrismaClient({
      adapter,
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

function createFailingPrismaClient(error: unknown): PrismaClient {
  const reason = error instanceof Error ? error.message : String(error);

  const throwUnavailable = () => {
    throw new Error(`Database connection unavailable (Prisma init failed): ${reason}`);
  };

  const nestedThrowingProxy = new Proxy(throwUnavailable, {
    get() {
      throwUnavailable();
    },
    apply() {
      throwUnavailable();
    },
  });

  return new Proxy({} as PrismaClient, {
    get() {
      return nestedThrowingProxy;
    },
  });
}

let prismaClient: PrismaClient;

if (globalForPrisma.prisma) {
  prismaClient = globalForPrisma.prisma;
} else {
  try {
    prismaClient = createPrismaClient();
  } catch (err) {
    console.error("[Prisma] Falling back to unavailable client:", err);
    prismaClient = createFailingPrismaClient(err);
  }
}

export const prisma = prismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
