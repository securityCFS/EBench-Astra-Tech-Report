import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const index = read('dist/data/episodes/index.json');
assert.equal(index.length, 3);
let calls = 0,
  frames = 0;
for (const item of index) {
  const e = read(`dist/data/episodes/${item.id}.json`);
  assert(fs.existsSync(`dist/${e.video}`));
  assert.equal(e.duration, e.frame_count / e.fps);
  assert.equal(e.frame_count, e.alignment.frames.length);
  assert(e.initial_prompt.includes(e.instruction));
  assert(read('dist/data/icl-packages.json').some((p) => p.task === e.task));
  let step = 0,
    end = 0;
  const ids = new Set();
  for (const [i, c] of e.calls.entries()) {
    assert.equal(c.number, i + 1);
    assert(!ids.has(c.id));
    ids.add(c.id);
    assert.equal(c.start_step, step);
    assert.equal(c.video_start, end);
    assert(c.end_step > c.start_step);
    assert(c.video_end > c.video_start);
    assert.equal(c.response.physics_steps, c.end_step);
    const slice = e.alignment.frames.slice(c.video_start * e.fps, c.video_end * e.fps);
    assert.equal(slice[0].start_step, c.start_step);
    assert(slice.at(-1).end_step <= c.end_step);
    if (i < e.calls.length - 1) assert.equal(slice.at(-1).end_step, c.end_step);
    step = c.end_step;
    end = c.video_end;
  }
  assert.equal(step, e.physics_steps);
  assert.equal(end, e.duration);
  assert.deepEqual(e.calls.at(-1).response.episode_results[0], e.result);
  for (const b of e.bookmarks) assert(b.call >= 1 && b.call <= e.calls.length);
  assert(!/outputs\/|\/home\/|api_key|Bearer /.test(JSON.stringify(e)));
  calls += e.calls.length;
  frames += e.frame_count;
}
console.log(
  `Episode interactions: ${index.length} episodes, ${calls} public calls, ${frames} aligned video frames verified.`,
);
