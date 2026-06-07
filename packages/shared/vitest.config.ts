import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { name: "@kaeldaw/shared", passWithNoTests: true, environment: "jsdom" },
});
