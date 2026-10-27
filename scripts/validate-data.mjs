import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data', name + '.json'), 'utf8'));
const tasks = read('tasks'),
  episodes = read('episodes'),
  demos = read('demo-videos'),
  figures = read('report-figures');
assert.equal(tasks.length, 26);
assert.equal(episodes.length, 510);
assert.equal(figures.models.length, 9);
assert.equal(new Set(episodes.map((e) => e.task + '/' + e.seed)).size, 510);
assert.deepEqual(
  [
    episodes.filter((e) => e.sr === 1).length,
    episodes.filter((e) => e.sr === 0 && e.score > 0).length,
    episodes.filter((e) => e.sr === 0 && e.score === 0).length,
  ],
  [237, 188, 85],
);
for (const task of tasks) {
  const cohort = episodes.filter((e) => e.task === task.task);
  assert.equal(cohort.length, Number(task.episodes), task.task + ' episode count');
  assert.ok(
    Math.abs(
      cohort.reduce((s, e) => s + e.sr, 0) / cohort.length - Number(task['Astra (ICL)_sr']),
    ) < 1e-5,
    task.task + ' SR',
  );
  assert.ok(
    demos.some((d) => d.task === task.task),
    task.task + ' demo missing',
  );
}
for (const demo of demos) {
  const episode = episodes.find((e) => e.task === demo.task && e.seed === demo.seed);
  assert.ok(episode, demo.path + ' source episode');
  assert.equal(episode.sr, demo.sr);
  assert.ok(Math.abs(episode.score - demo.score) < 1e-4);
  assert.ok(
    fs.statSync(path.join(root, demo.path)).size > 10000,
    demo.path + ' video missing (run git lfs pull)',
  );
}
// Headline values quoted in the page text.
const astra = figures.models.find((m) => m.id === 'Astra (ICL)');
assert.equal(astra.sr, 0.4673);
assert.equal(astra.score, 0.6537);
assert.equal(figures.models.filter((m) => m.sr > astra.sr).length, 2);
const range = (m) => {
  const rates = ['object', 'background', 'instruction', 'mix'].map(
    (k) => m.generalization[k].sr * 100,
  );
  return Math.max(...rates) - Math.min(...rates);
};
assert.equal(range(astra).toFixed(1), '6.6');
assert.ok(figures.models.every((m) => m === astra || range(m) > range(astra)));
// Every recording in these folders is played by the page, and nothing else is shipped.
const media = {
  poc: ['astra-poc', 'pi05-poc', 'openwam-poc-1', 'openwam-poc-2'],
  cases: [
    'zero-shot-frame',
    'icl-frame',
    'zero-shot-gear',
    'icl-gear',
    ...['astra', 'pi05', 'openwam'].flatMap((m) => [`${m}-glasses`, `${m}-teacup`]),
    'dishwasher_009-web',
    'apple_to_fruit_bowl_003-web',
    'collect_coffee_beans_009-web',
    'apple_to_fruit_bowl_006-web',
    'collect_coffee_beans_013-web',
    'fruit_015-web',
  ],
};
for (const [folder, names] of Object.entries(media)) {
  assert.deepEqual(
    fs.readdirSync(path.join(root, 'media', folder)).sort(),
    names.map((n) => n + '.mp4').sort(),
  );
  for (const name of names)
    assert.ok(fs.statSync(path.join(root, 'media', folder, name + '.mp4')).size > 10000, name);
}
assert.ok(
  fs
    .readFileSync('src/components/Masthead.astro', 'utf8')
    .includes('https://internrobotics.shlab.org.cn/eval/landing-page'),
);
console.log(
  'Validated: 9 systems, 26 tasks, 510 unique outcomes, 27 main demos, 4 composition and 16 case videos; headline values match source data.',
);
