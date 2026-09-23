import { test, expect, type Locator } from '@playwright/test';

async function indicatorAligned(control: Locator) {
  await expect(control.locator('.segmented-control__indicator')).toHaveCount(1);
  await expect
    .poll(() =>
      control.evaluate((el) => {
        const selected = el.querySelector<HTMLElement>('[aria-pressed="true"]')!;
        const indicator = el.querySelector<HTMLElement>('.segmented-control__indicator')!;
        const selectedBox = selected.getBoundingClientRect();
        const indicatorBox = indicator.getBoundingClientRect();
        return Math.max(
          Math.abs(indicatorBox.left - selectedBox.left),
          Math.abs(indicatorBox.width - selectedBox.width),
        );
      }),
    )
    .toBeLessThan(1);
}

test('model tabs stay left of Play all in one row, including five POC choices', async ({
  page,
}) => {
  await page.goto('/');
  const adaptTabs = page.locator('#case-adapt .case-model-tabs button');
  await expect(adaptTabs).toHaveText(['Compare all', 'GPT-6-Astra', /π/, 'OpenWAM-α']);
  // π₀.₅ is typeset by KaTeX like every other model name.
  await expect(adaptTabs.nth(2).locator('annotation[encoding="application/x-tex"]')).toHaveText(
    String.raw`\pi_{0.5}`,
  );
  await expect(page.locator('#case-poc .case-model-tabs button')).toHaveCount(5);
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    for (const id of ['adapt', 'poc']) {
      const toolbar = page.locator(`#case-${id} .case-video-toolbar`);
      await toolbar.scrollIntoViewIfNeeded();
      const tabs = toolbar.locator('.case-model-tabs');
      const play = toolbar.locator('.case-play');
      const box = (await toolbar.boundingBox())!;
      const choicesBox = (await tabs.boundingBox())!;
      const playBox = (await play.boundingBox())!;
      expect(
        Math.abs(choicesBox.y + choicesBox.height / 2 - playBox.y - playBox.height / 2),
      ).toBeLessThan(2);
      expect(choicesBox.x).toBeCloseTo(box.x, 0);
      expect(playBox.x).toBeGreaterThanOrEqual(choicesBox.x + choicesBox.width);
      expect(playBox.x + playBox.width).toBeCloseTo(box.x + box.width, 0);
      await expect(tabs).toHaveAttribute('data-indicator', 'underline');
      await indicatorAligned(tabs);
      await expect(play.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
  }
});

test('persistent model underline and stage pill move once per arrow key', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const models = page.locator('#case-adapt .case-model-tabs');
  await models.scrollIntoViewIfNeeded();
  await indicatorAligned(models);
  const underline = await models.locator('.segmented-control__indicator').elementHandle();
  await models.locator('button').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(models.locator('[data-focus="0"]')).toBeFocused();
  await expect(models.locator('[data-focus="0"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#case-adapt .evidence-video:not([hidden])')).toHaveCount(1);
  await indicatorAligned(models);
  expect(
    await underline!.evaluate(
      (el) =>
        el === document.querySelector('#case-adapt .case-model-tabs .segmented-control__indicator'),
    ),
  ).toBe(true);
  await expect(models.locator('.segmented-control__indicator')).toHaveCSS(
    'transition-property',
    /transform/,
  );
  await models.locator('[data-focus="all"]').click();

  const stages = page.locator('#case-adapt .case-stage-tabs');
  await expect(page.locator('#case-adapt .stage-controls > span')).toHaveCount(0);
  await expect(stages).toHaveAttribute('data-indicator', 'pill');
  await stages.locator('[data-stage="0"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(stages.locator('[data-stage="1"]')).toBeFocused();
  await expect(stages.locator('[data-stage="1"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(stages.locator('[aria-pressed="true"]')).toHaveCount(1);
  await indicatorAligned(stages);
});

test('cold stage seeks play actual recordings and playback state follows media events', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  const area = page.locator('#case-adapt');
  await expect(area.locator('[data-stage="3"]')).toHaveCount(1);
  // Dispatch before auto-scrolling can warm the lazy recordings.
  await area.locator('[data-stage="3"]').dispatchEvent('click');
  const videos = area.locator('video');
  await expect
    .poll(
      () =>
        videos.evaluateAll((elements) =>
          elements.every((element) => {
            const v = element as HTMLVideoElement;
            return !v.paused && v.currentTime > 40 && !v.error;
          }),
        ),
      { timeout: 30000 },
    )
    .toBe(true);
  const play = area.locator('.case-play');
  await expect(play).toHaveAttribute('aria-label', 'Pause all');
  await expect(play).toHaveAttribute('aria-pressed', 'true');
  const pauseIcon = await play.locator('svg').innerHTML();
  await videos.evaluateAll((elements) =>
    elements.forEach((element) => (element as HTMLVideoElement).pause()),
  );
  await expect(play).toHaveAttribute('aria-label', 'Play all');
  expect(await play.locator('svg').innerHTML()).not.toBe(pauseIcon);
  await videos.first().evaluate(async (video: HTMLVideoElement) => {
    video.currentTime = 0;
    await video.play();
  });
  await expect(play).toHaveAttribute('aria-label', 'Pause all');
  // Pausing with the group control must pause every visible recording.
  await play.dispatchEvent('click');
  await expect
    .poll(() =>
      videos.evaluateAll((elements) =>
        elements.every((element) => (element as HTMLVideoElement).paused),
      ),
    )
    .toBe(true);
  await expect(play).toHaveAttribute('aria-pressed', 'false');
});

test('POC group starts cold media in parallel and focuses only one model', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  const area = page.locator('#case-poc');
  const play = area.locator('.case-play');
  await play.click();
  await expect
    .poll(
      () =>
        area.locator('video').evaluateAll((elements) =>
          elements.every((element) => {
            const v = element as HTMLVideoElement;
            return !v.paused && v.currentTime > 0 && !v.error;
          }),
        ),
      { timeout: 30000 },
    )
    .toBe(true);
  await expect(play).toHaveAttribute('aria-label', 'Pause all');
  await area.locator('[data-poc-focus="1"]').click();
  await expect(area.locator('.evidence-video:not([hidden])')).toHaveCount(1);
  await expect
    .poll(() =>
      area
        .locator('.evidence-video[hidden] video')
        .evaluateAll((elements) =>
          elements.every((element) => (element as HTMLVideoElement).paused),
        ),
    )
    .toBe(true);
  const tabs = area.locator('.case-model-tabs');
  await indicatorAligned(tabs);
  await tabs.locator('[data-poc-focus="1"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.locator('[data-poc-focus="2"]')).toBeFocused();
  await expect(tabs.locator('[data-poc-focus="2"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(play).toHaveAttribute('aria-label', 'Play all');
});

test('camera selectors use the same sliding pill and keep the requested crop', async ({ page }) => {
  await page.goto('/');
  const area = page.locator('#mobile-content');
  await area.locator('.evidence-video').first().scrollIntoViewIfNeeded();
  const camera = area.locator('.camera-controls').first();
  await expect(camera).toHaveAttribute('data-indicator', 'pill', { timeout: 30000 });
  const video = area.locator('video').first();
  expect(
    await video.evaluate((v: HTMLVideoElement) => v.videoWidth / v.videoHeight),
  ).toBeGreaterThan(4);
  await expect(video).toHaveCSS('object-fit', 'cover');
  await expect(video).toHaveCSS('object-position', '0% 50%');
  const cameraBox = (await camera.boundingBox())!;
  const viewportBox = (await area.locator('.media-viewport').first().boundingBox())!;
  expect(cameraBox.y - viewportBox.y - viewportBox.height).toBeCloseTo(12, 0);
  const captionBox = (await area.locator('.evidence-video > figcaption').first().boundingBox())!;
  expect(captionBox.y - cameraBox.y - cameraBox.height).toBeCloseTo(12, 0);
  await camera.locator('[data-camera="center"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(camera.locator('[data-camera="left"]')).toBeFocused();
  await expect(camera.locator('[data-camera="left"]')).toHaveAttribute('aria-pressed', 'true');
  // Demo recordings stitch Overview first, so the left-wrist crop is the middle pane.
  await expect(video).toHaveAttribute('data-view', 'center');
  await expect(video).toHaveCSS('object-position', '50% 50%');
  await indicatorAligned(camera);
  await camera.locator('[data-camera="right"]').click();
  await expect(video).toHaveCSS('object-position', '100% 50%');
  await expect(video).toHaveCSS('object-fit', 'cover');
});
