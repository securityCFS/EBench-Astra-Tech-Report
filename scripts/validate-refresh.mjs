import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
class Node {
  constructor(tag) {
    this.tag = tag;
    this.attrs = {};
    this.children = [];
    this.clientWidth = 640;
    this.dataset = {};
    this.style = {};
    this.isConnected = true;
    this.classList = { toggle() {}, add() {} };
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
  }
  append(...nodes) {
    this.children.push(...nodes);
  }
  replaceChildren(...nodes) {
    this.children = nodes;
  }
  addEventListener() {}
  querySelectorAll() {
    return [];
  }
}
const document = {
  createElementNS: (ns, t) => new Node(t),
  createElement: (t) => new Node(t),
  createTextNode: (t) => ({ text: String(t) }),
  addEventListener() {},
  querySelectorAll: () => [],
};
const context = vm.createContext({
  document,
  matchMedia: () => ({ matches: false }),
  ResizeObserver: class {
    observe() {}
  },
  window: null,
});
context.window = context;
const source = fs.readFileSync('src/scripts/charts.js', 'utf8');
vm.runInContext(source.slice(0, source.indexOf('const chartSpecs')), context);
vm.runInContext(fs.readFileSync('src/scripts/viz.js', 'utf8'), context);
const data = JSON.parse(fs.readFileSync('dist/data/report-figures.json')),
  tasks = JSON.parse(fs.readFileSync('dist/data/tasks.json')),
  ablations = JSON.parse(fs.readFileSync('dist/data/ablations.json')),
  timing = JSON.parse(fs.readFileSync('dist/data/execution-timing.json'));
function walk(n) {
  return [n, ...(n.children || []).flatMap(walk)];
}
function check(host) {
  for (const n of walk(host)) {
    for (const k of ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'width', 'height']) {
      const v = n.attrs?.[k];
      if (v !== undefined && !v.includes('%'))
        assert(Number.isFinite(Number(v)), `${n.tag} ${k}=${v}`);
      if (['r', 'width', 'height'].includes(k) && v !== undefined && !v.includes('%'))
        assert(Number(v) >= 0);
    }
  }
}
for (const width of [340, 760]) {
  const host = new Node('div');
  host.clientWidth = width;
  const groups = ['Low', 'Medium', 'High'].map((g) => ({
    label: g,
    values: Object.fromEntries(data.models.map((m) => [m.id, m.groups[g].sr])),
  }));
  context.viz.dotStrip(host, { groups, title: 'Precision' });
  check(host);
  assert.equal(walk(host).filter((n) => n.attrs?.['data-model']).length, 24);
  const tied = Object.fromEntries(data.models.map((m, i) => [m.id, i < 2 ? 0.9 : 0.2]));
  context.viz.dotStrip(host, { groups: [{ label: 'Tie', values: tied }], title: 'Tie' });
  assert.equal(walk(host).filter((n) => n.attrs?.class === 'viz-best-ring').length, 2);
  assert.equal(walk(host).filter((n) => n.attrs?.['data-tip']?.includes('rank 1 of 8')).length, 2);
  const rows = context.viz.astraVersusField(host, { tasks });
  check(host);
  assert.equal(rows.filter((r) => r.delta > 1e-9).length, 5);
  assert.equal(rows.filter((r) => Math.abs(r.delta) < 1e-9).length, 4);
  assert.equal(rows.find((r) => r.task.task === 'dishwasher').delta, -0.85);
  const mobileShort = tasks.filter((t) => t.mobility === 'Mobile' && t.horizon === 'Short Horizon');
  assert.equal(mobileShort.length, 10);
  for (const reference of data.models.filter((m) => m.id !== 'Astra (ICL)').map((m) => m.id)) {
    const filtered = context.viz.astraVersusField(host, {
      tasks: mobileShort,
      reference,
      metric: 'score',
      order: 'task',
    });
    check(host);
    assert.equal(filtered.length, 10);
    assert.deepEqual(
      Array.from(filtered, (r) => r.task.task),
      mobileShort.map((t) => t.task).sort((a, b) => a.localeCompare(b)),
    );
    for (const r of filtered)
      assert.equal(
        r.delta,
        Number(r.task['Astra (ICL)_score']) - Number(r.task[reference + '_score']),
      );
  }
  context.viz.perturbationSlopes(host, { models: data.models });
  check(host);
  assert.equal(walk(host).filter((n) => n.attrs?.['data-model']).length, 8);
  context.viz.pairedDumbbells(host, { pairs: ablations.pairs });
  check(host);
  assert.equal(
    walk(host).filter((n) => n.attrs?.class === 'viz-pair-icl').length,
    ablations.pairs.length,
  );
  context.viz.timingBars(host, { episodes: timing.episodes });
  check(host);
  assert.equal(walk(host).filter((n) => n.attrs?.class === 'viz-time-wall').length, 3);
}
assert(!('wilson' in context.viz));
console.log(
  'SVG render checks pass at 340/760px: all systems, tied ranks, 26 task differences, paired scores and timing geometry; Wilson omitted.',
);
