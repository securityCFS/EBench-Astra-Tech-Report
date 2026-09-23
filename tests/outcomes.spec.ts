import { test, expect, type Page } from '@playwright/test';

type Episode = { task: string; seed: string; sr: number; score: number };
type TaskOutcome = {
  task: string;
  precision: string;
  horizon: string;
  n: number;
  success: number;
  partial: number;
  zero: number;
};
const categories = [
  { key: 'success', label: 'Complete success', count: 237, test: (e: Episode) => e.sr === 1 },
  {
    key: 'partial',
    label: 'Incomplete',
    count: 188,
    test: (e: Episode) => e.sr === 0 && e.score > 0,
  },
  { key: 'zero', label: 'Failed', count: 85, test: (e: Episode) => e.sr === 0 && e.score === 0 },
] as const;
const taskLabel = (task: string) => task.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
// The row's accessible name carries the task's traits, since the marks under its name are decorative.
const taskSummary = (task: TaskOutcome) =>
  `${taskLabel(task.task)} (${task.precision} precision, ${task.horizon}): ${categories
    .map(
      ({ key, label }) =>
        `${label} ${task[key]}/${task.n} (${((100 * task[key]) / task.n).toFixed(2)}%)`,
    )
    .join('; ')}.`;

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('#episode-outcomes circle')).toHaveCount(510);
  await expect(page.locator('.outcome-breakdown [data-failure-task]')).toHaveCount(26);
  await page.evaluate(() => document.fonts.ready);
}

test('outcome labels, exact totals, episode thresholds, tooltips, and filters agree', async ({
  page,
}) => {
  await ready(page);
  const episodes: Episode[] = await (await page.request.get('/data/episodes.json')).json();
  const host = page.locator('#episode-outcomes');
  expect(episodes).toHaveLength(510);
  expect(categories.reduce((sum, category) => sum + category.count, 0)).toBe(510);
  await expect(host.locator('.outcome-name')).toHaveText(categories.map((g) => g.label));
  await expect(host.locator('svg')).toHaveAttribute(
    'aria-label',
    '510 episodes: Complete success 237, Incomplete 188, Failed 85.',
  );
  await expect(host.locator('.outcome-definition')).toHaveText(
    'Complete success: SR = 1; Incomplete: SR = 0 and Score > 0; Failed: SR = 0 and Score = 0.',
  );
  for (const category of categories) {
    const source = episodes.filter(category.test);
    expect(source).toHaveLength(category.count);
    const circles = host.locator(`circle[data-outcome="${category.key}"]`);
    await expect(circles).toHaveCount(category.count);
    expect(await circles.locator('title').allTextContents()).toEqual(
      source.map(
        (episode) =>
          `${taskLabel(episode.task)} / ${episode.seed}: ${category.label} · SR ${episode.sr}, Score ${episode.score}`,
      ),
    );
    const button = host.locator(`[data-outcome-filter="${category.key}"]`);
    await expect(button.locator('strong')).toHaveText(String(category.count));
    await expect(button.locator('small')).toHaveText(
      `${((category.count / 510) * 100).toFixed(1)}% of episodes`,
    );
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(host.locator('.outcome-readout')).toHaveText(
      `${category.label} · ${category.count}/510 episodes (${((100 * category.count) / 510).toFixed(2)}%) highlighted.`,
    );
    expect(
      await host
        .locator('circle')
        .evaluateAll(
          (dots) => dots.filter((dot) => (dot as SVGElement).style.opacity === '1').length,
        ),
    ).toBe(category.count);
    await button.click();
    await expect(host.locator('.outcome-readout')).toHaveText('All 510 episodes shown.');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await circles.first().dispatchEvent('pointerover');
    await expect(host.locator('.outcome-readout')).toHaveText(
      (await circles.first().locator('title').textContent()) || '',
    );
  }
  await expect(host).not.toContainText('Incomplete (positive Score)');
  await expect(host).not.toContainText('Incomplete (zero Score)');
});

test('all 26 task counts and percentages survive expanding, reading, and collapsing to seven', async ({
  page,
}) => {
  await ready(page);
  const [insights, episodes]: [{ tasks: TaskOutcome[] }, Episode[]] = await Promise.all([
    page.request.get('/data/analysis-insights.json').then((r) => r.json()),
    page.request.get('/data/episodes.json').then((r) => r.json()),
  ]);
  const host = page.locator('.outcome-breakdown');
  const rows = host.locator('[data-failure-task]');
  await expect(host.locator('.outcome-split-legend > span')).toHaveText(
    categories.map((g) => g.label),
  );
  await expect(host.locator('[data-failure-task]:visible')).toHaveCount(7);
  const expand = host.locator('.failure-expand');
  await expect(expand).toHaveAccessibleName('Show all 26 tasks');
  await expect(expand.locator('svg')).toHaveCount(1);
  await expect(expand.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  await expand.focus();
  await page.keyboard.press('Enter');
  await expect(host.locator('[data-failure-task]:visible')).toHaveCount(26);
  await expect(expand).toHaveAttribute('aria-expanded', 'true');
  await expect(expand).toHaveText('Show fewer · 7 tasks');
  const totals = { success: 0, partial: 0, zero: 0 };
  for (const task of insights.tasks) {
    const source = episodes.filter((episode) => episode.task === task.task);
    expect(source).toHaveLength(task.n);
    const row = host.locator(`[data-failure-task="${task.task}"]`);
    await expect(row).toHaveAttribute('aria-label', taskSummary(task));
    for (const category of categories) {
      expect(source.filter(category.test)).toHaveLength(task[category.key]);
      totals[category.key] += task[category.key];
      const segment = row.locator(`.outcome-${category.key}`);
      await expect(segment).toHaveAttribute('data-count', String(task[category.key]));
      const percent = (100 * task[category.key]) / task.n;
      const width = await segment.evaluate((element) =>
        parseFloat((element as HTMLElement).style.width),
      );
      expect(width).toBeCloseTo(percent, 4);
      await expect(segment).toHaveText(percent >= 10 ? `${Number(percent.toFixed(2))}%` : '');
    }
    await row.click();
    await expect(host.locator('#failure-readout')).toHaveText(taskSummary(task));
    await expect(row).toHaveAttribute('data-active', '');
    expect(await row.evaluate((element) => element.nextElementSibling?.id)).toBe('failure-readout');
  }
  expect(totals).toEqual({ success: 237, partial: 188, zero: 85 });
  await expand.click();
  await expect(host.locator('[data-failure-task]:visible')).toHaveCount(7);
  await expect(expand).toHaveText('Show all 26 tasks');
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await expect(host.locator('#failure-readout')).toBeEmpty();
  await rows.first().focus();
  await page.keyboard.press('Enter');
  await expect(host.locator('#failure-readout')).toHaveText(
    (await rows.first().getAttribute('aria-label')) || '',
  );
  await expect(host.locator('#failure-readout')).toBeVisible();
});

test('task rows are a continuous unboxed chart with in-flow readouts and no narrow-screen overflow', async ({
  page,
}) => {
  await ready(page);
  const host = page.locator('.outcome-breakdown');
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const first = host.locator('[data-failure-task]').first();
    await first.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const styles = await first.evaluate((row) => {
      const css = getComputedStyle(row);
      return {
        borders: [
          css.borderTopWidth,
          css.borderRightWidth,
          css.borderBottomWidth,
          css.borderLeftWidth,
        ],
        radius: css.borderRadius,
        shadow: css.boxShadow,
        background: css.backgroundColor,
      };
    });
    expect(styles).toEqual({
      borders: ['0px', '0px', '0px', '0px'],
      radius: '0px',
      shadow: 'none',
      background: 'rgba(0, 0, 0, 0)',
    });
    await expect(host.locator('.failure-expand')).toHaveCSS('border-top-width', '0px');
    await expect(host.locator('.failure-expand')).toHaveCSS('border-bottom-width', '0px');
    await first.hover();
    await expect(first).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await first.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(first).toHaveCSS('outline-style', 'solid');
    const readout = host.locator('#failure-readout');
    await expect(readout).toHaveCSS('position', 'static');
    const firstBox = await first.boundingBox();
    const readoutBox = await readout.boundingBox();
    const secondBox = await host.locator('[data-failure-task]').nth(1).boundingBox();
    expect(readoutBox!.y).toBeGreaterThanOrEqual(firstBox!.y + firstBox!.height - 1);
    expect(secondBox!.y).toBeGreaterThanOrEqual(readoutBox!.y + readoutBox!.height - 1);
    await host.locator('.failure-expand').click();
    const layout = await page.evaluate(() => {
      const chart = document.querySelector('.outcome-breakdown')!.getBoundingClientRect();
      return {
        overflow: Math.max(
          ...[
            document.querySelector('.outcome-breakdown')!,
            document.querySelector('#episode-outcomes')!,
          ].map((element) => element.scrollWidth - element.clientWidth),
        ),
        outside: [
          ...document.querySelectorAll(
            '.outcome-breakdown [data-failure-task], .outcome-breakdown .outcome-split-track, #episode-outcomes svg, #episode-outcomes .outcome-legend',
          ),
        ].some((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < chart.left - 1 || rect.right > chart.right + 1;
        }),
      };
    });
    expect(layout.overflow).toBeLessThanOrEqual(1);
    expect(layout.outside).toBe(false);
    await host.locator('.failure-expand').click();
  }
});

test('trait filters narrow the task list without moving the default', async ({
  page,
}) => {
  await ready(page);
  const host = page.locator('.outcome-breakdown');
  const rows = host.locator('[data-failure-task]');
  const filters = host.locator('[data-trait-filter]');
  const counts = () =>
    filters.evaluateAll((buttons) =>
      buttons.map(
        (b) =>
          `${(b as HTMLElement).dataset.value}:${b.querySelector('[data-trait-count]')!.textContent}`,
      ),
    );
  // Every row shows two decorative marks; the filter row is their legend.
  await expect(host.locator('[data-failure-task] .task-tags svg')).toHaveCount(52);
  for (const mark of await host.locator('[data-failure-task] .task-tags svg').all())
    await expect(mark).toHaveAttribute('aria-hidden', 'true');
  expect(await counts()).toEqual(['Low:14', 'Medium:8', 'High:4', 'Short:11', 'Long:15']);
  await expect(host.locator('[data-failure-task]:visible')).toHaveCount(7);
  await host.locator('[data-trait-filter="horizon"][data-value="Long"]').click();
  // A filter queries all 26 tasks, so it can show more rows than the seven-task default.
  await expect(host.locator('[data-failure-task]:visible')).toHaveCount(15);
  expect(
    await rows.evaluateAll((all) =>
      all.filter((r) => !(r as HTMLElement).hidden).every((r) => (r as HTMLElement).dataset.horizon === 'Long'),
    ),
  ).toBe(true);
  await expect(host.locator('.failure-expand')).toBeHidden();
  // Counts on each axis are conditioned on the selection made on the other.
  expect(await counts()).toEqual(['Low:6', 'Medium:6', 'High:3', 'Short:11', 'Long:15']);
  await expect(host.locator('.outcome-filter-status')).toHaveText('Showing 15 of 26 tasks: long horizon.');
  const high = host.locator('[data-trait-filter="precision"][data-value="High"]');
  await high.click();
  await expect(host.locator('[data-failure-task]:visible')).toHaveCount(3);
  await expect(high).toHaveAttribute('aria-pressed', 'true');
  expect(await counts()).toEqual(['Low:6', 'Medium:6', 'High:3', 'Short:1', 'Long:3']);
  await expect(host.locator('.outcome-filter-status')).toHaveText(
    'Showing 3 of 26 tasks: high precision, long horizon.',
  );
  // Choosing another value on the same axis replaces the first.
  await host.locator('[data-trait-filter="precision"][data-value="Low"]').click();
  await expect(host.locator('[data-failure-task]:visible')).toHaveCount(6);
  await expect(high).toHaveAttribute('aria-pressed', 'false');
  await expect(host.locator('.outcome-filter-status')).toHaveText(
    'Showing 6 of 26 tasks: low precision, long horizon.',
  );
  // Clearing returns to the seven-task default with its expand control intact.
  await host.locator('.outcome-trait-clear').click();
  await expect(host.locator('[data-failure-task]:visible')).toHaveCount(7);
  await expect(host.locator('.failure-expand')).toHaveAccessibleName('Show all 26 tasks');
  await expect(host.locator('.outcome-trait-clear')).toBeHidden();
});
