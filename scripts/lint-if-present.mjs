import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
if (!pkg.scripts?.lint) {
  console.log('No lint script; skipping');
  process.exit(0);
}

const result = spawnSync('npm', ['run', 'lint'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
