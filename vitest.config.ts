import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/unit/setup.ts"],
    globals: true,
    restoreMocks: true,
  },
  resolve: {
    alias: [
      { find: /^@\//, replacement: fileURLToPath(new URL("./src/", import.meta.url)) },
      {
        find: "server-only",
        replacement: fileURLToPath(new URL("./tests/unit/stubs/server-only.ts", import.meta.url)),
      },
    ],
  },
});
