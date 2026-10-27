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
  title: (task) => task.replaceAll('_', ' '),
  ResizeObserver: class {
    observe() {}
  },
  window: null,
});
context.window = context;
vm.runInContext(fs.readFileSync('src/scripts/charts.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('src/scripts/viz.js', 'utf8'), context);
const data = JSON.parse(fs.readFileSync('dist/data/report-figures.json')),
  tasks = JSON.parse(fs.readFileSync('dist/data/tasks.json'));
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
const others = data.models.filter((m) => m.id !== 'Astra (ICL)').map((m) => m.id);
assert.equal(others.length, 8);
for (const width of [340, 760]) {
  const host = new Node('div');
  host.clientWidth = width;
  const rows = context.viz.astraVersusField(host, { tasks });
  check(host);
  assert.equal(rows.length, 26);
  for (const r of rows)
    assert.equal(
      r.delta,
      Number(r.task['Astra (ICL)_sr']) -
        Math.max(...others.map((id) => Number(r.task[id + '_sr']))),
    );
  assert.equal(rows.find((r) => r.task.task === 'dishwasher').delta, -0.85);
  const mobileShort = tasks.filter((t) => t.mobility === 'Mobile' && t.horizon === 'Short Horizon');
  assert.equal(mobileShort.length, 10);
  for (const reference of others) {
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
}
console.log(
  'SVG render checks pass at 340/760px: 26 task differences against the best of eight policies and against each policy.',
);
