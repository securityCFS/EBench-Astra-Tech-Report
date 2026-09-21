import { test, expect } from '@playwright/test';

const retired = [
  'full-comparison',
  'results',
  'generalization',
  'protocol',
  'attributes',
  'horizon',
  'behavior',
  'limitations',
  'study-limitations',
];

async function ready(page) {
  await page.goto('/');
  await expect(page.locator('#benchmark-matrix .benchmark-table')).toBeVisible();
}

test('retired supplements disappear while canonical results retain their context', async ({
  page,
}) => {
  await ready(page);
  for (const key of retired) await expect(page.locator(`[data-appendix="${key}"]`)).toHaveCount(0);
  await expect(page.locator('#matrix-scope-note')).toBeHidden();
  await expect(page.locator('#matrix-scope-note')).toBeEmpty();
  await expect(
    page.locator('a[href="#study-limitations"], #study-limitations-content, .research-questions'),
  ).toHaveCount(0);
  await page.locator('[data-matrix="shifts"]').click();
  await expect(page.locator('#matrix-scope-note')).toContainText('60 of 130');
  await expect(page.locator('#matrix-scope-note')).toContainText('OpenWAM-α completes 58');
  await page.locator('[data-shift-view="range"]').click();
  await expect(page.locator('.perturbation-range-table tbody tr')).toHaveCount(8);
  await expect(page.locator('#matrix-scope-note')).toBeVisible();
  await page.locator('[data-limit="horizon"]').click();
  await page.locator('[data-behavior="coffee"]').click();
  for (const key of retired) await expect(page.locator(`[data-appendix="${key}"]`)).toHaveCount(0);
  await expect(page.locator('#behavior-content')).toContainText('Score 0.50');
});

test('execution timing appears inline before the demo with unchanged source values', async ({
  page,
}) => {
  await ready(page);
  await expect(page.locator('#evaluation-protocol')).toHaveCount(0);
  const timing = page.locator('#execution-timing');
  await expect(
    timing.getByRole('heading', { name: 'Execution timing', exact: true }),
  ).toBeVisible();
  const source = await (await page.request.get('/data/execution-timing.json')).json();
  await expect(timing.locator('tbody tr')).toHaveCount(source.episodes.length);
  for (const episode of source.episodes) {
    await expect(timing.locator(`tr[data-episode="${episode.episode}"] td`)).toHaveText([
      episode.policy_physics_steps.toLocaleString('en-US'),
      episode.simulated_execution_s.toFixed(2),
      episode.policy_elapsed_s.toFixed(2),
      episode.max_action_sim_s.toFixed(2),
    ]);
  }
  expect(
    await timing.evaluate((el) =>
      Boolean(
        el.compareDocumentPosition(document.querySelector('#episode-interactions')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ),
  ).toBe(true);
  await expect(page.locator('#appendix-dialog')).not.toBeVisible();
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
