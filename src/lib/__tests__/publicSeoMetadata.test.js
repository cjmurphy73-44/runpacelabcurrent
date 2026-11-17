import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

function meta(attribute, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tag = html.match(new RegExp(`<meta\\s+\\b${attribute}="${escaped}"[^>]*>`, "i"))?.[0];
  return tag?.match(/content="([^"]*)"/i)?.[1] ?? null;
}

describe("public landing SEO metadata", () => {
  it("has one canonical URL matching Open Graph without a staging host", () => {
    const links = [...html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"\s*\/>/g)];
    expect(links).toHaveLength(1);
    expect(links[0][1]).toBe("https://trainpacelab.com/");
    expect(meta("property", "og:url")).toBe(links[0][1]);
    expect(html).not.toMatch(/base44\.app|vercel\.app/);
  });

  it("supplies descriptive, non-empty title and social metadata", () => {
    expect(html.match(/<title>([^<]+)<\/title>/)?.[1]).toMatch(/TrainPaceLab/);
    for (const [attribute, key] of [
      ["name", "description"], ["property", "og:title"], ["property", "og:description"],
      ["name", "twitter:title"], ["name", "twitter:description"],
    ]) {
      expect(meta(attribute, key), key).toBeTruthy();
      expect(meta(attribute, key).length).toBeGreaterThan(30);
    }
    expect(meta("name", "twitter:card")).toBe("summary");
  });

  it("does not assert universal provider compatibility or guaranteed physiological accuracy", () => {
    const publicClaims = [
      meta("name", "description"), meta("property", "og:description"), meta("name", "twitter:description"),
    ].join(" ");
    expect(publicClaims).toMatch(/provider|connection/i);
    expect(publicClaims).not.toMatch(/all wearables|every device|guaranteed|clinically proven|fully automated|real-time sync/i);
  });
});
