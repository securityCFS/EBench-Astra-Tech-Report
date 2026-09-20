import { test, expect } from '@playwright/test';

test('shared icons stay compact and masthead actions do not wrap', async ({ page }) => {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const icons = page.locator('.hero-actions svg, .demonstration-card svg');
    await expect(icons).toHaveCount(3);
    for (const svg of await icons.all()) {
      await expect(svg).toHaveAttribute('aria-hidden', 'true');
      const box = await svg.boundingBox();
      expect(box!.width).toBeGreaterThan(10);
      expect(box!.width).toBeLessThanOrEqual(24);
      expect(box!.height).toBeLessThanOrEqual(24);
    }
    await expect(page.locator('.hero-primary')).toHaveCSS('white-space', 'nowrap');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
  }
});

test('overall table sorts both metrics and keeps the Astra summary and footnote in sync', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const rows = page.locator('.overall-comparison tbody tr');
  const srButton = page.locator('button[data-overall-sort="sr"]');
  const scoreButton = page.locator('button[data-overall-sort="score"]');
  await expect(rows).toHaveCount(9);
  await expect(page.getByRole('heading', { name: 'Comparison across models' })).toHaveCount(1);
  await expect(page.locator('#overall-content button')).toHaveCount(2);
  await expect(page.locator('#overall-content [data-chart]')).toHaveCount(0);

  async function expectRanking(metric: 'sr' | 'score', astraPosition: number) {
    const entries = await rows.evaluateAll(
      (elements, metric) =>
        elements.map((element) => ({
          key: (element as HTMLElement).dataset.key,
          value: Number((element as HTMLElement).dataset[metric]),
          rank: element.querySelector('.overall-rank')?.textContent?.trim(),
        })),
      metric,
    );
    expect(entries.every((entry) => Number.isFinite(entry.value))).toBeTruthy();
    expect(entries.map((entry) => entry.value)).toEqual(
      entries.map((entry) => entry.value).sort((a, b) => b - a),
    );
    expect(entries.map((entry) => entry.rank)).toEqual(
      Array.from({ length: 9 }, (_, index) => String(index + 1)),
    );
    expect(entries[astraPosition - 1].key).toBe('Astra (ICL)');
    await expect(page.locator('.overall-value')).toHaveText(metric === 'sr' ? '46.73' : '0.6537');
    await expect(page.locator('.overall-unit')).toHaveText(metric === 'sr' ? '%' : 'Score');
    await expect(page.locator('.overall-position')).toHaveText(`${astraPosition}/9`);
    await expect(
      page.locator(`.overall-comparison th:has(button[data-overall-sort="${metric}"])`),
    ).toHaveAttribute('aria-sort', 'descending');
    await expect(page.locator('.overall-comparison [aria-sort="descending"]')).toHaveCount(1);
    const footnote = rows.filter({ has: page.locator('#comparison-note-ref') });
    await expect(footnote).toHaveAttribute('data-key', 'AMapbot');
    await expect(footnote.locator('.overall-rank')).toHaveText(metric === 'sr' ? '2' : '3');
    await expect(page.locator('#comparison-note-ref')).toHaveText('1');
    await expect(page.locator('#comparison-note-ref')).toHaveAttribute('href', '#comparison-note');
  }

  await expectRanking('sr', 3);
  await scoreButton.click();
  await expectRanking('score', 2);
  await srButton.focus();
  await srButton.press('Enter');
  await expectRanking('sr', 3);
  const colors = await page
    .locator('.overall-comparison .highlight > *')
    .evaluateAll((cells) => cells.map((cell) => getComputedStyle(cell).backgroundColor));
  expect(new Set(colors).size).toBe(1);
  expect(colors[0]).not.toBe('rgba(0, 0, 0, 0)');
  const summary = await page.locator('.overall-summary').boundingBox();
  const body = await page.locator('.overall-comparison tbody').boundingBox();
  expect(summary!.x + summary!.width).toBeLessThanOrEqual(body!.x);
  expect(Math.abs(summary!.y + summary!.height / 2 - body!.y - body!.height / 2)).toBeLessThan(30);
});

test('seeking does not insert a buffering message or shift playback controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.execution-demo video')).toHaveCount(1);
  await expect(page.locator('.execution-demo [data-counter]')).toContainText('Interaction');
  const control = page.locator('.execution-demo .episode-controls');
  await control.scrollIntoViewIfNeeded();
  const before = await control.boundingBox();
  await page
    .locator('.execution-demo video')
    .evaluate((video) => video.dispatchEvent(new Event('waiting')));
  await expect(page.locator('.execution-demo .episode-caption')).toBeEmpty();
  const after = await control.boundingBox();
  expect(after!.y).toBeCloseTo(before!.y, 1);
  const stem = await page
    .locator('.episode-chapter')
    .first()
    .evaluate((e) => getComputedStyle(e, '::before').content);
  expect(['none', 'normal']).toContain(stem);
});
