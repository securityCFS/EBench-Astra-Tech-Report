import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const nodes = new Map();
function node(selector) {
  if (!nodes.has(selector))
    nodes.set(selector, {
      innerHTML: '',
      textContent: '',
      value: selector === '#demo-search' ? '' : 'all',
      listeners: {},
      addEventListener(event, handler) {
        this.listeners[event] = handler;
      },
      querySelectorAll() {
        return [];
      },
    });
  return nodes.get(selector);
}
const tasks = JSON.parse(fs.readFileSync('dist/data/tasks.json', 'utf8'));
const demos = JSON.parse(fs.readFileSync('dist/data/demo-videos.json', 'utf8'));
const context = vm.createContext({
  document: {
    addEventListener() {},
    querySelector: node,
    querySelectorAll: () => [],
  },
  $: node,
  tasks,
  demos,
  reportFigures: JSON.parse(fs.readFileSync('dist/data/report-figures.json', 'utf8')),
  title: (value) => value.replaceAll('_', ' '),
  pct: (value) => Number(value) * 100,
  video: (path, label) => `<video src="${path}" aria-label="${label}"></video>`,
  initVideos() {},
});
for (const file of ['charts.js', 'research.js'])
  vm.runInContext(fs.readFileSync(`src/scripts/${file}`, 'utf8'), context, { filename: file });
// Exercise the library's real startup and filter handlers, including shared helpers.
vm.runInContext('initDemoLibrary()', context);
assert.ok(node('#demo-group').innerHTML.includes('Tabletop (7)'));
assert.equal(
  (node('#library-grid').innerHTML.match(/class="recording-library__item"/g) || []).length,
  6,
);
assert.ok(node('#library-count').textContent.startsWith('26 tasks'));
node('#demo-group').value = 'mobility:Fixed';
node('#demo-group').listeners.change();
assert.ok(node('#library-count').textContent.startsWith('7 tasks'));
node('#demo-next').listeners.click();
assert.equal(node('#demo-page').textContent, '2 / 2');
assert.equal(
  (node('#library-grid').innerHTML.match(/class="recording-library__item"/g) || []).length,
  1,
);
// Tables and charts list GPT-6-Astra and the eight post-trained policies of the comparison.
assert.deepEqual(
  JSON.parse(vm.runInContext('JSON.stringify(chartModels.map((m) => m[0]))', context)).sort(),
  context.reportFigures.models.map((m) => m.id).sort(),
);
console.log(
  'Startup checks: library rendering, subgroup filtering, pagination and the nine compared systems pass.',
);
