import { test, expect, type Page } from '@playwright/test';

type Task = {
  task: string;
  mobility: string;
  precision: string;
  horizon: string;
};
type Recording = { task: string; path: string; sr: number; score: number };

async function openLibrary(page: Page) {
  await page.goto('/');
  await expect(page.locator('#library-count')).toHaveText('26 tasks · 1–6 shown');
  await page.locator('.recording-library > summary').click();
  await expect(page.locator('#demo-search')).toBeVisible();
}

async function paths(page: Page) {
  return page
    .locator('#library-grid video')
    .evaluateAll((videos) => videos.map((video) => (video as HTMLVideoElement).dataset.src));
}

test('recorded cases use a compact native disclosure from 320px to 1440px', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const library = page.locator('.recording-library');
  const summary = library.locator('summary');
  await expect(summary.locator('strong')).toHaveText('More recorded cases');
  await expect(summary).toContainText('Selected GPT-6-Astra rollouts across all 26 tasks');
  await expect(summary.locator('svg')).toHaveCount(1);
  await expect(summary.locator('svg')).toHaveAttribute('aria-hidden', 'true');

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(library).not.toHaveAttribute('open');
    await expect(page.locator('#demo-search')).not.toBeVisible();
    const box = await summary.boundingBox();
    const detailsBox = await library.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeLessThanOrEqual(110);
    expect(detailsBox!.height - box!.height).toBeLessThanOrEqual(3);
    const spacing = await library.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        top: parseFloat(style.marginTop),
        bottom: parseFloat(style.marginBottom),
        padding: parseFloat(style.paddingTop) + parseFloat(style.paddingBottom),
      };
    });
    expect(spacing.top).toBeLessThanOrEqual(24);
    expect(spacing.bottom).toBe(0);
    expect(spacing.padding).toBe(0);
    expect((await summary.locator('svg').boundingBox())!.width).toBeLessThanOrEqual(20);

    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(library).toHaveAttribute('open', '');
    await expect(library.locator('.recording-library__chevron')).toHaveCSS(
      'transform',
      'matrix(-1, 0, 0, -1, 0, 0)',
    );
    const overflow = await library.evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    for (const control of await library.locator('input, select').all()) {
      const controlBox = await control.boundingBox();
      expect(controlBox!.x).toBeGreaterThanOrEqual(0);
      expect(controlBox!.x + controlBox!.width).toBeLessThanOrEqual(width);
    }
    await summary.focus();
    await page.keyboard.press('Space');
    await expect(library).not.toHaveAttribute('open');
    await expect(library.locator('.recording-library__chevron')).toHaveCSS('transform', 'none');
  }
});

test('all 26 original task recordings remain accessible six per page', async ({
  page,
  request,
}) => {
  const tasks: Task[] = await (await request.get('/data/tasks.json')).json();
  const recordings: Recording[] = await (await request.get('/data/demo-videos.json')).json();
  const selected = tasks.map((task) =>
    recordings.find((recording) => recording.task === task.task)!,
  );
  await openLibrary(page);
  await expect(page.locator('#demo-prev')).toBeDisabled();
  const seen: (string | undefined)[] = [];
  for (let index = 0; index < 5; index++) {
    const expected = selected.slice(index * 6, index * 6 + 6);
    await expect(page.locator('#library-grid video')).toHaveCount(expected.length);
    await expect(page.locator('#demo-page')).toHaveText(`${index + 1} / 5`);
    await expect(page.locator('#library-count')).toHaveText(
      `26 tasks · ${index * 6 + 1}–${Math.min(index * 6 + 6, 26)} shown`,
    );
    const current = await paths(page);
    expect(current).toEqual(expected.map((recording) => recording.path));
    seen.push(...current);
    if (index < 4) await page.locator('#demo-next').click();
  }
  expect(new Set(seen).size).toBe(26);
  await expect(page.locator('#demo-next')).toBeDisabled();
  await page.locator('#demo-prev').click();
  await expect(page.locator('#demo-page')).toHaveText('4 / 5');
  expect(await paths(page)).toEqual(selected.slice(18, 24).map((recording) => recording.path));
});

test('search, task attributes, outcomes, and empty states compose and reset pagination', async ({
  page,
  request,
}) => {
  const tasks: Task[] = await (await request.get('/data/tasks.json')).json();
  const recordings: Recording[] = await (await request.get('/data/demo-videos.json')).json();
  const selected = tasks.map((task) => ({
    task,
    recording: recordings.find((recording) => recording.task === task.task)!,
  }));
  await openLibrary(page);
  await page.locator('#demo-next').click();
  await page.locator('#demo-search').fill('APPLE');
  await expect(page.locator('#demo-page')).toHaveText('1 / 1');
  await expect(page.locator('#library-grid video')).toHaveCount(2);
  await page.locator('#demo-search').fill('');

  for (const outcome of ['success', 'incomplete', 'failed']) {
    await page.locator('#demo-outcome').selectOption(outcome);
    const matches = selected.filter(({ recording }) =>
      outcome === 'success'
        ? recording.sr === 1
        : recording.sr === 0 &&
          (outcome === 'failed' ? recording.score === 0 : recording.score > 0),
    );
    await expect(page.locator('#library-count')).toHaveText(
      `${matches.length} tasks · ${matches.length ? 1 : 0}–${Math.min(6, matches.length)} shown`,
    );
    expect(await paths(page)).toEqual(matches.slice(0, 6).map(({ recording }) => recording.path));
    for (const badge of await page.locator('#library-grid .video-label > span').all()) {
      await expect(badge).toContainText(outcome[0].toUpperCase() + outcome.slice(1));
    }
  }

  await page.locator('#demo-outcome').selectOption('all');
  await page.locator('#demo-group').selectOption('mobility:Fixed');
  const tabletop = selected.filter(({ task }) => task.mobility === 'Fixed');
  expect(await paths(page)).toEqual(tabletop.slice(0, 6).map(({ recording }) => recording.path));
  await page.locator('#demo-outcome').selectOption('incomplete');
  const incompleteTabletop = tabletop.filter(
    ({ recording }) => !recording.sr && recording.score > 0,
  );
  expect(await paths(page)).toEqual(
    incompleteTabletop.slice(0, 6).map(({ recording }) => recording.path),
  );

  await page.locator('#demo-search').fill('no-such-recording');
  await expect(page.locator('#library-grid')).toHaveText('No tasks match these filters.');
  await expect(page.locator('#library-count')).toHaveText('0 tasks · 0–0 shown');
  await expect(page.locator('#demo-page')).toHaveText('1 / 1');
  await expect(page.locator('#demo-prev')).toBeDisabled();
  await expect(page.locator('#demo-next')).toBeDisabled();
  await page.locator('#demo-search').fill('');
  await page.locator('#demo-group').selectOption('all');
  await page.locator('#demo-outcome').selectOption('all');
  await expect(page.locator('#library-count')).toHaveText('26 tasks · 1–6 shown');
});

test('a zero-score unsuccessful recording is labeled Failed without losing its video', async ({
  page,
}) => {
  let failedPath = '';
  await page.route('**/data/demo-videos.json', async (route) => {
    const response = await route.fetch();
    const recordings: Recording[] = await response.json();
    const recording = recordings.find((item) => item.task === 'bottle')!;
    recording.score = 0;
    failedPath = recording.path;
    await route.fulfill({ response, json: recordings });
  });
  await openLibrary(page);
  await page.locator('#demo-outcome').selectOption('failed');
  await expect(page.locator('#library-grid .video-label > span')).toHaveText('Failed (Score 0.00)');
  expect(await paths(page)).toEqual([failedPath]);
  await page.locator('#demo-outcome').selectOption('incomplete');
  expect(await paths(page)).not.toContain(failedPath);
  await page.locator('#demo-outcome').selectOption('all');
  await expect(page.locator('#library-count')).toHaveText('26 tasks · 1–6 shown');
});

test('the disclosure works with JavaScript disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  const summary = page.locator('.recording-library > summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#demo-search')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.locator('#demo-search')).not.toBeVisible();
  await context.close();
});
