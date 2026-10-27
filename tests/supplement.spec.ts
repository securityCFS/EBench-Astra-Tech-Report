import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const packages = JSON.parse(
  await readFile(new URL('../dist/data/icl-packages.json', import.meta.url), 'utf8'),
);
const overviews = JSON.parse(
  await readFile(new URL('../dist/data/icl-overviews.json', import.meta.url), 'utf8'),
);

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('.demonstration-card[data-icl-package]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function openICL(page: Page) {
  await page.locator('.demonstration-card[data-icl-package]').click();
  await expect(page.locator('#icl-task')).toBeVisible();
}

async function shellGeometry(page: Page) {
  return page.locator('.report-supplement').evaluate((dialog) => {
    const body = dialog.querySelector('#appendix-body')!;
    const close = dialog.querySelector('.close-dialog')!.getBoundingClientRect();
    const bounds = dialog.getBoundingClientRect();
    return {
      width: bounds.width,
      outsideViewport:
        bounds.left < 0 ||
        bounds.right > innerWidth ||
        bounds.top < 0 ||
        bounds.bottom > innerHeight,
      bodyOverflow: body.scrollWidth - body.clientWidth,
      closeVisible:
        close.left >= bounds.left &&
        close.right <= bounds.right &&
        close.top >= bounds.top &&
        close.bottom <= bounds.bottom,
      alignment: getComputedStyle(body).textAlign,
    };
  });
}

test('demonstration and task-video dialogs share one shell, width and native Escape behavior', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  const dialog = page.locator('#appendix-dialog');
  const card = page.locator('.demonstration-card[data-icl-package]');
  await openICL(page);
  await expect(dialog).toHaveClass(/report-supplement.*icl-dialog/);
  await expect(dialog.locator('#appendix-title')).not.toBeEmpty();
  const icl = await shellGeometry(page);
  expect(icl.alignment).toBe('left');
  expect(icl.outsideViewport).toBe(false);
  expect(icl.closeVisible).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(card).toBeFocused();
  await page.locator('[data-matrix="tasks"]').click();
  const trigger = page.locator('#matrix-content [data-task-video]').first();
  await trigger.click();
  await expect(dialog).toHaveAttribute('data-content', 'task-video');
  await expect(dialog.locator('#appendix-title')).not.toBeEmpty();
  const video = await shellGeometry(page);
  expect(video.width).toBe(icl.width);
  expect(video.outsideViewport).toBe(false);
  expect(video.closeVisible).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('narrow and text-scaled supplements scroll internally without clipping close or album controls', async ({
  page,
}) => {
  await ready(page);
  for (const [width, fontSize] of [
    [1440, '16px'],
    [390, '16px'],
    [390, '32px'],
  ] as const) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate((size) => {
      document.documentElement.style.fontSize = size;
    }, fontSize);
    await openICL(page);
    const close = page.getByRole('button', { name: 'Close supplementary material' });
    await close.focus();
    await page.keyboard.press('Tab');
    expect(
      await page
        .locator('#appendix-dialog')
        .evaluate((dialog) => dialog.contains(document.activeElement)),
    ).toBe(true);
    await page.getByRole('tab', { name: 'Keyframes', exact: true }).click();
    const albumGeometry = await shellGeometry(page);
    expect(albumGeometry.outsideViewport).toBe(false);
    expect(albumGeometry.bodyOverflow).toBeLessThanOrEqual(1);
    expect(albumGeometry.closeVisible).toBe(true);
    if (width === 390) {
      const image = await page.locator('.icl-frame-view').boundingBox();
      const annotation = await page.locator('.icl-frame-prompt').boundingBox();
      expect(annotation!.y).toBeGreaterThanOrEqual(image!.y + image!.height);
    }
    await page.getByRole('button', { name: 'Next keyframe' }).click();
    await expect(page.locator('#icl-frame-range')).toHaveValue('1');
    await page.getByRole('tab', { name: 'Full prompt', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Download original input' })).toBeVisible();
    expect((await shellGeometry(page)).bodyOverflow).toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape');
  }
});

test('all 26 ICL tasks retain overview, image order, annotations and frame bounds', async ({
  page,
}) => {
  test.setTimeout(120000);
  await ready(page);
  await openICL(page);
  await expect(page.locator('#icl-task option')).toHaveCount(26);
  for (const overview of overviews) {
    await page.locator('#icl-task').selectOption(overview.task);
    await page.getByRole('tab', { name: 'Overview', exact: true }).click();
    await expect(page.locator('.icl-overview-copy p')).toHaveText(overview.description);
    await expect(page.locator('.icl-overview-sheet img')).toHaveAttribute('src', overview.overview);
    await page.getByRole('tab', { name: 'Keyframes', exact: true }).click();
    await expect(page.locator('#icl-frame-range')).toHaveValue('0');
    await expect(page.getByRole('button', { name: 'Previous keyframe' })).toBeDisabled();
    await expect(page.locator('#icl-frame-prompt')).toHaveText(overview.frames[0].phase);
    expect(
      await page
        .locator('.icl-filmstrip img')
        .evaluateAll((images) => images.map((image) => image.getAttribute('src'))),
    ).toEqual(overview.frames.map((frame) => frame.path));
    const last = overview.frames.length - 1;
    await page.locator('#icl-frame-range').focus();
    await page.keyboard.press('End');
    await expect(page.locator('.icl-image-stage img')).toHaveAttribute(
      'src',
      overview.frames[last].path,
    );
    await expect(page.locator('#icl-frame-prompt')).toHaveText(overview.frames[last].phase);
    await expect(page.getByRole('button', { name: 'Next keyframe' })).toBeDisabled();
    await page.getByText('Original image caption', { exact: true }).click();
    await expect(page.locator('.icl-context').last().locator('p')).toHaveText(
      overview.frames[last].label,
    );
  }
});

test('ICL keyboard navigation, raw records and downloads preserve original values', async ({
  page,
}) => {
  await ready(page);
  await openICL(page);
  for (const task of ['install_gear', 'frame_against_pen_holder']) {
    const pkg = packages.find((item) => item.task === task);
    const overview = overviews.find((item) => item.task === task);
    await page.locator('#icl-task').selectOption(task);
    await page.getByRole('tab', { name: 'Overview', exact: true }).click();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Keyframes', exact: true })).toBeFocused();
    await page.locator('.icl-album').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#icl-frame-range')).toHaveValue('1');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#icl-frame-range')).toHaveValue('0');
    await page.locator('[data-icl-frame="2"]').click();
    await expect(page.locator('#icl-frame-range')).toHaveValue('2');
    await expect(page.locator('[data-icl-frame="2"]')).toBeFocused();
    await expect(page.locator('#icl-frame-prompt')).toHaveText(overview.frames[2].phase);

    await page.getByRole('tab', { name: 'Keyframes', exact: true }).focus();
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: 'Full prompt', exact: true })).toBeFocused();
    const records = pkg.inputs
      .filter((input) => input.type === 'text')
      .flatMap((input) =>
        input.text.split('\n').flatMap((line) => {
          try {
            const value = JSON.parse(line);
            return value && typeof value === 'object' ? [value] : [];
          } catch {
            return [];
          }
        }),
      );
    const displayed = await page.locator('.icl-numeric-detail pre').allTextContents();
    expect(displayed.map((text) => JSON.parse(text))).toEqual(records);
    expect(
      await page
        .locator('.icl-input-block > img')
        .evaluateAll((images) => images.map((image) => image.getAttribute('src'))),
    ).toEqual(pkg.inputs.filter((input) => input.type === 'localImage').map((input) => input.path));
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download original input' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(`${task}-icl.json`);
    expect(JSON.parse(await readFile((await download.path())!, 'utf8'))).toEqual(pkg);
    await page.getByRole('tab', { name: 'Full prompt', exact: true }).focus();
    await page.keyboard.press('Home');
    await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toBeFocused();
  }
});
