import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@kaeldaw/audio-engine": resolve(__dirname, "../../packages/audio-engine/src"),
      "@kaeldaw/instruments": resolve(__dirname, "../../packages/instruments/src"),
      "@kaeldaw/shared": resolve(__dirname, "../../packages/shared/src"),
      "@kaeldaw/project": resolve(__dirname, "../../packages/project/src"),
      "@kaeldaw/ui-controls": resolve(__dirname, "../../packages/ui-controls/src"),
      "@kaeldaw/ui-kit": resolve(__dirname, "../../packages/ui-kit/src"),
      "@kaeldaw/sequencer": resolve(__dirname, "../../packages/sequencer/src"),
      "@kaeldaw/mixer": resolve(__dirname, "../../packages/mixer/src"),
    },
  },
  test: { name: "@kaeldaw/studio", passWithNoTests: true, environment: "jsdom" },
});
