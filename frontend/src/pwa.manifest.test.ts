import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(__dirname, "..");

describe("installable PWA shell", () => {
  it("ships webmanifest with Chromium install fields", () => {
    const path = resolve(frontendRoot, "public/manifest.webmanifest");
    expect(existsSync(path)).toBe(true);
    const manifest = JSON.parse(readFileSync(path, "utf8")) as {
      name?: string;
      short_name?: string;
      start_url?: string;
      display?: string;
      icons?: Array<{ src: string; sizes: string; type: string }>;
    };
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons?.length).toBeGreaterThanOrEqual(2);
    const sizes = new Set(manifest.icons?.map((i) => i.sizes));
    expect(sizes.has("192x192")).toBe(true);
    expect(sizes.has("512x512")).toBe(true);
    for (const icon of manifest.icons ?? []) {
      const iconPath = resolve(frontendRoot, "public", icon.src.replace(/^\//, ""));
      expect(existsSync(iconPath), icon.src).toBe(true);
    }
  });

  it("links manifest and icons from index.html", () => {
    const html = readFileSync(resolve(frontendRoot, "index.html"), "utf8");
    expect(html).toMatch(/rel=["']manifest["']/);
    expect(html).toMatch(/href=["']\/manifest\.webmanifest["']/);
    expect(html).toMatch(/rel=["']apple-touch-icon["']/);
  });

  it("keeps CardFaded review SW at public/sw.js (notify-only)", () => {
    const sw = readFileSync(resolve(frontendRoot, "public/sw.js"), "utf8");
    expect(sw).toContain("notificationclick");
    expect(sw).toContain("skipWaiting");
    // SW must remain notify-only — no offline cache shell
    expect(sw).not.toMatch(/caches\.(open|match)/);
  });
});
