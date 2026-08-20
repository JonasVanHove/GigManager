import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // the main entry for your schema
  schema: "prisma/schema.prisma",
  // where migrations should be generated
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // The database URL
  datasource: {
    // Use DIRECT_URL for CLI operations (migrations, etc.)
    url: env("DIRECT_URL"),
  },
});
