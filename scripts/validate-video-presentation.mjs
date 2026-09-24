import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync('src/scripts/app.js', 'utf8');
const demos = JSON.parse(fs.readFileSync('dist/data/demo-videos.json', 'utf8'));
const safety = JSON.parse(fs.readFileSync('dist/data/safety-evidence.json', 'utf8'));
const context = vm.createContext({ demos });
vm.runInContext(
  app.slice(app.indexOf('function video('), app.indexOf('function bars(')) +
    app.slice(app.indexOf('function cameraPosition('), app.indexOf('function enhanceCameraView(')),
  context,
);

// Composite order verified from the recordings: overview, left wrist, right wrist.
// CSS positions refer to strips in the file; UI names refer to robot cameras.
const sources = [
  ...demos.map((d) => d.path),
  ...safety.map((d) => d.video),
  'media/cases/fruit_015-web.mp4',
  'media/cases/apple_to_fruit_bowl_006-web.mp4',
  'media/cases/collect_coffee_beans_013-web.mp4',
];
for (const source of sources) {
  for (const mode of ['lazy', 'loaded']) {
    const video = {
      currentSrc: mode === 'loaded' ? `http://127.0.0.1:4173/${source}?v=1` : '',
      getAttribute: () => null,
      dataset: { src: source },
    };
    assert.equal(context.cameraPosition(video, 'center'), 'left', source + ' overview');
    assert.equal(context.cameraPosition(video, 'left'), 'center', source + ' left wrist');
    assert.equal(context.cameraPosition(video, 'right'), 'right', source + ' right wrist');
    assert.equal(context.cameraPosition(video, 'all'), 'all', source + ' all views');
  }
}
// Unrelated comparison videos retain their existing camera mapping.
const comparison = {
  currentSrc: '',
  getAttribute: () => null,
  dataset: { src: 'media/cases/astra-glasses.mp4' },
};
assert.equal(context.cameraPosition(comparison, 'center'), 'center');
assert.equal(context.cameraPosition(comparison, 'left'), 'left');
for (const demo of demos) {
  const markup = context.mainVideo(demo.task, demo.seed, 'Task video', '');
  assert.ok(markup.includes(demo.sr ? 'Success' : 'Incomplete'));
  assert.ok(markup.includes(`Score ${demo.score.toFixed(3)}`));
  assert.ok(!markup.includes('<figcaption>'));
  assert.ok(!markup.includes('Episode '));
}
assert.ok(!app.includes('The selected episode succeeds.'));
assert.ok(!app.includes('Episode labels show backend terminal outcomes.'));
console.log(
  'Video presentation: main/behavior/safety camera mappings and single outcome labels verified.',
);
