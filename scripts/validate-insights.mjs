import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = (p) => JSON.parse(fs.readFileSync('dist/data/' + p, 'utf8'));
const d = read('analysis-insights.json'),
  tasks = read('tasks.json'),
  episodes = read('astra-main-episodes.json'),
  a = 'Astra (ICL)';
const close = (x, y) => assert(Math.abs(x - y) < 1e-8, `${x} != ${y}`);
assert.equal(new Set(d.groups.flatMap((g) => g.tasks)).size, 26);
assert.equal(
  d.groups.reduce((n, g) => n + g.n, 0),
  26,
);
assert.deepEqual(
  d.groups.map((g) => g.n),
  [12, 7, 3, 4],
);
for (const g of d.groups) {
  for (const m of d.models)
    close(
      g.rates[m.id],
      g.tasks.reduce(
        (sum, name) => sum + Number(tasks.find((t) => t.task === name)[m.id + '_sr']) * 100,
        0,
      ) / g.n,
    );
}
// The author-corrected display aggregate is separate from archived task means.
const correctedGroup = d.groups.find((group) => group.id === 'fixed-low-medium');
assert.deepEqual(correctedGroup.reported_rates, { 'OpenWAM-Alpha': 52.87 });
assert(correctedGroup.reported_rates_note.includes('per-task records remain unchanged'));
const correctedTabletop = read('report-figures.json').models.find((m) => m.id === 'OpenWAM-Alpha').groups.Fixed;
const highGroup = d.groups.find((group) => group.id === 'fixed-high');
close(correctedTabletop.sr * 100,
  (correctedGroup.reported_rates['OpenWAM-Alpha'] * correctedGroup.n + highGroup.rates['OpenWAM-Alpha'] * highGroup.n) / (correctedGroup.n + highGroup.n));
close(d.groups[0].rates[a], 73.19444444444444);
close(d.groups[2].rates[a], 31.666666666666668);
assert.equal(Math.max(...Object.values(d.groups[0].rates)), d.groups[0].rates[a]);
for (const t of d.tasks) {
  const e = episodes.filter((e) => e.task === t.task);
  assert.equal(t.n, e.length);
  assert.equal(t.success + t.partial + t.zero, t.n);
  assert.equal(t.zero, e.filter((e) => e.score === 0).length);
  assert.equal(t.success, e.filter((e) => e.sr === 1).length);
  close(t.rates[a], (t.success / t.n) * 100);
  const others = d.models.filter((m) => m.id !== a).map((m) => t.rates[m.id]);
  close(t.gap, t.rates[a] - Math.max(...others));
  assert.equal(t.rank, 1 + others.filter((v) => v > t.rates[a] + 1e-8).length);
}
assert.equal(d.tasks.filter((t) => t.rank === 1).length, 9);
assert.equal(d.tasks.filter((t) => t.rank === 1 && t.ties > 0).length, 4);
assert.equal(d.tasks.filter((t) => t.rank === 1 && t.ties === 0).length, 5);
assert.equal(d.tasks.filter((t) => t.rank === 1 && t.rates[a] === 0).length, 2);
assert.equal(d.tasks.filter((t) => t.rank === 2).length, 5);
assert.equal(d.tasks.filter((t) => [6, 7].includes(t.rank)).length, 6);
assert.equal(d.tasks.find((t) => t.task === 'install_gear').rank, 5);
for (const p of d.perturbations) {
  assert.equal(p.conditions.length, 4);
  close(
    p.range,
    Math.max(...p.conditions.map((c) => c.sr)) - Math.min(...p.conditions.map((c) => c.sr)),
  );
}
close(d.perturbations.find((p) => p.id === a).range, 6.6);
assert.equal(d.perturbations.reduce((best, p) => (p.range < best.range ? p : best)).id, a);
assert.equal(d.tasks.find((t) => t.task === 'install_gear').zero, 15);
assert.equal(d.tasks.find((t) => t.task === 'utensils_to_holder').zero, 13);
assert.equal(d.tasks.find((t) => t.task === 'put_glass_in_glassbox').zero, 10);
assert.equal(d.tasks.find((t) => t.task === 'shop').zero, 0);
console.log(
  'Analysis insights: cross-groups, 26 task gaps, tie-aware ranks, perturbation ranges and 510 outcome categories verified.',
);
