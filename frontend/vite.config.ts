import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The Django backend (port 8010 by default) serves /api and /media; proxying keeps everything same-origin.
const backend = process.env.VITE_BACKEND_URL ?? "http://localhost:8010";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": backend, "/media": backend },
  },
});
