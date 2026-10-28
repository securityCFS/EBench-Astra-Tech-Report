import { test, expect } from '@playwright/test';

test('harness section lists the five configurations and switches its cases', async ({ page }) => {
  await page.goto('/');
  const rows = page.locator('#harness-table tbody tr');
  await expect(rows).toHaveCount(5);
  await expect(page.locator('#harness-table tbody tr.astra-row')).toHaveCount(3);
  await expect(rows.nth(4).locator('td').first()).toHaveText('56.0');
  await expect(rows.nth(2).locator('td').first()).toHaveText('53.0');

  const gain = page.locator('#case-harness-gain');
  await expect(gain.locator('.case-videos video')).toHaveCount(3);
  await expect(gain.locator('.case-model-tabs button')).toHaveCount(4);
  await gain.locator('[data-harness-case="harness-gain:flip"]').click();
  await expect(gain.locator('[data-harness-case="harness-gain:flip"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(gain.locator('.case-videos video')).toHaveCount(2);
  await expect(gain.locator('.case-videos')).toContainText('Success (Score 1.000)');

  const loss = page.locator('#case-harness-loss');
  await expect(loss.locator('h4')).toHaveText('A completion claim on an unseated gear');
  await loss.locator('[data-harness-case="harness-loss:teacup"]').click();
  await expect(loss.locator('h4')).toHaveText('A recovery segment undoes a completed stage');
  await expect(loss.locator('.case-videos video')).toHaveCount(3);
  await expect(loss.locator('.case-insight')).toContainText('reports nothing back');
});
