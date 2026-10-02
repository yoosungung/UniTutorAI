import { describe, expect, it } from "vitest";
import pkg from "../package.json";

describe("deploy:pages script", () => {
  it("does not pass --config (Pages rejects custom wrangler config paths)", () => {
    const script = pkg.scripts["deploy:pages"] ?? "";
    expect(script).toContain("wrangler pages deploy");
    expect(script).not.toMatch(/--config\b/);
  });
});
