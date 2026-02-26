/// <reference types="vitest" />

import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), legacy()],
  server: {
  host: true,
  port: 8100,
  strictPort: true,
  allowedHosts: [
    ".ngrok-free.dev",  // allows all ngrok free domains
  ],
},
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
  },
});