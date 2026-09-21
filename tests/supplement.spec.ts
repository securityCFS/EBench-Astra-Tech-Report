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
  await expect(page.locator('#case-icl [data-icl-package]')).toBeVisible();
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

test('all available appendices share one shell, title, width and native Escape behavior', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  const keys = await page
    .locator('[data-appendix]:visible')
    .evaluateAll((links) => [
      ...new Set(links.map((link) => (link as HTMLElement).dataset.appendix!)),
    ]);
  expect(keys).toContain('ablation');
  keys.push('sources');
  let shellWidth: number | undefined;
  for (const key of keys) {
    const trigger =
      key === 'sources'
        ? page.locator('#model-references a')
        : page.locator(`[data-appendix="${key}"]:visible`).first();
    await trigger.click();
    const dialog = page.locator('#appendix-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveClass(/report-supplement/);
    await expect(dialog.locator('#appendix-title')).toHaveCount(1);
    await expect(dialog.locator('#appendix-title')).not.toBeEmpty();
    const geometry = await shellGeometry(page);
    shellWidth ??= geometry.width;
    expect(geometry.width, key).toBe(shellWidth);
    expect(geometry.alignment, key).toBe('left');
    expect(geometry.outsideViewport, key).toBe(false);
    expect(geometry.closeVisible, key).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
  await openICL(page);
  await expect(page.locator('#appendix-dialog')).toHaveClass(/report-supplement.*icl-dialog/);
  expect((await shellGeometry(page)).width).toBe(shellWidth);
  await page.getByRole('button', { name: 'Close supplementary material' }).click();
  await page.locator('#model-references a').click();
  await expect(page.locator('#appendix-dialog')).toHaveClass('report-supplement');
});

test('supplement paragraphs use the same content width as their tables', async ({ page }) => {
  await ready(page);
  await page.locator('#case-icl [data-appendix="ablation"]').click();
  const body = page.locator('#appendix-body');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await body.evaluate((element) => {
      const paragraph = element.querySelector(':scope > p')!;
      const table = element.querySelector('.table-scroll')!;
      const textBox = paragraph.getBoundingClientRect();
      const tableBox = table.getBoundingClientRect();
      return {
        leftGap: Math.abs(textBox.left - tableBox.left),
        rightGap: Math.abs(textBox.right - tableBox.right),
        hardBreaks: paragraph.querySelectorAll('br').length,
        overflow: element.scrollWidth - element.clientWidth,
      };
    });
    expect(geometry.leftGap).toBeLessThanOrEqual(1);
    expect(geometry.rightGap).toBeLessThanOrEqual(1);
    expect(geometry.hardBreaks).toBe(0);
    expect(geometry.overflow).toBeLessThanOrEqual(1);
  }
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
    await page.locator('#model-references a').click();
    await page.locator('#appendix-body').evaluate((body) => {
      body.scrollTop = body.scrollHeight;
    });
    const sourceGeometry = await shellGeometry(page);
    expect(sourceGeometry.outsideViewport).toBe(false);
    expect(sourceGeometry.closeVisible).toBe(true);
    expect(sourceGeometry.bodyOverflow).toBeLessThanOrEqual(1);
    const close = page.getByRole('button', { name: 'Close supplementary material' });
    await close.focus();
    await page.keyboard.press('Tab');
    expect(
      await page
        .locator('#appendix-dialog')
        .evaluate((dialog) => dialog.contains(document.activeElement)),
    ).toBe(true);
    await page.keyboard.press('Escape');

    await openICL(page);
    await page.getByRole('tab', { name: 'Keyframes', exact: true }).click();
    const albumGeometry = await shellGeometry(page);
    expect(albumGeometry.width).toBe(sourceGeometry.width);
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
