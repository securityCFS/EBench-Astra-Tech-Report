/* Gauge's KaTeX configuration, shared by dynamic HTML and SVG chart labels. */
const modelFormulas = new Map([
  ['π₀', String.raw`\pi_{0}`],
  ['π₀.₅', String.raw`\pi_{0.5}`],
]);
const modelMathCache = new Map();
function modelMathHTML(label) {
  if (!modelMathCache.has(label))
    modelMathCache.set(
      label,
      katex.renderToString(modelFormulas.get(label), {
        displayMode: false,
        output: 'htmlAndMathml',
        strict: 'error',
        throwOnError: true,
      }),
    );
  return modelMathCache.get(label);
}
function chartModelLabel(label, left, baseline) {
  if (!modelFormulas.has(label))
    return `<text x="${left - 12}" y="${baseline}" text-anchor="end" fill="#4b5661">${label}</text>`;
  return `<foreignObject x="0" y="${baseline - 18}" width="${left - 12}" height="28"><div xmlns="http://www.w3.org/1999/xhtml" class="chart-model-math">${modelMathHTML(label)}</div></foreignObject>`;
}
function typesetModelNames(root) {
  if (!root.isConnected) return;
  const excluded = '.model-math,.katex,svg,script,style,textarea,option';
  const eligible = (node) =>
    node.parentElement && !node.parentElement.closest(excluded) && /π₀(?:\.₅)?/.test(node.data);
  const nodes = [];
  if (root.nodeType === Node.TEXT_NODE) {
    if (eligible(root)) nodes.push(root);
  } else {
    if (root.nodeType !== Node.ELEMENT_NODE || root.closest(excluded)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => (eligible(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    while (walker.nextNode()) nodes.push(walker.currentNode);
  }
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    for (const part of node.data.split(/(π₀(?:\.₅)?)/g)) {
      if (!modelFormulas.has(part)) {
        fragment.append(document.createTextNode(part));
        continue;
      }
      const span = document.createElement('span');
      span.className = 'model-math';
      span.innerHTML = modelMathHTML(part);
      fragment.append(span);
    }
    node.replaceWith(fragment);
  }
}
typesetModelNames(document.body);
new MutationObserver((records) => {
  const roots = new Set();
  for (const record of records) {
    if (record.type === 'characterData') roots.add(record.target);
    else record.addedNodes.forEach((node) => roots.add(node));
  }
  roots.forEach(typesetModelNames);
}).observe(document.body, { childList: true, subtree: true, characterData: true });
