import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
const root = new URL('../dist/', import.meta.url).pathname;
let checked = 0;
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, e.name);
    if (e.isDirectory()) await walk(path);
    else if (e.name.endsWith('.map')) throw new Error('Source map found in release output');
    else if (/\.(js|css)$/.test(e.name)) {
      if (/sourceMappingURL\s*=/.test(await readFile(path, 'utf8'))) throw new Error('Source map reference found');
      checked++;
    }
  }
}
await walk(root);
console.log('Source map guard passed:', checked, 'assets checked');
