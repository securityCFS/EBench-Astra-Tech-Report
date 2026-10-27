import { test, expect } from '@playwright/test';

async function ready(page) {
  await page.goto('/');
  await expect(page.locator('#benchmark-matrix .benchmark-table')).toBeVisible();
}

test('the generalization tab states its scope and lists every system', async ({ page }) => {
  await ready(page);
  await expect(page.locator('[data-appendix]')).toHaveCount(0);
  await expect(page.locator('#matrix-scope-note')).toBeHidden();
  await page.locator('[data-matrix="shifts"]').click();
  await expect(page.locator('#matrix-scope-note')).toHaveText(
    'Task-averaged results under the Object, Background, Instruction, and Mix dimensions.',
  );
  await page.locator('[data-shift-view="range"]').click();
  await expect(page.locator('.perturbation-range-table tbody tr')).toHaveCount(9);
  await expect(page.locator('#matrix-scope-note')).toBeVisible();
});

test('all video close paths restore the original filtered table without rebuilding it', async ({
  page,
}) => {
  await ready(page);
  await page.locator('[data-matrix="tasks"]').click();
  const explorer = page.locator('#matrix-content .task-explorer');
  await explorer.getByRole('searchbox').fill('peg');
  await explorer.locator('[data-task-metric="score"]').click();
  const table = explorer.locator('table');
  await table.evaluate((el) => {
    el.dataset.originalTable = 'true';
  });
  const trigger = table.locator('[data-task-video]').first();
  for (const close of ['back', 'escape', 'close']) {
    await trigger.click();
    await expect(page.locator('#appendix-dialog')).toHaveAttribute('data-content', 'task-video');
    await expect(page.locator('#appendix-body table')).toHaveCount(0);
    if (close === 'back')
      await page.getByRole('button', { name: 'Back to results', exact: true }).click();
    else if (close === 'escape') await page.keyboard.press('Escape');
    else await page.getByRole('button', { name: 'Close supplementary material' }).click();
    await expect(page.locator('#appendix-dialog')).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(table).toHaveAttribute('data-original-table', 'true');
    await expect(explorer.getByRole('searchbox')).toHaveValue('peg');
    await expect(explorer.locator('[data-task-metric="score"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  }
  await page.locator('[data-matrix="field"]').click();
  const field = page.locator('.viz-diverge[data-task="apple_to_fruit_bowl"]');
  await field.focus();
  await field.press('Enter');
  await expect(page.locator('#appendix-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(field).toBeFocused();
  await expect(page.locator('[data-matrix="field"]')).toHaveAttribute('aria-selected', 'true');
});
