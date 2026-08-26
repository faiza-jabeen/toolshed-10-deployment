import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * A budget nobody enforces is a wish. This runs in CI after `npm run build`
 * and fails the job if a dependency quietly doubles the bundle.
 */
const BUDGETS = { '.js': 90, '.css': 12 };   // KB, gzipped, per file

const dir = path.resolve('dist/assets');
if (!fs.existsSync(dir)) {
  console.error('No dist/assets — run `npm run build` first.');
  process.exit(1);
}

let failed = false;
for (const file of fs.readdirSync(dir)) {
  const ext = path.extname(file);
  const budget = BUDGETS[ext];
  if (!budget) continue;

  const gzipped = zlib.gzipSync(fs.readFileSync(path.join(dir, file))).length / 1024;
  const over = gzipped > budget;
  failed ||= over;
  console.log(`${over ? 'OVER ' : 'ok   '} ${file.padEnd(34)} ${gzipped.toFixed(1)} KB / ${budget} KB`);
}

process.exit(failed ? 1 : 0);
