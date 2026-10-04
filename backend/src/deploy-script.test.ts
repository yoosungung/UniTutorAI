import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import pkg from "../package.json";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("backend deploy script", () => {
  it("applies D1 migrations remotely before wrangler deploy", () => {
    const script = pkg.scripts.deploy ?? "";
    expect(script).toMatch(/d1 migrations apply\s+DB\s+--remote/);
    expect(script).toMatch(/wrangler deploy --config \.\/wrangler\.jsonc/);
    const applyAt = script.search(/d1 migrations apply/);
    const deployAt = script.search(/wrangler deploy/);
    expect(applyAt).toBeGreaterThan(-1);
    expect(deployAt).toBeGreaterThan(applyAt);
  });

  it("binds a real D1 database_id (not placeholder)", () => {
    const wrangler = readFileSync(resolve(root, "wrangler.jsonc"), "utf8");
    expect(wrangler).toMatch(/"database_name":\s*"unitutor"/);
    expect(wrangler).toMatch(
      /"database_id":\s*"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"/,
    );
    expect(wrangler).not.toMatch(
      /"database_id":\s*"00000000-0000-0000-0000-000000000001"/,
    );
    expect(wrangler).toMatch(/"FRONTEND_ORIGIN":\s*"https:\/\/unitutor\.askwho\.net"/);
  });
});
