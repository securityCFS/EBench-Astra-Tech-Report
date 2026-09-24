import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const catalog = JSON.parse(
  await readFile(new URL('../dist/data/episodes/index.json', import.meta.url), 'utf8'),
);
const episodes = await Promise.all(
  catalog.map(async ({ id }) =>
    JSON.parse(
      await readFile(new URL(`../dist/data/episodes/${id}.json`, import.meta.url), 'utf8'),
    ),
  ),
);

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('.execution-demo [data-counter]')).toHaveText('Interaction 1 / 20');
  await page.evaluate(() => document.fonts.ready);
}

async function indicatorDistance(page: Page, group: string, indicator: string) {
  return page.locator(group).evaluate((element, selector) => {
    const selected = element.querySelector('[aria-pressed="true"]')!.getBoundingClientRect();
    const marker = element.querySelector(selector)!.getBoundingClientRect();
    return Math.abs(selected.left - marker.left) + Math.abs(selected.width - marker.width);
  }, indicator);
}

test('episode and camera indicators move on persistent DOM, including keyboard navigation and resize', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  const picker = page.locator('.execution-demo .episode-picker');
  const indicator = await picker.locator('.episode-picker-indicator').elementHandle();
  const firstButton = await picker.locator('button').first().elementHandle();
  await expect
    .poll(() =>
      indicatorDistance(page, '.execution-demo .episode-picker', '.episode-picker-indicator'),
    )
    .toBeLessThan(2);
  const originalX = (await indicator!.boundingBox())!.x;
  await picker
    .locator('button')
    .last()
    .evaluate((button: HTMLButtonElement) => button.click());
  const targetX = (await picker.locator('button').last().boundingBox())!.x;
  const movingX = (await indicator!.boundingBox())!.x;
  expect(targetX).toBeGreaterThan(originalX);
  expect(movingX).toBeLessThan(targetX);
  await expect(page.locator('.execution-demo h4')).toHaveText(episodes[2].instruction);
  expect(
    await indicator!.evaluate(
      (element) => element === document.querySelector('.episode-picker-indicator'),
    ),
  ).toBe(true);
  expect(
    await firstButton!.evaluate((element) => element === document.querySelector('[data-episode]')),
  ).toBe(true);
  await expect
    .poll(() =>
      indicatorDistance(page, '.execution-demo .episode-picker', '.episode-picker-indicator'),
    )
    .toBeLessThan(2);

  const cameras = page.locator('.execution-demo .episode-cameras');
  const cameraIndicator = await cameras.locator('.episode-camera-indicator').elementHandle();
  await cameras.getByRole('button', { name: 'Overview', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(cameras.getByRole('button', { name: 'Left wrist' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(
    await cameraIndicator!.evaluate(
      (element) => element === document.querySelector('.episode-camera-indicator'),
    ),
  ).toBe(true);
  await expect
    .poll(() =>
      indicatorDistance(page, '.execution-demo .episode-cameras', '.episode-camera-indicator'),
    )
    .toBeLessThan(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      indicatorDistance(page, '.execution-demo .episode-picker', '.episode-picker-indicator'),
    )
    .toBeLessThan(2);
  await expect
    .poll(() =>
      indicatorDistance(page, '.execution-demo .episode-cameras', '.episode-camera-indicator'),
    )
    .toBeLessThan(2);
  await picker.locator('button').last().focus();
  await page.keyboard.press('Home');
  await expect(picker.locator('button').first()).toBeFocused();
  await expect(page.locator('.execution-demo h4')).toHaveText(episodes[0].instruction);
});

test('all titles, outcomes, prompts, complete logs, exact tool arguments and source paths are retained', async ({
  page,
}) => {
  await ready(page);
  const root = page.locator('.execution-demo');
  await expect(root.locator('[data-episode]')).toHaveText(catalog.map((entry) => entry.title));
  for (const episode of episodes) {
    await root.locator(`[data-episode="${episode.id}"]`).click();
    await expect(root.locator('h4')).toHaveText(episode.instruction);
    expect(await root.locator('.episode-prompt').textContent()).toBe(episode.initial_prompt);
    await expect(root.locator('summary').filter({ hasText: 'Initial task prompt' })).toHaveCount(1);
    await expect(
      root.locator('.episode-heading > .episode-task > .episode-prompt-disclosure'),
    ).toHaveCount(1);
    await expect(root.locator('.episode-outcome')).toContainText(
      episode.result.sr ? 'Successful' : 'Incomplete',
    );
    await expect(root.locator('.episode-outcome small')).toHaveText(
      `Final score ${episode.result.score.toFixed(3)}`,
    );
    await expect(root.locator('.episode-log li')).toHaveCount(episode.calls.length);
    await expect(root.locator('video')).toHaveAttribute('src', episode.video);
    await expect(root.locator('[data-icl-package]')).toHaveAttribute(
      'data-icl-package',
      episode.task,
    );
    await expect(root.locator('[download]')).toHaveAttribute(
      'href',
      `data/episodes/${episode.id}.json`,
    );
    const records = await root.evaluate((element) =>
      [...element.querySelectorAll<HTMLButtonElement>('.episode-log [data-call]')].map((button) => {
        button.click();
        return JSON.parse(element.querySelector('.episode-raw pre')!.textContent!);
      }),
    );
    expect(records).toEqual(
      episode.calls.map((call) => ({
        tool: call.tool,
        arguments: call.arguments,
        response_summary: call.response,
      })),
    );
    await expect(root.locator('[data-next]')).toBeDisabled();
    await expect(root.locator('[data-counter]')).toHaveText(
      `Interaction ${episode.calls.length} / ${episode.calls.length}`,
    );
  }
});

test('full-width chapters sit below both columns, expose focus/hover labels, and seek with keyboard', async ({
  page,
}) => {
  await ready(page);
  const root = page.locator('.execution-demo');
  await expect(root.locator('.episode-bookmarks')).toHaveCount(0);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(async () =>
        root.evaluate((element) => {
          const stage = element.querySelector('.episode-stage')!.getBoundingClientRect();
          const timeline = element.querySelector('.episode-timeline')!.getBoundingClientRect();
          const marks = [...element.querySelectorAll('[data-chapter]')].map((mark) =>
            mark.getBoundingClientRect(),
          );
          return {
            below: timeline.top >= stage.bottom,
            fullWidth: Math.abs(timeline.width - stage.width) < 2,
            overflow: element.scrollWidth > element.clientWidth + 1,
            targets: marks.every(
              (mark) =>
                mark.width >= 44 &&
                mark.height >= 44 &&
                mark.left >= timeline.left &&
                mark.right <= timeline.right,
            ),
            overlaps: marks.some((a, i) =>
              marks
                .slice(i + 1)
                .some(
                  (b) =>
                    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top,
                ),
            ),
          };
        }),
      )
      .toEqual({ below: true, fullWidth: true, overflow: false, targets: true, overlaps: false });
    for (const index of [0, 4]) {
      const mark = root.locator('[data-chapter]').nth(index);
      await mark.focus();
      await expect(mark.locator('.episode-chapter-label')).toBeVisible();
      const bounds = await mark.locator('.episode-chapter-label').boundingBox();
      const timeline = (await root.locator('.episode-timeline').boundingBox())!;
      expect(bounds!.x).toBeGreaterThanOrEqual(timeline.x - 1);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(timeline.x + timeline.width + 1);
    }
  }
  const slip = root.getByRole('button', { name: /^Seek to Slip detected/ });
  await slip.focus();
  await page.keyboard.press('Enter');
  await expect(root.locator('[data-counter]')).toHaveText('Interaction 10 / 20');
  await expect(root.locator('[data-seek]')).toHaveValue(String(episodes[0].calls[9].video_start));
  await page.keyboard.press('Escape');
  await expect(slip.locator('.episode-chapter-label')).not.toBeVisible();
  await root.locator('[data-chapter]').first().hover();
  await expect(
    root.locator('[data-chapter]').first().locator('.episode-chapter-label'),
  ).toBeVisible();
  await root.locator('[data-seek]').focus();
  await page.keyboard.press('End');
  await expect(root.locator('[data-counter]')).toHaveText('Interaction 20 / 20');
  await expect(root.locator('[data-seek]')).toHaveAttribute(
    'aria-valuetext',
    /interaction 20 of 20/,
  );
  await page.keyboard.press('Home');
  await expect(root.locator('[data-prev]')).toBeDisabled();
});

test('reduced motion, icon-only playback, multiview and action playback retain one video clock', async ({
  page,
}) => {
  await ready(page);
  const root = page.locator('.execution-demo');
  const video = root.locator('video');
  await video.scrollIntoViewIfNeeded();
  await expect(video).toHaveJSProperty('paused', true);
  await expect(root.locator('[data-play]')).toHaveAccessibleName('Play episode');
  expect((await root.locator('[data-play]').textContent())!.trim()).toBe('');
  expect(
    await root
      .locator('.episode-picker-indicator')
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe('0s');
  await root.locator('[data-play]').click();
  await expect(root.locator('[data-play]')).toHaveAccessibleName('Pause episode');
  await root.locator('[data-play]').click();
  await expect(video).toHaveJSProperty('paused', true);
  await root.locator('[data-seek]').fill('7.5');
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBe(7.5);
  await root.getByRole('button', { name: 'All views', exact: true }).click();
  await expect(root.locator('.episode-viewport')).toHaveClass(/all-views/);
  await expect(root.locator('canvas:visible')).toHaveCount(3);
  await expect
    .poll(() =>
      root
        .locator('canvas')
        .first()
        .evaluate((element: HTMLCanvasElement) => element.width),
    )
    .toBeGreaterThan(300);
  await root.getByRole('button', { name: 'Right wrist', exact: true }).click();
  await expect(video).toHaveJSProperty('currentTime', 7.5);
  await root.locator('[data-speed]').selectOption('2');
  await expect(video).toHaveJSProperty('playbackRate', 2);
  await root.getByRole('button', { name: /^Seek to First grasp/ }).click();
  await root.locator('[data-play-call]').click();
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeCloseTo(episodes[0].calls[0].video_end - 0.015, 2);
  await expect(video).toHaveJSProperty('paused', true);
  await root.locator('.episode-prompt-disclosure summary').click();
  await expect(root.locator('.episode-prompt')).toBeVisible();
  await expect(video).toHaveJSProperty('paused', true);
});

test('failed and slow episode requests retain the picker, recover, and cannot replace newer selections', async ({
  page,
}) => {
  let fail = true;
  let release: (() => void) | undefined;
  await page.route('**/data/episodes/collect_coffee_beans_013.json', async (route) => {
    if (fail) await route.fulfill({ status: 503, body: 'Unavailable' });
    else {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route.fulfill({ json: episodes[1] });
    }
  });
  await ready(page);
  const root = page.locator('.execution-demo');
  await root.getByRole('button', { name: 'Exploring contact', exact: true }).click();
  await expect(root.getByRole('alert')).toContainText('could not be loaded');
  await expect(root.locator('[data-episode]')).toHaveCount(3);
  await expect(root.locator('[data-episode-content]')).toHaveAttribute('aria-busy', 'false');
  fail = false;
  await root.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(root.locator('[data-episode-content]')).toHaveAttribute('aria-busy', 'true');
  await expect.poll(() => Boolean(release)).toBe(true);
  await root.getByRole('button', { name: 'Adapting through a long task', exact: true }).click();
  await expect(root.locator('h4')).toHaveText(episodes[2].instruction);
  release!();
  await expect(root.locator('h4')).toHaveText(episodes[2].instruction);
  await page.unroute('**/data/episodes/collect_coffee_beans_013.json');
  await root.getByRole('button', { name: 'Exploring contact', exact: true }).click();
  await expect(root.locator('h4')).toHaveText(episodes[1].instruction);
});

test('200% text remains contained on narrow layouts', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px';
  });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() =>
        page
          .locator('.execution-demo')
          .evaluate((element) => element.scrollWidth - element.clientWidth),
      )
      .toBeLessThanOrEqual(1);
    await expect
      .poll(() =>
        indicatorDistance(page, '.execution-demo .episode-picker', '.episode-picker-indicator'),
      )
      .toBeLessThan(2);
    const last = page.locator('.execution-demo [data-chapter]').last();
    await last.focus();
    const label = (await last.locator('.episode-chapter-label').boundingBox())!;
    const timeline = (await page.locator('.execution-demo .episode-timeline').boundingBox())!;
    expect(label.x).toBeGreaterThanOrEqual(timeline.x - 1);
    expect(label.x + label.width).toBeLessThanOrEqual(timeline.x + timeline.width + 1);
  }
});

test('video errors leave chapters, complete evidence, and source downloads usable', async ({
  page,
}) => {
  await page.route('**/*.mp4', (route) => route.abort());
  await ready(page);
  const root = page.locator('.execution-demo');
  await expect(root.locator('.episode-caption')).toContainText('Video unavailable');
  await expect(root.locator('[data-play]')).toBeDisabled();
  await root.getByRole('button', { name: /^Seek to Final result/ }).click();
  await expect(root.locator('[data-counter]')).toHaveText('Interaction 20 / 20');
  await expect(root.locator('.episode-terminal')).toContainText('task successful');
  await root.locator('.episode-log summary').click();
  await expect(root.locator('.episode-log li')).toHaveCount(20);
  await expect(root.locator('[download]')).toHaveAttribute(
    'href',
    'data/episodes/apple_to_fruit_bowl_006.json',
  );
});
