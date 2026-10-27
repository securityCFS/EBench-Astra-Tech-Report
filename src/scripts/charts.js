const chartModels = [
  ['Astra (ICL)', 'GPT-6-Astra', '#3456ef'],
  ['OpenWAM-Alpha', 'OpenWAM-α', '#26394c'],
  ['InternW0-Delta', 'InternW0-Δ', '#3f6d8f'],
  ['Qwen-RobotManip', 'Qwen-RobotManip', '#8098f2'],
  ['Pi05', 'π₀.₅', '#7374b8'],
  ['InternVLA-A1.5', 'InternVLA-A1.5', '#9b8ed0'],
  ['Pi0', 'π₀', '#9aa8bd'],
  ['GigaBrain-0.7', 'GigaBrain-0.7', '#bac4d8'],
  ['FastWAM', 'Fast-WAM', '#7e9fbd'],
];
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
                    metric === 'sr' ? (value * 100).toFixed(1) + '%' : value.toFixed(3);
                  return `<td class="heat-value" data-value="${value}" data-metric="${metric}" title="${title(t.task)} · ${label}: ${formatted}" style="--heat:${heatColor(value)};--heat-ink:${heatInk(value)}">${formatted}</td>`;
                })
                .join(
                  '',
                )}<td><button type="button" class="table-video" data-task-video="${t.task}" title="Watch ${title(t.task)}" aria-label="Watch ${title(t.task)}">${reportIcon('play')}</button></td></tr>`,
          )
          .join('') ||
        `<tr><td class="table-empty" colspan="${orderedModels.length + 2}">No matching tasks.</td></tr>`
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
