import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("vitest runs in packages", () => {
    expect(1 + 1).toBe(2);
  });
});
