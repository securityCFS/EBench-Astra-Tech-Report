import { test, expect, type Locator, type Page } from '@playwright/test';

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('#benchmark-matrix .benchmark-table')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function expectContained(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
  const bounds = await page.locator('#matrix-content .table-scroll').evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    parent: el.parentElement!.getBoundingClientRect().width,
  }));
  expect(bounds.width).toBeLessThanOrEqual(bounds.parent + 1);
}

async function expectPillAligned(page: Page, selector: string) {
  await expect
    .poll(() =>
      page.locator(selector).evaluate((el) => {
        const pill = el.querySelector('.segmented-control__indicator')!.getBoundingClientRect();
        const selected = el.querySelector('[aria-pressed="true"]')!.getBoundingClientRect();
        return Math.max(
          Math.abs(pill.left - selected.left),
          Math.abs(pill.width - selected.width),
          Math.abs(pill.top - selected.top),
          Math.abs(pill.height - selected.height),
        );
      }),
    )
    .toBeLessThanOrEqual(1);
}

test('plain results and heat tables have distinct semantic treatments', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  await expect(page.locator('#overall-content .report-table--plain')).toBeVisible();
  const matrix = page.locator('#matrix-content .report-table--heat');
  await expect(matrix).toBeVisible();
  await expect(matrix.locator('tbody tr')).toHaveCount(8);
  const widths = await page.locator('.benchmark-scroll').evaluate((el) => ({
    available: el.clientWidth,
    content: el.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.available + 1);
  await expectContained(page);
  const download = page.locator('.matrix-download');
  await expect(download).toHaveAccessibleName('Download benchmark data (CSV)');
  await expect(download).toHaveAttribute('title', 'Download benchmark data (CSV)');
  await expect(download).toHaveText('CSV');
  await expect(download.locator('svg')).toHaveAttribute('aria-hidden', 'true');
});

test('aggregate values and heat contrast stay correct in both metrics', async ({ page }) => {
  await ready(page);
  const figures = await (await page.request.get('/data/report-figures.json')).json();
  const models = [...figures.models].sort((a, b) => b.sr - a.sr);
  const groups = ['Low', 'Medium', 'High', 'Mobile', 'Fixed', 'Short Horizon', 'Long Horizon'];
  for (const metric of ['sr', 'score']) {
    await page.locator(`[data-matrix-metric="${metric}"]`).click();
    for (let index = 0; index < models.length; index++) {
      const model = models[index];
      const expected = [
        (model.sr * 100).toFixed(2),
        model.score.toFixed(4),
        ...groups.map((g) =>
          metric === 'sr'
            ? (model.groups[g][metric] * 100).toFixed(2)
            : model.groups[g][metric].toFixed(4),
        ),
      ];
      await expect(page.locator('.benchmark-table tbody tr').nth(index).locator('td')).toHaveText(
        expected,
      );
    }
    const minimumContrast = await page
      .locator('.benchmark-table .heat-value')
      .evaluateAll((cells) => {
        const luminance = (rgb: string) => {
          const channels = rgb
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((c) => {
              const value = c / 255;
              return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
            });
          return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        };
        return Math.min(
          ...cells.map((cell) => {
            const style = getComputedStyle(cell);
            const a = luminance(style.color),
              b = luminance(style.backgroundColor);
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          }),
        );
      });
    expect(minimumContrast).toBeGreaterThanOrEqual(4.5);
  }
});

test('metric pill is persistent, really slides, and tracks responsive geometry', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page);
  const selector = '.matrix-metric';
  await expectPillAligned(page, selector);
  const animated = await page.locator(selector).evaluate(async (el) => {
    const pill = el.querySelector('.segmented-control__indicator')!;
    (window as any).__tablePill = pill;
    (el.querySelector('[data-matrix-metric="score"]') as HTMLButtonElement).click();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    return pill.getAnimations().some((animation) => animation.playState === 'running');
  });
  expect(animated).toBeTruthy();
  expect(
    await page
      .locator(`${selector} .segmented-control__indicator`)
      .evaluate((el) => el === (window as any).__tablePill),
  ).toBeTruthy();
  await expectPillAligned(page, selector);
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectPillAligned(page, selector);
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '20px';
  });
  await expectPillAligned(page, selector);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const durations = await page
    .locator(`${selector} .segmented-control__indicator`)
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(durations.split(',').every((duration) => parseFloat(duration) === 0)).toBeTruthy();
  await page.locator('[data-matrix-metric="score"]').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('[data-matrix-metric="sr"]')).toBeFocused();
  await expect(page.locator('[data-matrix-metric="sr"]')).toHaveAttribute('aria-pressed', 'true');
});

test('task grid omits N, retains episode counts, sorting, filtering, metric, and video actions', async ({
  page,
}) => {
  await ready(page);
  await page.locator('[data-matrix="tasks"]').click();
  const explorer = page.locator('#matrix-content .task-explorer');
  const table = explorer.locator('table');
  await expect(table).toHaveClass(/report-table--heat/);
  await expect(table.locator('thead th')).toHaveCount(10);
  await expect(table.getByRole('columnheader', { name: 'N', exact: true })).toHaveCount(0);
  await expect(table.locator('tbody tr')).toHaveCount(26);
  await expect(explorer.locator('.task-count')).toContainText(
    '26 of 26 tasks · 510 episodes per model',
  );
  await expect(explorer.getByRole('link', { name: 'Download task data (CSV)' })).toBeVisible();
  const tasks = await (await page.request.get('/data/tasks.json')).json();
  await explorer.locator('[data-task-metric="score"]').click();
  await expectPillAligned(page, '.task-metric-switch');
  const first = table.locator('tbody tr').first();
  const taskId = await first.locator('[data-task-video]').getAttribute('data-task-video');
  const task = tasks.find((entry) => entry.task === taskId);
  await expect(first.locator('.heat-value').first()).toHaveText(
    Number(task['Astra (ICL)_score']).toFixed(4),
  );
  const sort = table.locator('[data-sort="task"]');
  await sort.click();
  await expect(sort).toBeFocused();
  await expect(table.locator('thead th').first()).toHaveAttribute('aria-sort', 'ascending');
  await sort.press('Enter');
  await expect(table.locator('thead th').first()).toHaveAttribute('aria-sort', 'descending');
  const name = await table.locator('tbody th').first().innerText();
  await explorer.getByRole('searchbox').fill(name);
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await expect(table.getByRole('button', { name: `Watch ${name}`, exact: true })).toBeVisible();
  await explorer.getByRole('searchbox').fill('not-a-real-benchmark-task');
  await expect(table).toContainText('No matching tasks.');
  await expect(table.locator('.table-empty')).toHaveAttribute('colspan', '10');
  await explorer.getByRole('searchbox').fill('');
  const summary = explorer.locator('summary');
  await summary.focus();
  await summary.press('ArrowDown');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(summary).toBeFocused();
  await expect(summary).toContainText('Long horizon');
  await expect(explorer.locator('.task-count')).toContainText(
    `${tasks.filter((t) => t.horizon === 'Long Horizon').length} of 26 tasks`,
  );
  await summary.press('Enter');
  await page.keyboard.press('Escape');
  await expect(summary).toBeFocused();
  await expect(explorer.locator('details')).not.toHaveAttribute('open');
});

test('narrow grids scroll locally and row labels stay pinned', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await ready(page);
  for (const mode of ['attributes', 'tasks', 'shifts']) {
    await page.locator(`[data-matrix="${mode}"]`).click();
    await expectContained(page);
    const region = page.locator('#matrix-content .table-scroll');
    const before = await region.locator('tbody th').first().boundingBox();
    await region.evaluate((el) => {
      el.scrollLeft = 300;
    });
    const after = await region.locator('tbody th').first().boundingBox();
    expect(Math.abs(after!.x - before!.x)).toBeLessThanOrEqual(3);
    expect(await region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    await expect(region).toHaveAttribute('tabindex', '0');
    await expect(region).toHaveAttribute('role', 'region');
  }
});

const profileModels = [
  ['Astra (ICL)', 'GPT-6-Astra + ICL'],
  ['OpenWAM-Alpha', 'OpenWAM-α'],
  ['Qwen-RobotManip', 'Qwen-RobotManip'],
  ['Pi05', 'π₀.₅'],
  ['InternVLA-A1.5', 'InternVLA-A1.5'],
  ['Pi0', 'π₀'],
  ['GigaBrain-0.7', 'GigaBrain-0.7'],
  ['FastWAM', 'Fast-WAM'],
];
const profileGroups = {
  mobility: [
    ['Mobile', 'Mobile'],
    ['Tabletop', 'Fixed'],
  ],
  precision: [
    ['Low', 'Low'],
    ['Medium', 'Medium'],
    ['High', 'High'],
  ],
  horizon: [
    ['Short', 'Short Horizon'],
    ['Long', 'Long Horizon'],
  ],
} as const;
type ProfileKind = keyof typeof profileGroups;
type ProfileMetric = 'sr' | 'score';
type ProfileFigures = {
  models: { id: string; groups: Record<string, Record<ProfileMetric, number>> }[];
};

async function expectProfileValues(
  profile: Locator,
  kind: ProfileKind,
  metric: ProfileMetric,
  figures: ProfileFigures,
  tasks: Record<string, string>[],
) {
  const table = profile.locator('.profile-results');
  await expect(table).toBeVisible();
  await expect(table).toHaveClass(/report-table--plain/);
  await expect(table).toHaveAttribute('data-metric', metric);
  await expect(
    profile.locator('svg, canvas, .chart-drawing, .chart-series, [data-series]'),
  ).toHaveCount(0);
  const groups = profileGroups[kind];
  await expect(table.locator('thead th')).toHaveText([
    'Model',
    ...groups.map(
      ([label, group]) => `${label}${tasks.filter((task) => task[kind] === group).length} tasks`,
    ),
  ]);
  await expect(table.locator('tbody tr')).toHaveCount(8);
  await expect(table.locator('tbody th[scope="row"]')).toHaveText(
    profileModels.map(([, label]) => label),
  );
  await expect(table.locator('.astra-row')).toHaveCount(1);
  await expect(table.locator('.astra-row')).toHaveAttribute('data-model', 'Astra (ICL)');

  const rows = await table.locator('tbody tr').evaluateAll((elements) =>
    elements.map((row) => ({
      model: (row as HTMLElement).dataset.model,
      cells: [...row.querySelectorAll<HTMLTableCellElement>('td')].map((cell) => ({
        group: cell.dataset.group,
        metric: cell.dataset.metric,
        value: Number(cell.dataset.value),
        text: cell.textContent,
        best: cell.classList.contains('is-best'),
        strong: Boolean(cell.querySelector('strong')),
      })),
    })),
  );
  for (const [index, [key]] of profileModels.entries()) {
    expect(rows[index].model).toBe(key);
    expect(rows[index].cells).toHaveLength(groups.length);
    const model = figures.models.find((entry) => entry.id === key)!;
    for (const [column, [, group]] of groups.entries()) {
      const value = model.groups[group][metric];
      const cell = rows[index].cells[column];
      const best = Math.max(
        ...profileModels.map(
          ([id]) => figures.models.find((entry) => entry.id === id)!.groups[group][metric],
        ),
      );
      expect(cell).toEqual({
        group,
        metric,
        value,
        text: metric === 'sr' ? (value * 100).toFixed(2) + '%' : value.toFixed(4),
        best: value === best,
        strong: value === best,
      });
      const subset = tasks.filter((task) => task[kind] === group);
      const equalTaskMean =
        subset.reduce((sum, task) => sum + Number(task[`${key}_${metric}`]), 0) / subset.length;
      // Published aggregates retain four decimals; do not substitute episode-weighted means.
      expect(Math.abs(cell.value - equalTaskMean)).toBeLessThanOrEqual(0.00005001);
    }
  }
}

test('merged capability table retains all six subgroups and the persistent keyboard-operated metric pill', async ({
  page,
}) => {
  await ready(page);
  const chart = page.locator('#cross-group-chart');
  await expect(chart.locator('.capability-results')).toBeVisible();
  await expect(chart.locator('tbody tr')).toHaveCount(6);
  await expect(chart.locator('svg, canvas, .chart-series, [data-series]')).toHaveCount(0);
  const pill = await chart.locator('.segmented-control__indicator').elementHandle();
  const score = chart.locator('button[data-metric="score"]');
  await score.click();
  await expect(score).toHaveAttribute('aria-pressed', 'true');
  await expect(chart.locator('table')).toHaveAccessibleName(/Score \(0–1\)/);
  await expectPillAligned(page, '#cross-group-chart .chart-metrics');
  expect(
    await chart
      .locator('.segmented-control__indicator')
      .evaluate((el, original) => el === original, pill),
  ).toBe(true);
  await score.press('ArrowLeft');
  await expect(chart.locator('button[data-metric="sr"]')).toBeFocused();
  await expect(chart.locator('button[data-metric="sr"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(chart.locator('table')).toHaveAccessibleName(/Success rate/);
  await expect(chart.locator('tbody tr')).toHaveCount(6);
});

test('every profile and appendix copy preserves all exact group aggregates in both metrics', async ({
  page,
}) => {
  await ready(page);
  const figures: ProfileFigures = await (
    await page.request.get('/data/report-figures.json')
  ).json();
  const tasks: Record<string, string>[] = await (await page.request.get('/data/tasks.json')).json();
  for (const kind of ['precision', 'horizon'] as const) {
    await page.locator(`[data-limit="${kind}"]`).click();
    const profile = page.locator(`#limits-content [data-chart="${kind}"]`);
    for (const metric of ['sr', 'score'] as const) {
      await profile.locator(`button[data-metric="${metric}"]`).click();
      await expectProfileValues(profile, kind, metric, figures, tasks);
    }
  }
  await page.locator('[data-limit="precision"]').click();
  await page.locator('#limits-content [data-appendix="attributes"]').click();
  const dialog = page.locator('#appendix-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.profile-results')).toHaveCount(3);
  for (const kind of Object.keys(profileGroups) as ProfileKind[]) {
    const profile = dialog.locator(`[data-chart="${kind}"]`);
    for (const metric of ['sr', 'score'] as const) {
      await profile.locator(`button[data-metric="${metric}"]`).click();
      await expectProfileValues(profile, kind, metric, figures, tasks);
    }
  }
  // The appendix metric is local; the main precision table remains at its initial SR view.
  await page.keyboard.press('Escape');
  await expect(page.locator('#limits-content .profile-results')).toHaveAttribute(
    'data-metric',
    'sr',
  );
});

test('profile tables fit narrow and half-column panels with full-row Astra focus', async ({
  page,
}) => {
  await ready(page);
  const checkTables = async (selector: string) => {
    const profiles = page.locator(selector);
    for (const profile of await profiles.all()) {
      const region = profile.locator('.profile-table-scroll');
      await expect(region).toHaveAttribute('tabindex', '0');
      await expect(region).toHaveAttribute('role', 'region');
      const geometry = await region.evaluate((el) => {
        const table = el.querySelector('table')!;
        const focus = table.querySelector('.astra-row')!;
        return {
          available: el.clientWidth,
          content: el.scrollWidth,
          parent: el.parentElement!.clientWidth,
          focusedColors: [...focus.children].map((cell) => getComputedStyle(cell).backgroundColor),
          ordinaryColor: getComputedStyle(table.querySelector('tbody tr:not(.astra-row) th')!)
            .backgroundColor,
        };
      });
      expect(geometry.available).toBeLessThanOrEqual(geometry.parent + 1);
      expect(geometry.content).toBeLessThanOrEqual(geometry.available + 1);
      expect(new Set(geometry.focusedColors).size).toBe(1);
      expect(geometry.focusedColors[0]).not.toBe(geometry.ordinaryColor);
    }
  };
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const kind of ['precision', 'horizon']) {
      await page.locator(`[data-limit="${kind}"]`).click();
      await checkTables('#mobile-content [data-chart], #limits-content [data-chart]');
    }
    await page.locator('[data-limit="precision"]').click();
    await page.locator('#limits-content [data-appendix="attributes"]').click();
    await checkTables('#appendix-dialog [data-chart]');
    await page.keyboard.press('Escape');
    await expectContained(page);
  }
});

test('tab keyboard and distribution chart controls still function', async ({ page }) => {
  await ready(page);
  await page.locator('[data-matrix="attributes"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-matrix="tasks"]')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-matrix="shifts"]')).toBeFocused();
  await expect(page.locator('.benchmark-table tbody tr')).toHaveCount(8);
  await expect(page.locator('.matrix-download')).toHaveAttribute(
    'href',
    /report-generalization\.csv$/,
  );
  await page.locator('[data-shift-view="range"]').click();
  const range = page.locator('.matrix-perturbation-ranges');
  await expect(range.locator('.perturbation-row')).toHaveCount(8);
  await range.locator('[data-condition-model]').first().focus();
  await expect(range.locator('[data-range-readout]')).toContainText('episodes.');
  await expectPillAligned(page, '.shift-view-switch');
  await page.locator('[data-shift-view="table"]').click();
  await expect(page.locator('.benchmark-table')).toBeVisible();
  await expect(page.locator('#matrix-content')).toHaveAttribute(
    'aria-labelledby',
    'matrix-tab-shifts',
  );
});
