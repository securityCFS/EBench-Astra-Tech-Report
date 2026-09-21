import { test, expect } from '@playwright/test';

test('field tooltip keeps model maths inline and values aligned', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-matrix="field"]').click();
  await page.locator('[data-matrix-metric="score"]').click();
  const task = page.locator('.viz-diverge[data-task="apple_to_fruit_bowl"]');
  await task.focus();
  const tip = page.locator('.viz-tip');
  await expect(tip).toBeVisible();
  await expect(tip.locator('.viz-tip-row')).toHaveCount(8);
  await expect(tip.locator('.model-math')).toHaveCount(2);
  const shapes = await tip.locator('.viz-tip-row').evaluateAll((rows) =>
    rows.map((row) => {
      const name = row.querySelector('dt')!.getBoundingClientRect();
      const value = row.querySelector('dd')!.getBoundingClientRect();
      return { nameHeight: name.height, valueTop: value.top, nameTop: name.top };
    }),
  );
  for (const shape of shapes) {
    expect(shape.nameHeight).toBeLessThan(30);
    expect(Math.abs(shape.valueTop - shape.nameTop)).toBeLessThan(5);
  }
  expect((await tip.boundingBox())!.height).toBeLessThan(400);
  await expect(tip.locator('.is-highlighted dd')).toHaveText('0.9000');
  await expect(tip.locator('.viz-tip-delta strong')).toHaveText('-0.0500');
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
});

test('variation table scrolls locally on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('[data-matrix="shifts"]').click();
  await page.locator('[data-shift-view="range"]').click();
  await expect(page.locator('.perturbation-range-table tbody tr')).toHaveCount(8);
  const geometry = await page
    .locator('.matrix-perturbation-ranges .table-scroll')
    .evaluate((el) => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      frame: el.clientWidth,
      content: el.scrollWidth,
    }));
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.content).toBeGreaterThan(geometry.frame);
  await expect(page.locator('.perturbation-range-table [aria-sort]')).toHaveAttribute(
    'aria-sort',
    'ascending',
  );
});
