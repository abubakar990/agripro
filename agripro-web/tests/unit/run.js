/* global process */
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makeT, report } from './harness.js';

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here).filter((f) => f.endsWith('.test.js')).sort();

for (const file of files) {
  console.log(`\n--- ${file.replace('.test.js', '')} ---`);
  const mod = await import(pathToFileURL(join(here, file)).href);
  if (typeof mod.default !== 'function') {
    console.error(`  ❌ ${file} does not default-export a test function`);
    process.exitCode = 1;
    continue;
  }
  await mod.default(makeT(file.replace('.test.js', '')));
}

report();
