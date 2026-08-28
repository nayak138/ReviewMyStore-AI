import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  root: here,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(here, "src") } },
  build: { outDir: path.resolve(here, "dist"), emptyOutDir: true },
  server: { port: Number(process.env.PORT || 25505), host: "0.0.0.0", strictPort: false, allowedHosts: true },
  preview: { port: Number(process.env.PORT || 25505), host: "0.0.0.0", allowedHosts: true },
});