import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { name: "@kaeldaw/sequencer", passWithNoTests: true, environment: "jsdom" },
});
