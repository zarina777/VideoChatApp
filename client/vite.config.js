import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      events: "events/",
      util: "util/",
      stream: "stream-browserify",
    },
  },
  define: {
    global: "window",
    process: { env: {} }, // Define process for browser
  },
});
