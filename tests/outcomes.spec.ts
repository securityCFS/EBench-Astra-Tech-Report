import { test, expect, type Page } from '@playwright/test';

type Episode = { task: string; seed: string; sr: number; score: number };
const categories = [
  { key: 'success', label: 'Complete success', count: 237, test: (e: Episode) => e.sr === 1 },
  {
    key: 'partial',
    label: 'Partial credit',
    count: 188,
    test: (e: Episode) => e.sr === 0 && e.score > 0,
  },
  {
    key: 'zero',
    label: 'Score of zero',
    count: 85,
    test: (e: Episode) => e.sr === 0 && e.score === 0,
  },
] as const;
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('#episode-outcomes circle')).toHaveCount(510);
  await page.evaluate(() => document.fonts.ready);
}

test('outcome labels, exact totals, episode thresholds, tooltips, and filters agree', async ({
  page,
}) => {
  await ready(page);
  const episodes: Episode[] = await (await page.request.get('/data/episodes.json')).json();
  // Task names follow the appendix tables of the paper.
  const { tasks } = await (await page.request.get('/data/report-figures.json')).json();
  const taskLabel = (task: string) => tasks.find((t) => t.task === task).label;
  const host = page.locator('#episode-outcomes');
  expect(episodes).toHaveLength(510);
  expect(categories.reduce((sum, category) => sum + category.count, 0)).toBe(510);
  await expect(host.locator('.outcome-name')).toHaveText(categories.map((g) => g.label));
  await expect(host.locator('svg')).toHaveAttribute(
    'aria-label',
    '510 episodes: Complete success 237, Partial credit 188, Score of zero 85.',
  );
  await expect(host.locator('.outcome-definition')).toHaveText(
    'Complete success: SR = 1. Partial credit: SR = 0 and Score > 0. Score of zero: SR = 0 and Score = 0.',
  );
  for (const category of categories) {
    const source = episodes.filter(category.test);
    expect(source).toHaveLength(category.count);
    const circles = host.locator(`circle[data-outcome="${category.key}"]`);
    await expect(circles).toHaveCount(category.count);
    expect(await circles.locator('title').allTextContents()).toEqual(
      source.map(
        (episode) =>
          `${taskLabel(episode.task)} / ${episode.seed}: ${category.label} · SR ${episode.sr}, Score ${Number(episode.score).toFixed(3)}`,
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
      `${category.label} · ${category.count}/510 episodes (${((100 * category.count) / 510).toFixed(1)}%) highlighted.`,
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
});
