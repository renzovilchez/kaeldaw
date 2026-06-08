import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { name: "@kaeldaw/mixer", passWithNoTests: true, environment: "jsdom" },
});
