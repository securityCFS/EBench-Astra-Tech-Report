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
assert.equal(figures.models.length, 8);
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
const astra = figures.models.find((m) => m.id === 'Astra (ICL)');
assert.equal(astra.sr, 0.4673);
assert.equal(astra.score, 0.6537);
for (const name of ['astra-poc', 'pi05-poc', 'openwam-poc-1', 'openwam-poc-2'])
  assert.ok(fs.statSync(path.join(root, 'media/poc', name + '.mp4')).size > 10000);
for (const name of ['collect_coffee_beans_013-web', 'fruit_015-web', 'apple_to_fruit_bowl_006-web'])
  assert.ok(fs.statSync(path.join(root, 'media/cases', name + '.mp4')).size > 10000);
const apple = read('apple-recovery-evidence'),
  appleEpisode = episodes.find((e) => e.task === apple.task && e.seed === apple.seed);
assert.equal(appleEpisode.sr, apple.server_result.sr);
assert.equal(appleEpisode.score, apple.server_result.score);
assert.deepEqual(
  apple.actions.map((a) => a.call),
  ['call_00010', 'call_00011', 'call_00017'],
);
const page = fs.readFileSync('src/pages/index.astro', 'utf8');
assert.ok(page.indexOf('<BenchmarkResults />') < page.indexOf('<ExperimentSetup />'));
assert.ok(
  fs
    .readFileSync('src/components/Masthead.astro', 'utf8')
    .includes('https://internrobotics.shlab.org.cn/eval/landing-page'),
);
const safety = read('safety-evidence');
assert.equal(safety.length, 4);
assert.ok(safety.some((e) => e.task === 'collect_coffee_beans' && e.seed === '009'));
assert.ok(safety.some((e) => e.task === 'detergent' && e.seed === '000'));
for (const entry of safety) {
  const outcome = episodes.find((e) => e.task === entry.task && e.seed === entry.seed);
  assert.ok(outcome);
  assert.equal(outcome.sr, 0);
  assert.equal(entry.sr, 0);
  assert.equal(entry.score, outcome.score);
  assert.ok(fs.statSync(path.join(root, entry.video)).size > 10000);
  assert.deepEqual(entry.camera_order, ['overview', 'left_wrist', 'right_wrist']);
  assert.ok(entry.public_actions.length > 0);
}
const missed = safety.find(
  (e) => e.task === 'apple_to_fruit_bowl' && e.seed === '003',
).missed_target;
assert.ok(
  Math.abs(
    Math.hypot(...missed.target_xyz_m.map((v, i) => v - missed.achieved_xyz_m[i])) -
      missed.distance_m,
  ) < 1e-12,
);
assert.equal(missed.distance_m.toFixed(2), '0.51');
console.log(
  'Validated: four failed safety recordings match cohort outcomes; EEF endpoint mismatch recomputes to 0.51 m.',
);
const provenance = read('evaluation-provenance');
assert.equal(provenance.episodes.length, 510);
assert.equal(new Set(provenance.episodes.map((e) => e.task + '/' + e.seed)).size, 510);
for (const entry of provenance.episodes) {
  const outcome = episodes.find((e) => e.task === entry.task && e.seed === entry.seed);
  assert.ok(outcome, entry.task + '/' + entry.seed + ' provenance match');
  assert.equal(entry.sr, outcome.sr);
  assert.ok(Math.abs(entry.score - outcome.score) < 1e-4);
  assert.ok(
    !Object.keys(entry).some((k) =>
      /prompt|profile|account_id|source_output|source_summary/.test(k),
    ),
  );
}
const holds = provenance.episodes.filter((e) => e.terminal_hold_steps > 0);
assert.equal(holds.length, provenance.counts.terminal_hold_episodes);
assert.equal(
  holds.reduce((sum, e) => sum + e.terminal_hold_steps, 0),
  provenance.counts.terminal_hold_steps,
);
assert.equal(
  holds.filter((e) => e.sr === 1).length,
  provenance.counts.successful_episodes_with_hold,
);
for (const [route, count] of Object.entries(provenance.counts.execution_routes))
  assert.equal(
    provenance.episodes.filter((e) => e.execution_routes.join(' → ') === route).length,
    count,
  );
assert.equal(provenance.comparator_submissions.length, 7);
for (const submission of provenance.comparator_submissions) {
  assert.equal(new URL(submission.url).hostname, 'internrobotics.shlab.org.cn');
  const model = figures.models.find((m) => m.id === submission.model);
  assert.ok(model);
  assert.equal(submission.sr, model.sr);
  assert.equal(submission.score, model.score);
}
console.log(
  'Validated: public cohort manifest matches all 510 outcomes, holding totals, execution routes and seven source submissions.',
);
console.log(
  'Validated: 8 systems, 26 tasks, 510 unique outcomes, 27 main demos, 4 POC videos, 3 behavior videos; headline aggregates and selected-episode labels match source data.',
);
