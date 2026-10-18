import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LIMIT_BYTES = 10 * 1024 * 1024;

function directoryBytes(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    total += entry.isDirectory() ? directoryBytes(path) : statSync(path).size;
  }
  return total;
}

const bytes = directoryBytes('dist');
const mebibytes = (bytes / (1024 * 1024)).toFixed(2);
console.log(`dist size: ${bytes} bytes (${mebibytes} MiB). Limit: ${LIMIT_BYTES} bytes (10 MiB).`);
if (bytes > LIMIT_BYTES) {
  console.error('Built dist is over the 10 MB budget.');
  process.exit(1);
}
