console.log("LOADING VITE CONFIG web/vite.config.ts");
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

console.log("LOADING VITE CONFIG web/vite.config.ts");

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ["donny-suborbicular-doxologically.ngrok-free.dev"],
  },
});
