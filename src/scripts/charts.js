const chartModels = [
  ['Astra (ICL)', 'GPT-6-Astra-ICL', '#3456ef'],
  ['OpenWAM-Alpha', 'OpenWAM-α', '#26394c'],
  ['Qwen-RobotManip', 'Qwen-RobotManip', '#8098f2'],
  ['Pi05', 'π₀.₅', '#7374b8'],
  ['InternVLA-A1.5', 'InternVLA-A1.5', '#9b8ed0'],
  ['Pi0', 'π₀', '#9aa8bd'],
  ['GigaBrain-0.7', 'GigaBrain-0.7', '#bac4d8'],
  ['FastWAM', 'Fast-WAM', '#7e9fbd'],
];
// Archived leaderboard snapshot, September 17, 2026: recheck-20260917/ranking.json.
// This submission is shown only in the overall ranking, not the analysis cohort.
const overallOnlyModel = {
  key: 'AMapbot',
  label: 'AMapbot',
  sr: 0.4891,
  score: 0.6386,
  color: '#627c99',
};
const overallChartModels = [
  ...chartModels,
  [overallOnlyModel.key, overallOnlyModel.label, overallOnlyModel.color],
];
function overallRanking(metric = 'sr') {
  return overallChartModels
    .map(([key, label]) => ({
      key,
      label,
      sr: chartAggregate(key, 'sr', null, null, tasks),
      score: chartAggregate(key, 'score', null, null, tasks),
    }))
    .sort((a, b) => b[metric] - a[metric]);
}
const chartSpecs = {
  overall: { title: 'Overall benchmark performance', groups: [['All tasks', null]], note: '' },
  mobility: {
    title: 'Performance by mobility',
    field: 'mobility',
    groups: [
      ['Mobile', 'Mobile'],
      ['Tabletop', 'Fixed'],
    ],
  },
  precision: {
    title: 'Performance by precision requirement',
    field: 'precision',
    groups: [
      ['Low', 'Low'],
      ['Medium', 'Medium'],
      ['High', 'High'],
    ],
  },
  horizon: {
    title: 'Performance by task horizon',
    field: 'horizon',
    groups: [
      ['Short', 'Short Horizon'],
      ['Long', 'Long Horizon'],
    ],
  },
  perturbation: {
    title: 'Performance under controlled perturbations',
    groups: [['Object'], ['Background'], ['Instruction'], ['Mixed']],
    note: 'Object: 24 tasks / 120 episodes. Other conditions: 26 tasks / 130 episodes. Five episodes per task and condition.',
    values: [
      [44.17, 50.77, 44.62, 46.15],
      [52.5, 61.54, 60, 44.62],
      [40.83, 55.38, 51.54, 33.85],
      [41.67, 42.31, 46.15, 34.62],
    ],
  },
};
function reportChart(kind) {
  return `<figure class="report-chart" data-chart="${kind}"></figure>`;
}
function initCharts() {
  document.querySelectorAll('[data-chart]:not([data-chart-ready])').forEach((host) => {
    host.dataset.chartReady = 'true';
    const kind = host.dataset.chart,
      spec = chartSpecs[kind];
    if (['mobility', 'precision', 'horizon'].includes(kind)) {
      initProfileChart(host, kind, spec);
      return;
    }
    const available =
      kind === 'overall'
        ? overallChartModels
        : kind === 'perturbation'
          ? chartModels.slice(0, 4)
          : chartModels;
    let metric = 'sr',
      selected = available.map((_, i) => kind === 'overall' || i < 3);
    host.innerHTML = `<div class="chart-heading"><h4>${spec.title}</h4>${kind === 'perturbation' ? '<span>Success rate (%)</span>' : '<div class="chart-metrics" aria-label="Chart metric"><button data-metric="sr" aria-pressed="true">SR (%)</button><button data-metric="score" aria-pressed="false">Score</button></div>'}</div><div class="chart-series" aria-label="Models to compare">${available.map(([key, label, color], i) => `<button data-series="${i}" aria-pressed="${selected[i]}" style="--series:${color}"><i></i>${label}</button>`).join('')}</div><div class="chart-drawing"></div><p class="chart-readout" aria-live="polite"></p>${spec.note === '' ? '' : `<figcaption>${spec.note || 'Task-averaged performance within each attribute group.'}</figcaption>`}`;
    initSegmentedControl(host.querySelector('.chart-metrics'));
    function draw() {
      const visible = available
        .map((m, i) => ({ ...{ key: m[0], label: m[1], color: m[2] }, index: i }))
        .filter((m) => selected[m.index]);
      const groups = spec.groups.map(([label, value], gi) => {
        const subset = tasks.filter((t) => !spec.field || t[spec.field] === value);
        return {
          label: label + (spec.field ? ` · ${subset.length} tasks` : ''),
          values: visible.map((m) => ({
            ...m,
            value: spec.values
              ? spec.values[m.index][gi]
              : chartAggregate(m.key, metric, spec.field, value, subset) *
                (metric === 'sr' ? 100 : 1),
          })),
        };
      });
      if (kind === 'overall')
        groups.forEach((group) => group.values.sort((a, b) => b.value - a.value));
      const width = Math.max(280, Math.min(760, host.clientWidth)),
        left = width < 500 ? 165 : 190,
        right = 75,
        plot = width - left - right,
        row = 32,
        groupGap = 34,
        height = 52 + groups.length * (visible.length * row + groupGap);
      const fmt = (v) => (metric === 'sr' ? v.toFixed(2) + '%' : v.toFixed(4)),
        max = metric === 'sr' ? 100 : 1;
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="group" aria-label="${spec.title}: ${metric === 'sr' ? 'success rate' : 'Score'}" font-family="STIX Two Text, Times, serif" font-size="15">`;
      for (let i = 0; i <= 4; i++) {
        const x = left + (plot * i) / 4;
        svg += `<line x1="${x}" x2="${x}" y1="24" y2="${height - 25}" stroke="#e4e8ed"/><text x="${x}" y="15" text-anchor="middle" fill="#77818b">${metric === 'sr' ? i * 25 : (i / 4).toFixed(2)}</text>`;
      }
      let y = 43;
      groups.forEach((g) => {
        if (kind !== 'overall') {
          svg += `<text x="0" y="${y}" fill="#283645" font-weight="600">${g.label}</text>`;
          y += 21;
        }
        g.values.forEach((m) => {
          const label = `${g.label} — ${m.label}: ${fmt(m.value)}`;
          svg += `<g class="chart-mark" tabindex="0" aria-label="${label}"><title>${label}</title><rect x="0" y="${y - 15}" width="${width}" height="26" fill="transparent"/>${chartModelLabel(m.label, left, y)}<rect x="${left}" y="${y - 12}" width="${(plot * m.value) / max}" height="16" rx="7" fill="${m.color}"/><text x="${left + (plot * m.value) / max + 7}" y="${y}" fill="#273542">${fmt(m.value)}</text></g>`;
          y += row;
        });
        y += kind === 'overall' ? 0 : 13;
      });
      host.querySelector('.chart-drawing').innerHTML = svg + '</svg>';
      host.querySelectorAll('.chart-mark').forEach((mark) => {
        const show = () =>
          (host.querySelector('.chart-readout').textContent = mark.getAttribute('aria-label'));
        mark.addEventListener('pointerenter', show);
        mark.addEventListener('focus', show);
        mark.addEventListener('click', show);
      });
    }
    host.addEventListener('click', (e) => {
      const metricButton = e.target.closest('[data-metric]'),
        seriesButton = e.target.closest('[data-series]');
      if (metricButton) {
        metric = metricButton.dataset.metric;
        host
          .querySelectorAll('[data-metric]')
          .forEach((b) => b.setAttribute('aria-pressed', String(b === metricButton)));
      } else if (seriesButton) {
        const i = +seriesButton.dataset.series;
        if (selected[i] && selected.filter(Boolean).length === 1) return;
        selected[i] = !selected[i];
        seriesButton.setAttribute('aria-pressed', String(selected[i]));
      } else return;
      draw();
      host.querySelector('.chart-readout').textContent = '';
    });
    draw();
    let lastWidth = host.clientWidth;
    const resize = new ResizeObserver(() => {
      if (!host.isConnected) {
        resize.disconnect();
        return;
      }
      if (host.clientWidth !== lastWidth) {
        lastWidth = host.clientWidth;
        draw();
      }
    });
    resize.observe(host);
  });
}
const taskGroupDimensions = [
  {
    field: 'mobility',
    label: 'Mobility',
    values: [
      ['Mobile', 'Mobile'],
      ['Fixed', 'Tabletop'],
    ],
  },
  {
    field: 'precision',
    label: 'Precision',
    values: [
      ['Low', 'Low precision'],
      ['Medium', 'Medium precision'],
      ['High', 'High precision'],
    ],
  },
  {
    field: 'horizon',
    label: 'Task horizon',
    values: [
      ['Short Horizon', 'Short horizon'],
      ['Long Horizon', 'Long horizon'],
    ],
  },
];
function taskGroupOptions() {
  return (
    `<option value="all">All tasks (${tasks.length})</option>` +
    taskGroupDimensions
      .map(
        (d) =>
          `<optgroup label="${d.label}">${d.values.map(([value, label]) => `<option value="${d.field}:${value}">${label} (${tasks.filter((t) => t[d.field] === value).length})</option>`).join('')}</optgroup>`,
      )
      .join('')
  );
}
function matchesTaskGroup(task, group) {
  if (group === 'all') return true;
  const [field, value] = group.split(':');
  return (
    taskGroupDimensions.some((d) => d.field === field && d.values.some((v) => v[0] === value)) &&
    task[field] === value
  );
}
let taskControlId = 0;
function taskResultsMarkup() {
  const groupId = `task-group-${++taskControlId}`;
  const option = (value, label, count) =>
    `<button type="button" role="option" data-task-group="${value}" data-label="${label}" data-count="${count}" aria-selected="${value === 'all'}" tabindex="-1"><span>${label}</span><span class="task-option-count">${count}</span><svg class="task-option-check" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg></button>`;
  return `<div class="task-explorer"><div class="task-table-controls">
 <label class="task-search-field">Find task<span class="task-search-box"><svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg><input class="task-search" type="search" placeholder="Search tasks"></span></label>
 <div class="task-control-field"><span class="task-control-label">Metric</span><input type="hidden" class="task-metric" value="sr"><div class="task-metric-switch" role="group" aria-label="Task table metric"><button type="button" data-task-metric="sr" aria-pressed="true">SR <small>(%)</small></button><button type="button" data-task-metric="score" aria-pressed="false">Score</button></div></div>
 <div class="task-control-field"><span class="task-control-label" id="${groupId}-label">Task attribute</span><input type="hidden" class="task-group" value="all"><details class="task-group-control"><summary aria-haspopup="listbox" aria-expanded="false" aria-controls="${groupId}" aria-labelledby="${groupId}-label ${groupId}-value"><span id="${groupId}-value" class="task-group-value">All tasks</span><span class="task-selected-count">${tasks.length}</span>${reportIcon('chevron-down')}</summary><div class="task-group-menu" role="listbox" id="${groupId}" aria-labelledby="${groupId}-label">${option('all', 'All tasks', tasks.length)}${taskGroupDimensions.map((d) => `<div class="task-option-group" role="group" aria-label="${d.label}"><span class="task-option-heading" aria-hidden="true">${d.label}</span>${d.values.map(([value, label]) => option(`${d.field}:${value}`, label, tasks.filter((t) => t[d.field] === value).length)).join('')}</div>`).join('')}</div></details></div>
 </div><div class="table-toolbar"><p class="task-count fineprint" aria-live="polite"></p><a class="table-download" href="data/report-tasks.csv" download title="Download task data (CSV)" aria-label="Download task data (CSV)">${reportIcon('download')}<span>CSV</span></a></div><div class="table-scroll task-table" tabindex="0" role="region" aria-label="26-task benchmark heatmap"></div><div class="heat-legend"><span>Shared absolute scale</span><span>0</span><i aria-hidden="true"></i><span class="task-scale-max">100%</span></div></div>`;
}
// Close attribute menus when focus or the pointer leaves their control.
document.addEventListener('click', (event) =>
  document.querySelectorAll('.task-group-control[open]').forEach((menu) => {
    if (!menu.contains(event.target)) menu.open = false;
  }),
);

function initTaskTable() {
  document.querySelectorAll('.task-explorer:not([data-table-bound])').forEach((root) => {
    root.dataset.tableBound = 'true';
    const orderedModels = chartModels;
    const host = root.querySelector('.task-table');
    initSegmentedControl(root.querySelector('.task-metric-switch'));
    let sortKey = 'Astra (ICL)',
      descending = true;
    const draw = () => {
      const metric = root.querySelector('.task-metric').value,
        query = root.querySelector('.task-search').value.trim().toLowerCase(),
        group = root.querySelector('.task-group').value;
      const rows = tasks
        .filter((t) => title(t.task).toLowerCase().includes(query) && matchesTaskGroup(t, group))
        .sort((a, b) => {
          const delta =
            sortKey === 'task'
              ? a.task.localeCompare(b.task)
              : Number(a[sortKey + '_' + metric]) - Number(b[sortKey + '_' + metric]);
          return descending ? -delta : delta;
        });
      const episodes = rows.reduce((total, task) => total + Number(task.episodes), 0);
      root.querySelector('.task-count').textContent =
        `${rows.length} of ${tasks.length} tasks · ${episodes} episodes per model`;
      root.querySelector('.task-scale-max').textContent = metric === 'sr' ? '100%' : '1';
      const heading = (key, label) =>
        `<th scope="col"${key === sortKey ? ` aria-sort="${descending ? 'descending' : 'ascending'}"` : ''}><button type="button" class="table-sort" data-sort="${key}" aria-label="Sort by ${label}"><span>${label}</span>${key === sortKey ? reportIcon('chevron-down') : ''}</button></th>`;
      host.innerHTML = `<table class="report-table report-table--heat task-results"><thead><tr>${heading('task', 'Task')}${orderedModels.map(([key, label]) => heading(key, label)).join('')}<th scope="col">Video</th></tr></thead><tbody>${
        rows
          .map(
            (t) =>
              `<tr><th scope="row">${title(t.task)}</th>${orderedModels
                .map(([key, label]) => {
                  const value = Number(t[key + '_' + metric]);
                  const formatted =
                    metric === 'sr' ? (value * 100).toFixed(2) + '%' : value.toFixed(4);
                  return `<td class="heat-value" data-value="${value}" data-metric="${metric}" title="${title(t.task)} · ${label}: ${formatted}" style="--heat:${heatColor(value)};--heat-ink:${heatInk(value)}">${formatted}</td>`;
                })
                .join(
                  '',
                )}<td><button type="button" class="table-video" data-task-video="${t.task}" title="Watch ${title(t.task)}" aria-label="Watch ${title(t.task)}">${reportIcon('play')}</button></td></tr>`,
          )
          .join('') || '<tr><td class="table-empty" colspan="10">No matching tasks.</td></tr>'
      }</tbody></table>`;
    };
    const menu = root.querySelector('.task-group-control'),
      summary = menu.querySelector('summary'),
      options = [...menu.querySelectorAll('[data-task-group]')];
    const focusOption = (option) => {
      options.forEach((b) => (b.tabIndex = b === option ? 0 : -1));
      option.focus();
    };
    menu.addEventListener('toggle', () => {
      summary.setAttribute('aria-expanded', String(menu.open));
      if (menu.open) {
        const rect = summary.getBoundingClientRect(),
          zoom = rect.height / summary.offsetHeight;
        const dialog = menu.closest('dialog'),
          bounds = dialog?.getBoundingClientRect();
        const ceiling = bounds
          ? Math.max(0, bounds.top)
          : document.querySelector('.header')?.getBoundingClientRect().bottom || 0;
        const floor = bounds ? Math.min(innerHeight, bounds.bottom) : innerHeight;
        const above = rect.top - ceiling - 16,
          below = floor - rect.bottom - 16;
        const upward = below < 300 * zoom && above > below;
        menu.dataset.placement = upward ? 'above' : 'below';
        menu.querySelector('.task-group-menu').style.maxHeight =
          `${Math.max(120, Math.min(360, (upward ? above : below) / zoom))}px`;
        document.querySelectorAll('.task-group-control[open]').forEach((other) => {
          if (other !== menu) other.open = false;
        });
        if (!options.includes(document.activeElement))
          focusOption(options.find((b) => b.getAttribute('aria-selected') === 'true'));
      }
    });
    menu.addEventListener('focusout', (event) => {
      if (event.relatedTarget && !menu.contains(event.relatedTarget)) menu.open = false;
    });
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        menu.open = false;
        summary.focus();
        return;
      }
      const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const active = options.indexOf(document.activeElement);
      menu.open = true;
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? options.length - 1
            : event.key === 'ArrowDown'
              ? (active + 1) % options.length
              : (active - 1 + options.length) % options.length;
      focusOption(options[next]);
    });
    root.addEventListener('click', (event) => {
      const metric = event.target.closest('[data-task-metric]'),
        group = event.target.closest('[data-task-group]');
      if (metric) {
        root.querySelector('.task-metric').value = metric.dataset.taskMetric;
        root
          .querySelectorAll('[data-task-metric]')
          .forEach((b) => b.setAttribute('aria-pressed', String(b === metric)));
        draw();
      }
      if (group) {
        root.querySelector('.task-group').value = group.dataset.taskGroup;
        options.forEach((b) => b.setAttribute('aria-selected', String(b === group)));
        menu.querySelector('.task-group-value').textContent = group.dataset.label;
        menu.querySelector('.task-selected-count').textContent = group.dataset.count;
        menu.open = false;
        summary.focus();
        draw();
      }
    });
    root.querySelector('.task-search').addEventListener('input', draw);
    host.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sort]');
      if (!b) return;
      descending = b.dataset.sort === sortKey ? !descending : b.dataset.sort !== 'task';
      sortKey = b.dataset.sort;
      draw();
      host.querySelector(`[data-sort="${sortKey}"]`).focus();
    });
    draw();
  });
}

function chartAggregate(key, metric, field, group, subset) {
  if (key === overallOnlyModel.key && !field) return overallOnlyModel[metric];
  const model = reportFigures.models?.find((m) => m.id === key);
  if (model) {
    const value = field ? model.groups[group]?.[metric] : model[metric];
    if (value !== undefined) return value;
  }
  return subset.reduce((sum, t) => sum + Number(t[key + '_' + metric]), 0) / subset.length;
}

// Shared absolute scale for both heatmaps, with luminance-based text contrast.
function heatRGB(value) {
  const stops = [
    [242, 245, 255],
    [187, 201, 251],
    [49, 84, 215],
    [39, 62, 178],
    [20, 37, 111],
  ];
  const position = Math.max(0, Math.min(1, value)) * 4,
    index = Math.min(3, Math.floor(position)),
    fraction = position - index;
  return stops[index].map((channel, i) =>
    Math.round(channel + (stops[index + 1][i] - channel) * fraction),
  );
}
function heatColor(value) {
  return `rgb(${heatRGB(value).join(',')})`;
}
function heatInk(value) {
  const linear = heatRGB(value).map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05 ? '#fff' : '#000';
}

function initProfileChart(host, kind, spec) {
  let metric = 'sr';
  host.classList.add('profile-table-chart');
  host.innerHTML = `<div class="chart-heading"><h4>${spec.title}</h4><div class="chart-metrics" role="group" aria-label="${spec.title} metric"><button type="button" data-metric="sr" aria-pressed="true">SR (%)</button><button type="button" data-metric="score" aria-pressed="false">Score</button></div></div><div class="table-scroll profile-table-scroll" tabindex="0" role="region" aria-label="${spec.title} results"></div><figcaption>Equal-task means within each group. <strong>Bold</strong>: best in column; shaded row: GPT-6-Astra.</figcaption>`;
  initSegmentedControl(host.querySelector('.chart-metrics'));

  function draw() {
    const groups = spec.groups.map(([label, group]) => {
      const subset = tasks.filter((task) => task[spec.field] === group);
      // Keep the same published equal-task aggregates (and fallback) as the profile plots.
      const values = chartModels.map(([key]) =>
        chartAggregate(key, metric, spec.field, group, subset),
      );
      return { label, group, count: subset.length, values, best: Math.max(...values) };
    });
    const format = (value) => (metric === 'sr' ? (value * 100).toFixed(2) + '%' : value.toFixed(4));
    const metricLabel = metric === 'sr' ? 'Success rate (%)' : 'Score (0–1)';
    host.querySelector('.profile-table-scroll').innerHTML =
      `<table class="report-table report-table--plain profile-results" data-profile="${kind}" data-metric="${metric}" aria-label="${spec.title}: ${metricLabel}"><thead><tr><th scope="col">Model</th>${groups.map((group) => `<th scope="col" data-group="${group.group}">${group.label}<small>${group.count} tasks</small></th>`).join('')}</tr></thead><tbody>${chartModels
        .map(
          ([key, label], index) =>
            `<tr data-model="${key}"${key === 'Astra (ICL)' ? ' class="astra-row"' : ''}><th scope="row">${label}</th>${groups
              .map((group) => {
                const value = group.values[index];
                const best = value === group.best;
                return `<td data-group="${group.group}" data-value="${value}" data-metric="${metric}"${best ? ' class="is-best"' : ''}>${best ? `<strong>${format(value)}</strong>` : format(value)}</td>`;
              })
              .join('')}</tr>`,
        )
        .join('')}</tbody></table>`;
  }

  host.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-metric]');
    if (!button || button.dataset.metric === metric) return;
    metric = button.dataset.metric;
    host
      .querySelectorAll('button[data-metric]')
      .forEach((control) => control.setAttribute('aria-pressed', String(control === button)));
    draw();
  });
  draw();
}
