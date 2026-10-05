// Lint only staged TS/TSX files; no --fix, no full-repo lint.
import { execSync } from 'node:child_process';
const files = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8' }).split('\n').filter((f) => /\.(ts|tsx)$/.test(f));
if (files.length === 0) process.exit(0);
try { execSync(`npx eslint --max-warnings=0 ${files.map((f) => JSON.stringify(f)).join(' ')}`, { stdio: 'inherit' }); }
catch { process.exit(1); }
