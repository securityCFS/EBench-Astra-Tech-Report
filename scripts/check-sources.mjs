import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

let checked = 0;
function check(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) check(file);
    else if (/\.(?:js|mjs)$/.test(entry.name)) {
      execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
      checked++;
    }
  }
}
for (const dir of ['src', 'scripts', 'integrations']) check(dir);
console.log(`Syntax check: ${checked} source files.`);
