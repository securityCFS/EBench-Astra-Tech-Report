// Derived comparisons; source values and denominators remain inspectable.
async function initAnalysisInsights() {
  const ids = ['cross-group-chart', 'fixed-task-evidence', 'failure-depth-chart'];
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const taskName = (s) => s.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
  const number = (n) => n.toFixed(2);
  const astra = 'Astra (ICL)';
  let data;
  try {
    const r = await fetch('data/analysis-insights.json');
    if (!r.ok) throw Error('Analysis data');
    data = await r.json();
  } catch {
    for (const id of ids)
      document.getElementById(id).innerHTML =
        '<p>Analysis data could not load. Please reload the page.</p>';
    return;
  }
  const label = (id) => data.models.find((m) => m.id === id).label;
  const model = (id) => esc(label(id));
  const groupRoot = document.getElementById('cross-group-chart');
  const tableGroups = [
    {
      label: 'Operating Mode',
      rows: [
        ['Mobile', 'Mobile'],
        ['Tabletop', 'Fixed'],
      ].map(([label, mode]) => {
        const subset = tasks.filter((task) => task.mobility === mode);
        return {
          id: `mode-${mode.toLowerCase()}`,
          label,
          n: subset.length,
          values: (metric) =>
            data.models.map((m) => chartAggregate(m.id, metric, 'mobility', mode, subset)),
        };
      }),
    },
    ...[
      [
        'Horizon',
        [
          ['mobile-short', 'Short'],
          ['mobile-long', 'Long'],
        ],
      ],
      [
        'Precision',
        [
          ['fixed-low-medium', 'Low / Medium'],
          ['fixed-high', 'High'],
        ],
      ],
    ].map(([label, rows]) => ({
      label,
      rows: rows.map(([id, label]) => {
        const group = data.groups.find((group) => group.id === id);
        const subset = tasks.filter((task) => group.tasks.includes(task.task));
        return {
          id,
          label,
          n: group.n,
          values: (metric) =>
            data.models.map((m) =>
              metric === 'sr'
                ? group.rates[m.id] / 100
                : subset.reduce((sum, task) => sum + Number(task[m.id + '_score']), 0) /
                  subset.length,
            ),
        };
      }),
    })),
  ];
  let groupMetric = 'sr';
  groupRoot.innerHTML = `<div class="capability-table-controls"><div class="chart-metrics" role="group" aria-label="Capability comparison metric"><button type="button" data-metric="sr" aria-pressed="true">SR (%)</button><button type="button" data-metric="score" aria-pressed="false">Score</button></div></div><div class="insight-table-scroll" tabindex="0" role="region" aria-label="Performance by operating mode, horizon and precision"></div><p class="insight-note" id="capability-table-note">Each task has equal weight within its subgroup. Horizon compares the 19 mobile tasks; Precision compares the 7 tabletop tasks. <strong>Bold</strong>: best in row; shaded column: GPT-6-Astra. <a href="#study-limitations">Benchmark limitations ${reportIcon('external-link')}</a></p>`;
  initSegmentedControl(groupRoot.querySelector('.chart-metrics'));
  function drawCapabilityTable() {
    const metricLabel = groupMetric === 'sr' ? 'Success rate (%)' : 'Score (0–1)';
    const format = (value) => (groupMetric === 'sr' ? (value * 100).toFixed(2) : value.toFixed(4));
    groupRoot.querySelector('.insight-table-scroll').innerHTML =
      `<table class="report-table report-table--plain insight-table capability-results" data-metric="${groupMetric}" aria-label="Capability comparison: ${metricLabel}" aria-describedby="capability-table-note"><thead><tr><th scope="col" rowspan="2" class="capability-dimension">Dimension</th><th scope="col" rowspan="2" class="capability-subgroup">Subgroup</th><th scope="colgroup" colspan="${data.models.length}">${metricLabel}</th></tr><tr>${data.models.map((m) => `<th scope="col" ${m.id === astra ? 'class="insight-astra"' : ''}>${model(m.id)}</th>`).join('')}</tr></thead>${tableGroups
        .map(
          (group) =>
            `<tbody>${group.rows
              .map((row, index) => {
                const values = row.values(groupMetric);
                const best = Math.max(...values);
                return `<tr data-subgroup="${row.id}">${index === 0 ? `<th scope="rowgroup" rowspan="2" class="capability-dimension">${esc(group.label)}</th>` : ''}<th scope="row" class="capability-subgroup"><span class="subgroup-label">${esc(row.label)}<small>${row.n} tasks</small></span></th>${data.models.map((m, i) => `<td data-model="${m.id}" data-value="${values[i]}" class="${m.id === astra ? 'insight-astra' : ''}">${Math.abs(values[i] - best) < 1e-8 ? `<strong>${format(values[i])}</strong>` : format(values[i])}</td>`).join('')}</tr>`;
              })
              .join('')}</tbody>`,
        )
        .join('')}</table>`;
  }
  groupRoot.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-metric]');
    if (!button || button.dataset.metric === groupMetric) return;
    groupMetric = button.dataset.metric;
    groupRoot
      .querySelectorAll('button[data-metric]')
      .forEach((control) => control.setAttribute('aria-pressed', String(control === button)));
    drawCapabilityTable();
  });
  drawCapabilityTable();

  const fixed = document.getElementById('fixed-task-evidence');
  fixed.innerHTML = `<div class="insight-table-scroll"><table class="report-table report-table--plain insight-table fixed-insight-table"><thead><tr><th scope="col" rowspan="2">Task</th><th scope="colgroup" colspan="2">Success rate (%)</th><th scope="col" rowspan="2">Video</th></tr><tr><th scope="col">GPT-6-Astra</th><th scope="col">Qwen-RobotManip</th></tr></thead><tbody>${data.groups
    .find((g) => g.id === 'fixed-low-medium')
    .tasks.map((name) => {
      const t = data.tasks.find((t) => t.task === name);
      return `<tr><th scope="row">${esc(taskName(name))}</th><td class="insight-astra">${number(t.rates[astra])}</td><td>${number(t.rates['Qwen-RobotManip'])}</td><td><button class="appendix-link" data-task-video="${name}">Video link ${reportIcon('external-link')}</button></td></tr>`;
    })
    .join(
      '',
    )}</tbody></table></div><p class="insight-note"><button class="appendix-link" data-open-case="fine">Glasses comparison ${reportIcon('external-link')}</button> · <button class="appendix-link" data-icl-package="frame_against_pen_holder">Frame demonstration ${reportIcon('external-link')}</button></p>`;

  const failures = document.getElementById('failure-depth-chart');
  const selected = [
    'install_gear',
    'utensils_to_holder',
    'put_glass_in_glassbox',
    'tighten_nut',
    'peg_in_hole',
    'shop',
    'bottle',
  ];
  failures.classList.add('outcome-breakdown');
  failures.innerHTML = `<div class="outcome-split-legend"><span><i class="outcome-success" aria-hidden="true"></i>Complete success</span><span><i class="outcome-partial" aria-hidden="true"></i>Incomplete</span><span><i class="outcome-zero" aria-hidden="true"></i>Failed</span></div><div class="outcome-breakdown-heading" aria-hidden="true"><span>Task</span><span>Episode outcomes</span><span>Episodes</span></div><div id="failure-depth-rows"></div><button class="failure-expand" type="button" aria-expanded="false" aria-controls="failure-depth-extra"><span data-failure-expand-label>Show all 26 tasks</span><span class="failure-expand-icon">${reportIcon('chevron-down')}</span></button><p class="outcome-breakdown-note">Percentages use all evaluated episodes of each task. Select a task for exact counts.</p><p class="outcome-breakdown-readout" id="failure-readout" aria-live="polite" aria-atomic="true"></p>`;
  const initialRows = selected.map((name) => data.tasks.find((t) => t.task === name));
  const additionalRows = data.tasks
    .filter((t) => !selected.includes(t.task))
    .sort((a, b) => b.zero / b.n - a.zero / a.n || a.task.localeCompare(b.task));
  const outcomeLabels = { success: 'Complete success', partial: 'Incomplete', zero: 'Failed' };
  const outcomeSummary = (t) =>
    `${taskName(t.task)}: ${Object.entries(outcomeLabels)
      .map(([key, label]) => `${label} ${t[key]}/${t.n} (${number((100 * t[key]) / t.n)}%)`)
      .join('; ')}.`;
  const failureRow = (t) =>
    `<button type="button" class="failure-depth-row" data-failure-task="${t.task}" aria-label="${esc(outcomeSummary(t))}"><span class="outcome-task-label">${esc(taskName(t.task))}</span><span class="outcome-split-track" aria-hidden="true">${Object.entries(
      outcomeLabels,
    )
      .map(
        ([key, label]) =>
          `<span class="outcome-${key}" data-count="${t[key]}" style="width:${(100 * t[key]) / t.n}%" title="${label}: ${t[key]}/${t.n} (${number((100 * t[key]) / t.n)}%)">${(100 * t[key]) / t.n >= 10 ? Number(number((100 * t[key]) / t.n)) + '%' : ''}</span>`,
      )
      .join(
        '',
      )}</span><span class="outcome-task-count">${t.n}<span class="outcome-count-unit"> episodes</span></span></button>`;
  failures.querySelector('#failure-depth-rows').innerHTML =
    initialRows.map(failureRow).join('') +
    `<div id="failure-depth-extra" hidden>${additionalRows.map(failureRow).join('')}</div>`;
  const expandButton = failures.querySelector('.failure-expand');
  expandButton.addEventListener('click', () => {
    const expanded = expandButton.getAttribute('aria-expanded') !== 'true';
    expandButton.setAttribute('aria-expanded', String(expanded));
    failures.querySelector('#failure-depth-extra').hidden = !expanded;
    expandButton.querySelector('[data-failure-expand-label]').textContent = expanded
      ? 'Show fewer · 7 tasks'
      : 'Show all 26 tasks';
    if (!expanded) {
      failures.querySelector('#failure-readout').textContent = '';
      failures
        .querySelectorAll('[data-failure-task]')
        .forEach((row) => row.removeAttribute('data-active'));
      if (expandButton.getBoundingClientRect().top < 90)
        expandButton.scrollIntoView({ block: 'center' });
    }
  });
  function inspectFailure(e) {
    const b = e.target.closest('[data-failure-task]');
    if (!b) return;
    const t = data.tasks.find((t) => t.task === b.dataset.failureTask);
    const readout = failures.querySelector('#failure-readout');
    failures
      .querySelectorAll('[data-failure-task]')
      .forEach((row) => row.toggleAttribute('data-active', row === b));
    b.insertAdjacentElement('afterend', readout);
    readout.textContent = outcomeSummary(t);
  }
  failures.addEventListener('click', inspectFailure);
  failures.addEventListener('focusin', inspectFailure);
}

// One range view inside the main Distribution shifts tab.
function renderPerturbationRanges(ranges) {
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const number = (n) => n.toFixed(2),
    astra = 'Astra (ICL)';
  const conditions = [
    ['object', 'Object', 24, 120],
    ['background', 'Background', 26, 130],
    ['instruction', 'Instruction', 26, 130],
    ['mix', 'Mixed', 26, 130],
  ];
  const data = {
    perturbations: reportFigures.models.map((m) => {
      const values = conditions.map(([key, label, tasks, episodes]) => ({
        label,
        tasks,
        episodes,
        sr: m.generalization[key].sr * 100,
      }));
      return {
        id: m.id,
        label: modelLabel(m.id),
        conditions: values,
        range: Math.max(...values.map((c) => c.sr)) - Math.min(...values.map((c) => c.sr)),
      };
    }),
  };
  ranges.innerHTML = `<div class="perturbation-legend">${['Object', 'Background', 'Instruction', 'Mixed'].map((c, i) => `<span><i class="condition-${i}"></i>${c}</span>`).join('')}</div><div class="range-axis"><span></span><div><span>0%</span><span>50%</span><span>100%</span></div><span>Range</span></div>${[
    ...data.perturbations,
  ]
    .sort((a, b) => a.range - b.range)
    .map((m) => {
      const min = Math.min(...m.conditions.map((c) => c.sr)),
        max = Math.max(...m.conditions.map((c) => c.sr));
      return `<div class="perturbation-row ${m.id === astra ? 'insight-astra' : ''}"><span>${esc(m.label)}</span><div class="perturbation-track"><span class="perturbation-span" style="left:${min}%;width:${max - min}%"></span>${m.conditions.map((c, i) => `<button class="condition-dot condition-${i}" style="left:${c.sr}%;top:${6 + i * 10}px" data-condition-model="${esc(m.id)}" data-condition="${i}" aria-label="${esc(m.label)}, ${c.label}: ${number(c.sr)}%, ${c.episodes} episodes" title="${c.label}: ${number(c.sr)}%"></button>`).join('')}</div><strong>${number(m.range)} pp</strong></div>`;
    })
    .join(
      '',
    )}<p class="insight-readout" data-range-readout aria-live="polite">Range = maximum − minimum success rate across the four perturbation conditions.</p>`;
  function inspectCondition(e) {
    const b = e.target.closest('[data-condition-model]');
    if (!b) return;
    const m = data.perturbations.find((m) => m.id === b.dataset.conditionModel),
      c = m.conditions[Number(b.dataset.condition)];
    ranges.querySelector('[data-range-readout]').textContent =
      `${m.label} · ${c.label}: ${number(c.sr)}% success across ${c.tasks} tasks / ${c.episodes} episodes.`;
  }
  ranges.addEventListener('click', inspectCondition);
  ranges.addEventListener('focusin', inspectCondition);
}
