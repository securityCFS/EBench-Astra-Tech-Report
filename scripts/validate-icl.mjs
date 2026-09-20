import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const packages = JSON.parse(readFileSync('dist/data/icl-packages.json', 'utf8'));
const tasks = JSON.parse(readFileSync('dist/data/tasks.json', 'utf8'));
assert.equal(packages.length, 26);
assert.equal(new Set(packages.map((p) => p.task)).size, 26);
let images = 0,
  texts = 0;
for (const pkg of packages) {
  assert(
    tasks.some((t) => (t.task || t.id) === pkg.task),
    `Unknown task ${pkg.task}`,
  );
  assert(pkg.inputs[0].text.startsWith('HISTORICAL DEMONSTRATION'));
  assert(pkg.inputs.at(-1).text.startsWith('END OF HISTORICAL DEMONSTRATION'));
  for (const input of pkg.inputs) {
    if (input.type === 'text') {
      assert.equal(typeof input.text, 'string');
      texts++;
      continue;
    }
    assert.equal(input.type, 'localImage');
    assert(input.path.startsWith(`media/icl/${pkg.task}/`) && !input.path.includes('..'));
    const path = 'dist/' + input.path;
    assert(existsSync(path), path);
    images++;
  }
}
assert.equal(images, 365);
assert.equal(texts, 417);
const overviews = JSON.parse(readFileSync('dist/data/icl-overviews.json', 'utf8'));
assert.equal(overviews.length, 26);
assert.equal(new Set(overviews.map((p) => p.task)).size, 26);
let repoFrames = 0;
for (const overview of overviews) {
  const pkg = packages.find((p) => p.task === overview.task);
  assert.ok(pkg);
  assert.equal(overview.overview, `media/icl/${pkg.task}/keyframes_preview.jpg`);
  assert(existsSync('dist/' + overview.overview), overview.overview);
  assert(
    pkg.inputs[0].text.includes(overview.description),
    pkg.task + ' overview prompt belongs to this package',
  );
  const inputs = pkg.inputs.filter((input) => input.type === 'localImage');
  assert.equal(inputs.length, overview.frames.length);
  for (const [index, frame] of overview.frames.entries()) {
    assert.equal(frame.path, inputs[index].path);
    assert.ok(Number.isInteger(frame.frame) && frame.frame >= 0);
    assert.ok(frame.camera && frame.phase);
    const position = pkg.inputs.findIndex((input) => input.path === frame.path);
    assert.equal(pkg.inputs[position - 1].text, 'Historical demonstration: ' + frame.label);
  }
  if (overview.source.type === 'git') repoFrames += overview.frames.length;
}
assert.equal(overviews.filter((p) => p.source.type === 'git').length, 12);
assert.equal(repoFrames, 191);
console.log(
  'Validated 26 original overview images and all 365 frame annotations; overview descriptions match their task prompts.',
);
console.log(
  `Validated ${packages.length} complete ICL packages: ${texts} text blocks and ${images} source-matched images.`,
);
