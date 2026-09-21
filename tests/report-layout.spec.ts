import { test, expect } from '@playwright/test';

async function ready(page) {
  await page.goto('/');
  await expect(page.locator('#overall-content')).toContainText('AMapbot');
  await expect(page.locator('#fixed-task-evidence table')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function geometry(page) {
  return page.evaluate(() => {
    const box = (e: Element) => {
      const r = e.getBoundingClientRect();
      return { left: r.left, right: r.right, center: (r.left + r.right) / 2 };
    };
    const reference = box(document.querySelector('#introduction .section-inner')!);
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      reference,
      headline: box(document.querySelector('.hero-copy h1')!),
      sections: [...document.querySelectorAll('main>.section>.section-inner')].map(box),
      setup: [
        ...document.querySelectorAll(
          '#setup .section-inner>h2,#setup .section-inner>.report-prose',
        ),
      ].map(box),
      font: getComputedStyle(document.body).fontFamily,
      loaded: document.fonts.check('20px "STIX Two Text"'),
    };
  });
}
test('consistent reading edges and center after resizing and restoring', async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 1100 });
  await ready(page);
  const initial = await geometry(page);
  for (const width of [1440, 1280, 960, 768, 640, 390, 1800]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(async () => (await geometry(page)).overflow).toBeLessThanOrEqual(1);
    const g = await geometry(page);
    expect(g.loaded).toBeTruthy();
    expect(g.font).toContain('STIX Two Text');
    expect(Math.abs(g.headline.center - g.reference.center)).toBeLessThan(1);
    for (const b of [...g.sections, ...g.setup]) {
      expect(Math.abs(b.left - g.reference.left)).toBeLessThan(1);
      expect(Math.abs(b.right - g.reference.right)).toBeLessThan(1);
    }
  }
  const restored = await geometry(page);
  expect(restored.reference).toEqual(initial.reference);
});
test('text scaling to 125% and 200% restores without stale geometry', async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 1100 });
  await ready(page);
  const initial = await geometry(page);
  for (const size of ['20px', '32px', '16px']) {
    await page.evaluate((size) => {
      document.documentElement.style.fontSize = size;
    }, size);
    await expect.poll(async () => (await geometry(page)).overflow).toBeLessThanOrEqual(1);
    const g = await geometry(page);
    expect(Math.abs(g.headline.center - g.reference.center)).toBeLessThan(1);
  }
  expect((await geometry(page)).reference).toEqual(initial.reference);
});
test('contents toggle centers the report and dialog always exposes Close', async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 1100 });
  await ready(page);
  const initial = await geometry(page);
  await page.getByRole('button', { name: 'Toggle Contents' }).click();
  const viewportCenter = await page.evaluate(() => document.documentElement.clientWidth / 2);
  await expect
    .poll(async () => Math.abs((await geometry(page)).reference.center - viewportCenter))
    .toBeLessThan(1);
  await page.getByRole('button', { name: 'Toggle Contents' }).click();
  await expect.poll(async () => (await geometry(page)).reference).toEqual(initial.reference);
  await page.locator('#model-references a').click();
  const close = page.getByRole('button', { name: 'Close supplementary material' });
  await expect(close).toBeVisible();
  await page.locator('#appendix-body').evaluate((e) => {
    e.scrollTop = e.scrollHeight;
  });
  const b = await close.boundingBox();
  expect(b!.y).toBeGreaterThanOrEqual(0);
  expect(b!.y + b!.height).toBeLessThan(1100);
  await close.click();
  await expect(page.locator('dialog')).not.toBeVisible();
});
test('tables, cases, video stages, and references retain their interactions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await ready(page);
  await page.locator('[data-matrix="tasks"]').click();
  await expect(page.locator('#matrix-content')).toContainText('Task');
  await page.locator('[data-matrix="attributes"]').click();
  await expect(page.locator('#matrix-content')).toContainText('OpenWAM');
  const outcome = page.locator('#case-adapt').getByRole('button', { name: 'Outcome', exact: true });
  await outcome.click();
  try {
    await expect
      .poll(
        () =>
          page
            .locator('#case-adapt video')
            .evaluateAll(
              (videos) =>
                videos.filter((v: HTMLVideoElement) => !v.paused && v.currentTime > 0).length,
            ),
        { timeout: 30000 },
      )
      .toBeGreaterThan(0);
  } catch (error) {
    const state = await page.locator('#case-adapt video').evaluateAll((videos) =>
      videos.map((v: HTMLVideoElement) => ({
        paused: v.paused,
        time: v.currentTime,
        ready: v.readyState,
        error: v.error?.message,
        source: v.currentSrc,
      })),
    );
    throw new Error(JSON.stringify(state) + '\n' + error);
  }
  await expect(page.locator('.citation-prompt')).toHaveText(
    'If you find this work useful, please cite:',
  );
  await expect(page.locator('.report-reference-list li')).toHaveCount(9);
});
for (const dpr of [1, 1.25, 2])
  test(`DPR ${dpr}: narrow window restores to the same layout`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      deviceScaleFactor: dpr,
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await ready(page);
    const initial = await geometry(page);
    await page.setViewportSize({ width: 720, height: 700 });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect.poll(async () => (await geometry(page)).reference).toEqual(initial.reference);
    expect((await geometry(page)).overflow).toBeLessThanOrEqual(1);
    await context.close();
  });
