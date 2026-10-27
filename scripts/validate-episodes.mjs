import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const catalogs = { direct: 3, harness: 5 };
const executors = new Set(['agent', 'pi05', 'internw0']);
let episodes = 0,
  calls = 0,
  frames = 0;
for (const [name, count] of Object.entries(catalogs)) {
  const catalog = read(`dist/data/episodes/${name}.json`);
  assert.equal(catalog.length, count);
  for (const item of catalog) {
    const e = read(`dist/data/episodes/${item.id}.json`);
    assert.equal(e.title, item.title);
    assert(fs.statSync(`dist/${e.video}`).size > 10000, e.video + ' missing (run git lfs pull)');
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
      assert(executors.has(c.executor ?? 'agent'));
      assert.equal(c.start_step, step);
      assert.equal(c.video_start, end);
      assert.equal(c.response.physics_steps, c.end_step);
      if (c.tool === 'query_icl') {
        // Reading the demonstration advances neither the simulation nor the recording.
        assert.equal(c.end_step, c.start_step);
        assert.equal(c.video_end, c.video_start);
        continue;
      }
      assert(c.end_step > c.start_step);
      assert(c.video_end > c.video_start);
      const slice = e.alignment.frames.slice(c.video_start * e.fps, c.video_end * e.fps);
      assert.equal(slice[0].start_step, c.start_step);
      assert(slice.at(-1).end_step <= c.end_step);
      if (i < e.calls.length - 1) assert.equal(slice.at(-1).end_step, c.end_step);
      step = c.end_step;
      end = c.video_end;
    }
    assert.equal(step, e.physics_steps);
    assert.equal(end, e.duration);
    // An episode the agent ends receives its outcome from the evaluator, not from a tool call.
    if (e.ended_by_agent) assert.deepEqual(e.calls.at(-1).response.episode_results, []);
    else assert.deepEqual(e.calls.at(-1).response.episode_results[0], e.result);
    for (const b of e.bookmarks) assert(b.call >= 1 && b.call <= e.calls.length);
    assert(!/outputs\/|\/home\/|api_key|Bearer /.test(JSON.stringify(e)));
    episodes++;
    calls += e.calls.length;
    frames += e.frame_count;
  }
}
console.log(
  `Episode interactions: ${episodes} episodes, ${calls} public calls, ${frames} aligned video frames verified.`,
);
