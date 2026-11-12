import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../dist/', import.meta.url);
let count = 0;
async function scan(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      await scan(path);
    } else if (entry.name.endsWith('.map')) {
      throw new Error('Release blocked: source map artifact detected');
    } else if (/\.(?:js|css)$/.test(entry.name)) {
      const content = await readFile(path, 'utf8');
      if (/sourceMappingURL\s*=/.test(content)) {
        throw new Error('Release blocked: sourceMappingURL reference detected');
      }
      count++;
    }
  }
}
await scan(root.pathname);
console.log('Release source-map guard passed:', count, 'JS/CSS assets checked');
