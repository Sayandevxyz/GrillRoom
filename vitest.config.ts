import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 45,
        functions: 70,
        branches: 55,
        statements: 45,
      },
      include: ["lib/**/*.ts", "components/**/*.tsx", "app/api/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "tests/**", "scripts/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
