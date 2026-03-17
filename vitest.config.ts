import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.spec.ts"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
