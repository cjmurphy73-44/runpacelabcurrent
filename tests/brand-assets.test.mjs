import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const asset = (name) => resolve(root, 'public', 'assets', name);
const read = (path) => readFileSync(resolve(root, path), 'utf8');

describe('TrainPaceLab public brand references', () => {
  it('keeps every currently referenced manifest icon on disk', () => {
    const manifest = JSON.parse(read('public/manifest.json'));
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    for (const icon of manifest.icons) {
      expect(icon.src.startsWith('/assets/')).toBe(true);
      expect(existsSync(resolve(root, 'public', icon.src.slice(1)))).toBe(true);
    }
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });
  it('keeps the favicon, Apple icon and social preview references resolvable', () => {
    const html = read('index.html');
    for (const url of ['/assets/trainpacelab-icon.svg', '/assets/logo-300x300.png']) {
      expect(html).toContain(url);
      expect(existsSync(resolve(root, 'public', url.slice(1)))).toBe(true);
    }
    const og = html.match(/<meta property="og:image" content="https:\/\/trainpacelab\.com(\/assets\/[^"]+)"/);
    const twitter = html.match(/<meta name="twitter:image" content="https:\/\/trainpacelab\.com(\/assets\/[^"]+)"/);
    expect(og?.[1]).toBeTruthy();
    expect(twitter?.[1]).toBe(og?.[1]);
    expect(existsSync(resolve(root, 'public', og[1].slice(1)))).toBe(true);
  });
  it('retains the original track and signal icon and inset maskable variant', () => {
    const original = read('public/assets/trainpacelab-icon.svg');
    const maskable = read('public/assets/trainpacelab-maskable.svg');
    expect(original).toContain('viewBox="0 0 512 512"');
    expect(original).toContain('#D4F36B');
    expect(maskable).toContain('transform="translate(86 86) scale(.6640625)"');
    expect(maskable).toContain('#D4F36B');
    expect(existsSync(asset('trainpacelab-social.svg'))).toBe(true);
  });
  it('does not advertise a raster social card that has not been committed', () => {
    const html = read('index.html');
    const raster = asset('trainpacelab-social-1200x630.png');
    if (!existsSync(raster)) {
      expect(html).not.toContain('/assets/trainpacelab-social-1200x630.png');
    }
  });
});
