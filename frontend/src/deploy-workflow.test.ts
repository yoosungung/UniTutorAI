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

  it("attaches and smokes Pages custom domain unitutor.askwho.net", () => {
    expect(deployYml).toMatch(/DOMAIN=unitutor\.askwho\.net/);
    expect(deployYml).toMatch(/https:\/\/unitutor\.askwho\.net\//);
    expect(deployYml).not.toMatch(/DOMAIN=tutor\.askwho\.net/);
    expect(deployYml).not.toMatch(/https:\/\/tutor\.askwho\.net\//);
  });

  it("soft-skips zone DNS ensure when list returns 403 (Dashboard path)", () => {
    expect(deployYml).toMatch(/dns-list-soft-skip/);
    expect(deployYml).toMatch(/Skipping DNS ensure/);
  });

  it("documents D1 apply-before-deploy via backend npm run deploy", () => {
    expect(deployYml).toMatch(/D1 migrations:\s*backend `npm run deploy` applies DB --remote before wrangler deploy/);
    expect(deployYml).toMatch(/working-directory: backend[\s\S]*npm run deploy/);
  });
});
