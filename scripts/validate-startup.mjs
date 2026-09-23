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
const sectionsDir = 'src/components/sections';
const sectionSources = fs
  .readdirSync(sectionsDir)
  .map((name) => fs.readFileSync(`${sectionsDir}/${name}`, 'utf8'))
  .join('\n');
const narrativeNodes = [...sectionSources.matchAll(/data-narrative="([^"]+)"/g)].map(([, key]) => {
  const element = node(`[data-narrative="${key}"]`);
  element.dataset = { narrative: key };
  return element;
});
const context = vm.createContext({
  document: {
    addEventListener() {},
    querySelector: node,
    querySelectorAll(selector) {
      return selector === '[data-narrative]' ? narrativeNodes : [];
    },
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
// Opening and related-work copy must render without loading benchmark modules.
vm.runInContext(fs.readFileSync('src/scripts/narrative.js', 'utf8'), context, {
  filename: 'narrative.js',
});
const intro = node('[data-narrative="introduction"]').innerHTML;
assert.equal((intro.match(/<p>/g) || []).length, 3);
assert.ok(intro.startsWith('<p>Recent advances in frontier large language models'));
assert.ok(intro.includes('26 tasks and 510 episodes'));
assert.ok(!intro.includes('Recent reports have begun to explore frontier agents as robot policies.'));
const relatedWork = node('[data-narrative="relatedWork"]').innerHTML;
assert.equal((relatedWork.match(/<p>/g) || []).length, 1);
assert.ok(
  relatedWork.startsWith('<p>Recent reports have begun to explore frontier agents as robot policies.'),
);
assert.ok(relatedWork.includes('https://robodojo-benchmark.com/report/gpt-6-astra-eval'));
const referenceIds = [
  ...fs
    .readFileSync(`${sectionsDir}/References.astro`, 'utf8')
    .matchAll(/<li id="([^"]+)" role="doc-biblioentry">/g),
].map(([, id]) => id);
const citations = [...relatedWork.matchAll(/<a\b[^>]*href="#([^"]+)"[^>]*>\[(\d+)\]<\/a>/g)];
assert.equal(citations.length, 8);
for (const [, target, number] of citations)
  assert.equal(target, referenceIds[Number(number) - 1], `Reference ${number} target mismatch.`);
const page = fs.readFileSync('src/pages/index.astro', 'utf8');
// References are numbered by first citation in reading order. Walk the sections in the
// order the page places them, reading each narrative slot where it sits, and check that
// every visible number points at the list entry it names.
const citedInOrder = [];
for (const [, name] of page.matchAll(/<([A-Z]\w+) \/>/g)) {
  const file = `${sectionsDir}/${name}.astro`;
  if (name === 'References' || !fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  for (const [, key, id] of source.matchAll(/data-narrative="([^"]+)"|href="#(ref-[^"]+)"/g)) {
    const html = key ? node(`[data-narrative="${key}"]`).innerHTML : `href="#${id}"`;
    for (const [, cited] of html.matchAll(/href="#(ref-[^"]+)"/g))
      if (!citedInOrder.includes(cited)) citedInOrder.push(cited);
  }
  const rendered = source.replace(
    /data-narrative="([^"]+)"/g,
    (_, key) => node(`[data-narrative="${key}"]`).innerHTML,
  );
  for (const [, id, label, number] of rendered.matchAll(
    /<a\b[^>]*href="#(ref-[^"]+)"[^>]*aria-label="Reference (\d+)"[^>]*>\s*\[(\d+)\]/g,
  )) {
    assert.equal(label, number, `Citation ${number} is announced as Reference ${label}.`);
    assert.equal(
      id,
      referenceIds[Number(number) - 1],
      `Citation [${number}] does not point at entry ${number}.`,
    );
  }
}
assert.deepEqual(citedInOrder, referenceIds, 'References must be numbered by first citation in reading order.');
assert.ok(
  page.indexOf('<RelatedWork />') < page.indexOf('<References />'),
  'Related work must appear directly before References.',
);
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
console.log(
  'Startup checks: introduction and related-work copy, library rendering, subgroup filtering and pagination pass.',
);

// The extra leaderboard submission belongs only to the overall ranking.
const ranking = JSON.parse(vm.runInContext('JSON.stringify(overallRanking())', context));
assert.deepEqual(
  ranking.map((m) => m.key),
  [
    'OpenWAM-Alpha',
    'AMapbot',
    'Astra (ICL)',
    'Qwen-RobotManip',
    'Pi05',
    'InternVLA-A1.5',
    'Pi0',
    'GigaBrain-0.7',
    'FastWAM',
  ],
);
assert.equal(ranking[1].sr, 0.4891);
assert.equal(ranking[1].score, 0.6386);
const scoreRanking = JSON.parse(
  vm.runInContext("JSON.stringify(overallRanking('score'))", context),
);
assert.deepEqual(
  scoreRanking.map((m) => m.key),
  [
    'OpenWAM-Alpha',
    'Astra (ICL)',
    'AMapbot',
    'Qwen-RobotManip',
    'Pi05',
    'Pi0',
    'InternVLA-A1.5',
    'GigaBrain-0.7',
    'FastWAM',
  ],
);
assert.equal(vm.runInContext('chartModels.length', context), 8);
assert.equal(vm.runInContext("chartModels.some(m=>m[0]==='AMapbot')", context), false);
console.log(
  'Overall ranking: nine entries sorted for both metrics; detailed analysis retains eight models.',
);
