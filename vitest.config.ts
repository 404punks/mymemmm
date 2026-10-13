import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30000,
    env: {
      AUTH_SECRET: "test-secret",
      PUBLIC_APP_URL: "http://localhost:3000",
      DATABASE_URL: "postgresql://veil:veil@localhost:5432/veil?schema=public",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
