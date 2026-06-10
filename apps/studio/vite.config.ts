import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@kaeldaw/sequencer": path.resolve(__dirname, "../../packages/sequencer/src"),
      "@kaeldaw/mixer": path.resolve(__dirname, "../../packages/mixer/src"),
      "@kaeldaw/instruments": path.resolve(__dirname, "../../packages/instruments/src"),
    },
  },
});
