import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const deployYml = readFileSync(
  resolve(root, ".github/workflows/deploy.yml"),
  "utf8",
);

describe("deploy.yml Pages bootstrap", () => {
  it("creates Pages project when missing (CI non-interactive 8000007)", () => {
    expect(deployYml).toMatch(/pages project create\s+unitutor/);
    expect(deployYml).toMatch(/--production-branch=main/);
    // Ensure step must run before deploy:pages
    const createAt = deployYml.search(/pages project create\s+unitutor/);
    const deployAt = deployYml.search(/npm run deploy:pages/);
    expect(createAt).toBeGreaterThan(-1);
    expect(deployAt).toBeGreaterThan(createAt);
  });
});
