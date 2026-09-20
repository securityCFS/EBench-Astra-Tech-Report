import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const destination = path.resolve('.generated/public');
fs.mkdirSync(destination, { recursive: true });
// Copy only versioned research assets; never publish local PDFs or outputs.
const files = execFileSync('git', ['ls-files', '-z', 'dist/data', 'dist/media', 'dist/vendor'], {
  encoding: 'utf8',
})
  .split('\0')
  .filter(Boolean);
for (const file of files) {
  if (file.endsWith('.pdf')) continue;
  const target = path.join(destination, path.relative('dist', file));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const stat = fs.statSync(file);
  const descriptor = fs.openSync(file, 'r'),
    prefix = Buffer.alloc(128);
  fs.readSync(descriptor, prefix, 0, prefix.length, 0);
  fs.closeSync(descriptor);
  if (prefix.toString().startsWith('version https://git-lfs.github.com/spec/v1'))
    throw Error(`Missing Git LFS asset: ${file}`);
  if (
    fs.existsSync(target) &&
    fs.statSync(target).mtimeMs >= stat.mtimeMs &&
    fs.statSync(target).size === stat.size
  )
    continue;
  fs.copyFileSync(file, target);
}
fs.writeFileSync(path.join(destination, '.nojekyll'), '');
console.log(`Prepared ${files.length} research assets.`);
