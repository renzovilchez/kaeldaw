import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { name: "@kaeldaw/ui-controls", passWithNoTests: true, environment: "jsdom" },
});
