import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
