import { test, expect } from '@playwright/test';

test('harness section lists the five configurations and switches its cases', async ({ page }) => {
  await page.goto('/');
  const rows = page.locator('#harness-table tbody tr');
  await expect(rows).toHaveCount(5);
  await expect(page.locator('#harness-table tbody tr.astra-row')).toHaveCount(3);
  await expect(rows.nth(4).locator('td').first()).toHaveText('56.0');
  await expect(rows.nth(2).locator('td').first()).toHaveText('53.0');
  await page.locator('[data-harness-view="shifts"]').click();
  await expect(page.locator('#harness-table thead')).toContainText('Mixed');
  await expect(rows.nth(2).locator('td').nth(4)).toHaveText('56.2');
  await expect(rows.nth(4).locator('td').nth(5)).toHaveText('53.1');

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

test('harness figures follow one policy switch and report the paper counts', async ({ page }) => {
  await page.goto('/');
  const tasks = page.locator('#harness-tasks'),
    episodes = page.locator('#harness-episodes'),
    delegation = page.locator('#harness-delegation');
  await expect(tasks.locator('.viz-gain')).toHaveCount(26);
  await expect(tasks.locator('.field-summary b')).toHaveText(['10', '3', '13']);
  await expect(tasks.locator('.viz-gain').first()).toContainText('Glass into glassbox');
  await expect(episodes.locator('.field-summary b')).toHaveText(['+91', '−59', '+32']);
  await expect(delegation.locator('.field-summary b').first()).toHaveText('66.9%');

  // Camera controls appear under the case videos above once their metadata loads, which can move the switch mid-click.
  await expect(async () => {
    await episodes.locator('[data-harness-policy="1"]').click();
    await expect(episodes.locator('[data-harness-policy="1"]')).toHaveAttribute(
      'aria-pressed',
      'true',
      { timeout: 1000 },
    );
  }).toPass();
  for (const figure of [tasks, episodes, delegation])
    await expect(figure.locator('[data-harness-policy="1"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  await expect(tasks.locator('.field-summary b')).toHaveText(['8', '7', '11']);
  await expect(episodes.locator('.field-summary b')).toHaveText(['+96', '−49', '+47']);
  await expect(delegation.locator('.field-summary b')).toHaveText([
    '65.4%',
    '3.8 vs. 6.8',
    '5.8% vs. 20.7%',
  ]);
  await expect(delegation.locator('.viz-share-tenth')).toHaveCount(10);

  const cost = page.locator('#harness-cost');
  await expect(cost.locator('.harness-kpi').first()).toContainText('8.1M');
  await expect(cost.locator('.harness-kpi').nth(1)).toContainText('$4.99');
  await expect(cost.locator('.viz-paired')).toHaveCount(12);

  const tip = page.locator('.viz-tip'),
    first = tasks.locator('.viz-gain').first();
  await first.scrollIntoViewIfNeeded();
  await first.focus();
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('Steps executed by InternW0-Δ');
});
