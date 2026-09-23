import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

const chromiumPath = process.env.CHROMIUM_PATH ?? "/repl/tools/bin/chromium";

export default defineConfig({
  plugins: [react(), tailwindcss({ optimize: false })],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  test: {
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        launchOptions: {
          args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
          ...(fs.existsSync(chromiumPath) ? { executablePath: chromiumPath } : {}),
        },
      }),
      instances: [
        { browser: "chromium", name: "desktop", viewport: { width: 1440, height: 1000 } },
        { browser: "chromium", name: "tablet", viewport: { width: 900, height: 1000 } },
        { browser: "chromium", name: "mobile", viewport: { width: 390, height: 844 } },
      ],
    },
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/pages/SocialMedia.viewport.test.tsx",
      "src/auth/SessionExpiryWatcher.browser.test.tsx",
    ],
    css: true,
  },
});