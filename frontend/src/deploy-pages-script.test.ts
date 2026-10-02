import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("deploy:pages script", () => {
  it("does not pass --config (Pages rejects custom wrangler config paths)", () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const script = pkg.scripts["deploy:pages"] ?? "";
    expect(script).toContain("wrangler pages deploy");
    expect(script).not.toMatch(/--config\b/);
  });
});
