const $ = (s) => document.querySelector(s);
const title = (s) => s.replaceAll('_', ' ').replace(/^./, (x) => x.toUpperCase());
const pct = (n) => (Number(n) * 100).toFixed(1).replace(/\.0$/, '');
let tasks = [],
  demos = [],
  ablations = {},
  reportFigures = {};
function video(path, label, detail, badge = 'Selected rollout') {
  return `<figure class="evidence-video"><div class="video-label"><strong>${label}</strong>${badge ? `<span>${badge}</span>` : ''}</div><div class="media-viewport"><video playsinline preload="none" data-src="${path}" aria-label="${label}"></video><button class="video-start" aria-label="Play ${label}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14l11-7z" fill="currentColor"/></svg></button></div>${detail ? `<figcaption>${detail}</figcaption>` : ''}</figure>`;
}
function mainVideo(task, seed, label, detail) {
  let d = demos.find((x) => x.task === task && x.seed === seed);
  return video(
    d.path,
    label,
    detail,
    `${d.sr ? 'Success' : 'Failed'} (Score ${d.score.toFixed(3)})`,
  );
}
function bars(groups) {
  return reportChart(
    groups[0].startsWith('Mobile')
      ? 'mobility'
      : groups[0].startsWith('Low')
        ? 'precision'
        : 'horizon',
  );
}
const section = (id, n, heading, sub, body) =>
  `<article class="finding" id="${id}"><div class="finding-inner"><div class="finding-heading"><span>${n}</span><div><h3>${heading}</h3></div></div>${body}</div></article>`;
const watch = (text) => '';
function renderAnalysis() {
  $('#mobile-content').innerHTML =
    `<div class="finding-grid"><div class="finding-story"></div></div><div class="evidence-pair">${mainVideo('remote_to_holder', '000', 'Remote to holder', 'GPT-6-Astra 100% task SR; OpenWAM-α 65%.')}${mainVideo('bookmark_on_book', '000', 'Bookmark placement', 'GPT-6-Astra 90% task SR; next-best π₀.₅ 55%.')}</div>`;
  renderLimits('precision');
  initVideos();
  initCharts();
}
function renderLimits(kind) {
  const precision = kind === 'precision';
  $('#limits-content').innerHTML =
    `<div class="finding-grid"><div class="finding-story"></div>${reportChart(precision ? 'precision' : 'horizon')}</div><div class="evidence-pair">${precision ? mainVideo('peg_in_hole', '000', 'Peg insertion', 'The peg remains exposed.') + mainVideo('peg_in_hole', '002', 'Peg insertion', 'One of four successes in 20 task instances.') : mainVideo('bottle', '003', 'Bottle placement', 'Some bottles remain outside the basket.') + mainVideo('dishwasher', '011', 'Dishwasher', 'Only one success in 20 GPT-6-Astra episodes.')}</div>`;
  updateLimitNarrative(kind);
  initVideos();
  initCharts();
  enhanceEvidence($('#limits-content'));
}
const cases = [
  {
    id: 'icl',
    n: '01 / IN-CONTEXT LEARNING',
    title: 'In-context learning',
    sub: 'Zero-shot vs. demonstration · Frame · Gear',
  },
  {
    id: 'adapt',
    n: '02 / ADAPTATION AND PRECISION',
    title: 'Adaptation and precision',
    sub: 'GPT-6-Astra · π₀.₅ · OpenWAM-α · Teacup · Glasses',
  },
  {
    id: 'poc',
    n: '03 / COMPOSITIONAL COMPLETION',
    title: 'Compositional completion',
    sub: 'Zero-shot · bookmark and pen',
  },
  {
    id: 'harness-gain',
    n: '04 / HARNESS WITH POLICY',
    title: 'Where the policy helps',
    sub: 'Direct control · policy alone · harness · Glass · Flip cup',
  },
  {
    id: 'harness-loss',
    n: '05 / HARNESS WITH POLICY',
    title: 'Where the coordination breaks',
    sub: 'Gear · Detergent · Teacup',
  },
];
// Harness-with-policy cases. Policy-alone and direct-control recordings come from other test scenes.
const harnessCases = {
  'harness-gain': {
    label: 'Harness case',
    insight:
      'In both episodes, GPT-6-Astra divides the work by subgoal: it checks a grasp with a few short commands of its own and leaves the contact-rich stages to the policy, which replans every 30 (π₀.₅) or 10 (InternW0-Δ) physics steps instead of waiting for a waypoint chunk to return.',
    glass: {
      button: 'Glass into box',
      title: 'Policy segments complete the folding and the lid',
      focus: ['GPT-6-Astra', 'π₀.₅', 'Harness'],
      videos: [
        [
          'media/cases/astra-glasses.mp4',
          'GPT-6-Astra · Direct control',
          'Transfer succeeds; protruding temples block closure.',
          '',
        ],
        [
          'media/cases/pi05-glasses.mp4',
          'π₀.₅ · Policy alone',
          'Temples folded; lid remains open.',
          '',
        ],
        [
          'media/harness/harness_glass_pi05-web.mp4',
          'Harness with π₀.₅',
          'Glasses packed, temples folded, lid closed.',
          '',
        ],
      ],
      text: [
        'On Glass into box, invoking a policy raises SR from 20% under direct control to <strong>85% with π₀.₅ and 80% with InternW0-Δ</strong>. Under direct control, GPT-6-Astra moves the glasses into the case, but its corrective pushes leave a temple protruding, so the lid cannot close. π₀.₅ alone folds the temples but leaves the lid open.',
        'In the harness, GPT-6-Astra alternates π₀.₅ segments with short grasp tests of its own and then leaves the rest to π₀.₅. Over nine consecutive segments, π₀.₅ carries the glasses into the case, folds the temples, and closes the lid.',
      ],
    },
    flip: {
      button: 'Flip cup & cookies',
      title: 'The agent tests the grasp, the policy performs the handover',
      videos: [
        [
          'media/demos/flip_cup_collect_cookies_009.mp4',
          'GPT-6-Astra · Direct control',
          'Direct control fails in 90% of Flip cup episodes.',
          'Failed (Score 0.000)',
        ],
        [
          'media/harness/harness_flip_cup_internw0-web.mp4',
          'Harness with InternW0-Δ',
          'InternW0-Δ performs the handover, the reorientation, and the pour.',
          'Success (Score 1.000)',
        ],
      ],
      text: [
        'Flip cup &amp; cookies passes the cup from one hand to the other. Under direct control, each waypoint chunk executes open loop, so one hand can withdraw before the other has secured the cup, and GPT-6-Astra fails in 90% of episodes.',
        'In this harness episode, GPT-6-Astra tests the cup grasp with its own waypoints under the stated reason “Test cup grasp by raising 1 cm without rotation”. It then <strong>leaves the handover, the reorientation of the cup, and the pour to InternW0-Δ</strong>, and checks the plate grasp itself before the final pour.',
      ],
    },
  },
  'harness-loss': {
    label: 'Harness case',
    insight:
      'The three failures share one cause: the policy receives the fixed task instruction rather than the stage the agent assigns, and it reports nothing back. GPT-6-Astra therefore has to verify each policy segment from its own observations, maintain the grasps the policy leaves behind, and protect the stages already completed. Within policy segments, objects slip far less often than under the agent’s own commands; the losses arise once control returns to the agent.',
    gear: {
      button: 'Gear',
      title: 'A completion claim on an unseated gear',
      videos: [
        [
          'media/demos/install_gear_001.mp4',
          'GPT-6-Astra · Direct control',
          'Direct control seats the gear in 15% of Gear episodes.',
          'Success (Score 1.000)',
        ],
        [
          'media/harness/harness_gear_pi05-web.mp4',
          'Harness with π₀.₅',
          'Completion claimed while the gear rests unseated.',
          'Failed (Score 0.500)',
        ],
      ],
      text: [
        'In this Gear episode, GPT-6-Astra closes the left hand on the gear hub, tests the grasp with a 1 cm lift, and invokes π₀.₅ for transport and seating in three segments. During the second segment, π₀.₅ opens the left fingers beside the large gear.',
        'The agent then withdraws the open hand while requesting only the overview image, in which the board occupies a small part of the frame, and ends the episode with “The blue gear is in the middle position between the white gears and remained there after the hand withdrew”. <strong>The gear rests unseated</strong>, and the episode scores 0.5.',
      ],
    },
    detergent: {
      button: 'Detergent',
      title: 'A grasp left unmaintained after a policy segment',
      videos: [
        [
          'media/demos/detergent_002.mp4',
          'GPT-6-Astra · Direct control',
          'Direct control completes 55% of Detergent episodes.',
          'Success (Score 1.000)',
        ],
        [
          'media/harness/harness_detergent_internw0-web.mp4',
          'Harness with InternW0-Δ',
          'The first bottle falls when the left hand opens.',
          'Failed (Score 0.667)',
        ],
      ],
      text: [
        'In this Detergent episode, InternW0-Δ closes the right hand on the first bottle while the left hand still holds it. GPT-6-Astra then <strong>opens the left hand without commanding the right hand to stay closed</strong>. In the 1 cm lift test that follows, the right fingers close fully, and the bottle falls from the counter to the floor.',
        'InternW0-Δ places the two other bottles, but the next 20 calls fail to recover the bottle on the floor, and the episode scores 0.67. Across Detergent, the harness with InternW0-Δ reaches 70% SR, below the 95% of InternW0-Δ alone.',
      ],
    },
    teacup: {
      button: 'Teacup & teapot',
      title: 'A recovery segment undoes a completed stage',
      focus: ['GPT-6-Astra', 'π₀.₅', 'Harness'],
      videos: [
        [
          'media/cases/astra-teacup.mp4',
          'GPT-6-Astra · Direct control',
          'Handle-directed grasp, then return after displacement.',
          '',
        ],
        [
          'media/cases/pi05-teacup.mp4',
          'π₀.₅ · Policy alone',
          'Repeated approach; cup transfer unresolved.',
          '',
        ],
        [
          'media/harness/harness_teacup_pi05-web.mp4',
          'Harness with π₀.₅',
          'A recovery segment tips the saucer and the cup.',
          '',
        ],
      ],
      text: [
        'On Teacup &amp; teapot, both harness configurations fall below direct control. In this episode, GPT-6-Astra places the cup on the saucer itself and verifies the placement. Its handle grasp of the teapot then slips as the teapot is lifted clear, and it invokes π₀.₅ for recovery with the stated reason “reapproach shifted handle with learned alignment”.',
        'In this segment, the hand descends beside the teapot, the saucer tips, and <strong>the cup falls and comes to rest upside down</strong> on the table, undoing the earlier placement. The episode reaches the step limit with a score of 0.',
      ],
    },
  },
};
const harnessTask = { 'harness-gain': 'glass', 'harness-loss': 'gear' };
function harnessCaseHTML(id) {
  const group = harnessCases[id],
    key = harnessTask[id],
    c = group[key],
    trio = c.videos.length === 3;
  const choices = Object.keys(group)
    .filter((k) => group[k].button)
    .map(
      (k) =>
        `<button data-harness-case="${id}:${k}" aria-pressed="${k === key}">${group[k].button.replace('&', '&amp;')}</button>`,
    )
    .join('');
  return `<div class="case-heading"><div><h3>${c.title}</h3></div><div class="segmented" aria-label="${group.label}">${choices}</div></div><div class="${trio ? 'evidence-trio' : 'evidence-pair'} case-videos"${trio ? ` data-focus-labels="${c.focus.join('|')}"` : ''}>${c.videos.map(([path, label, detail, badge]) => video(path, label, detail, badge)).join('')}</div><div class="case-description report-prose">${c.text.map((p) => `<p>${p}</p>`).join('')}</div><div class="case-insight"><p>${group.insight}</p></div>`;
}
// Section 07 shows one policy at a time, and every policy switch in it follows the last choice.
let harnessResults,
  harnessView = 'groups',
  harnessPolicy = 0;
const harnessColors = ['#7374b8', '#3f6d8f'],
  harnessGroups = ['Low', 'Medium', 'High', 'Mobile', 'Fixed', 'Short Horizon', 'Long Horizon'],
  harnessShifts = ['object', 'background', 'instruction', 'mix'];
function harnessAlone(id) {
  const m = reportFigures.models.find((x) => x.id === id);
  return {
    sr: m.sr,
    score: m.score,
    groups: Object.fromEntries(harnessGroups.map((g) => [g, m.groups[g].sr])),
    generalization: Object.fromEntries(harnessShifts.map((s) => [s, m.generalization[s].sr])),
  };
}
function drawHarnessTable() {
  const rows = [
    { label: 'GPT-6-Astra', note: 'direct control', agent: true, ...harnessAlone('Astra (ICL)') },
    ...harnessResults.configurations.flatMap((c) => [
      { label: modelLabel(c.policy), note: 'policy alone', ...harnessAlone(c.policy) },
      { label: c.label, note: 'GPT-6-Astra + policy', agent: true, ...c },
    ]),
  ];
  const groups = harnessView === 'groups',
    columns = groups
      ? harnessGroups.map((g) => (r) => r.groups[g])
      : harnessShifts.map((s) => (r) => r.generalization[s]);
  const max = (get) => Math.max(...rows.map(get));
  const head = groups
    ? '<th colspan="3" scope="colgroup">Precision</th><th colspan="2" scope="colgroup">Mobility</th><th colspan="2" scope="colgroup">Horizon</th></tr><tr><th scope="col">SR (%)</th><th scope="col">Score</th><th scope="col">Low</th><th scope="col">Medium</th><th scope="col">High</th><th scope="col">Mobile</th><th scope="col">Tabletop</th><th scope="col">Short</th><th scope="col">Long</th>'
    : '<th colspan="4" scope="colgroup">Controlled perturbations</th></tr><tr><th scope="col">SR (%)</th><th scope="col">Score</th><th scope="col">Object</th><th scope="col">Background</th><th scope="col">Instruction</th><th scope="col">Mixed</th>';
  $('#harness-table .harness-table-body').innerHTML =
    `<div class="table-scroll benchmark-scroll" tabindex="0" role="region" aria-label="Direct control, each policy alone, and the harness with that policy"><table class="report-table report-table--heat benchmark-table"><thead><tr><th rowspan="2" scope="col">Configuration</th><th colspan="2" scope="colgroup">Overall</th>${head}</tr></thead><tbody>${rows
      .map(
        (r) =>
          `<tr class="${r.agent ? 'astra-row' : ''}"><th scope="row">${r.label}<small>${r.note}</small></th>${matrixCell(r.sr, 'sr', r.sr === max((x) => x.sr))}${matrixCell(r.score, 'score', r.score === max((x) => x.score))}${columns.map((get) => matrixCell(get(r), 'sr', get(r) === max(get))).join('')}</tr>`,
      )
      .join(
        '',
      )}</tbody></table></div><p class="fineprint">${groups ? 'Task-group columns give SR (%).' : 'Perturbation columns give SR (%) over the episodes of each condition.'} Bold: best in column; shaded rows: GPT-6-Astra configurations.</p>`;
}
function harnessLegend(items) {
  return `<div class="viz-legend">${items.map(([cls, label, color]) => `<span><i class="${cls}"${color ? ` style="--mark:${color}"` : ''}></i>${label}</span>`).join('')}</div>`;
}
const harnessFigures = {
  tasks(body) {
    const c = harnessResults.configurations[harnessPolicy],
      policy = modelLabel(c.policy),
      color = harnessColors[harnessPolicy];
    const rows = reportFigures.tasks
      .map((t) => ({
        title: t.label,
        direct: 100 * t.models['Astra (ICL)'].sr,
        alone: 100 * t.models[c.policy].sr,
        harness: c.tasks[t.task].sr,
        share: c.tasks[t.task].share,
      }))
      .sort((a, b) => b.harness - b.direct - (a.harness - a.direct) || b.harness - a.harness);
    const better = (r) => Math.max(r.direct, r.alone),
      above = rows.filter((r) => r.harness > better(r) + 0.05).length,
      below = rows.filter((r) => r.harness < better(r) - 0.05).length;
    body.innerHTML = `<div class="field-summary"><div class="pos"><b>${above}</b><span>tasks where the harness exceeds both components</span></div><div><b>${rows.length - above - below}</b><span>tasks where it matches the better one</span></div><div class="neg"><b>${below}</b><span>tasks where it falls below the better one</span></div></div>${harnessLegend(
      [
        ['is-direct', 'Direct control'],
        ['is-alone', `${policy} alone`],
        ['is-harness', `Harness with ${policy}`, color],
      ],
    )}<div class="viz-figure harness-chart"></div><p class="fineprint">Tasks are ordered by the change in SR from direct control, given on the right in percentage points. Hover or focus a task for the share of physics steps that ${policy} executes.</p>`;
    viz.harnessTasks(body.querySelector('.harness-chart'), { rows, policy, color });
  },
  episodes(body) {
    const c = harnessResults.configurations[harnessPolicy],
      e = c.endings,
      endings = [
        ['Success', 'is-success'],
        ['Step limit reached', 'is-limit'],
        ['Completion claimed', 'is-claim'],
        ['Failure reported', 'is-failed'],
        ['Other', 'is-other'],
      ].map(([name, cls]) => ({ name, cls }));
    const rows = [
      ['Success', e.success],
      ['Step limit reached', e.limit],
      ['Completion claimed', e.claim],
      ['Failure reported', e.failed],
    ].map(([label, counts]) => ({ label, counts, n: counts.reduce((a, b) => a + b, 0) }));
    const lost = e.success.slice(1).reduce((a, b) => a + b, 0),
      won = [e.limit, e.claim, e.failed, e.other].reduce((a, r) => a + r[0], 0);
    body.innerHTML = `<div class="field-summary"><div class="pos"><b>+${won}</b><span>episodes that fail under direct control succeed in the harness</span></div><div class="neg"><b>−${lost}</b><span>episodes that succeed under direct control fail in the harness</span></div><div><b>+${won - lost}</b><span>successful episodes in net, out of 510</span></div></div><h4 class="harness-figure-title">How each direct-control ending ends in the harness</h4>${harnessLegend(
      endings.map((x) => [`is-ending ${x.cls}`, x.name]),
    )}<div class="viz-figure harness-chart" data-chart-part="turnover"></div><h4 class="harness-figure-title">What decides the newly failed episodes</h4>${harnessLegend(
      harnessResults.configurations.map((x, i) => ['is-series', x.label, harnessColors[i]]),
    )}<div class="viz-figure harness-chart" data-chart-part="incidents"></div><p class="fineprint">Bars in the upper chart give shares of each direct-control ending, and the one episode that ends otherwise under direct control is omitted. Counts in the lower chart come from a call-by-call reading of each newly failed episode.</p>`;
    viz.harnessTurnover(body.querySelector('[data-chart-part="turnover"]'), { rows, endings });
    viz.pairedBars(body.querySelector('[data-chart-part="incidents"]'), {
      // newlyFailed follows the paper's table: object lost in or after a policy segment, policy
      // segment without the object or undoing a stage, own grasp slip, unmet completion, other.
      rows: [
        [0, 'Object lost in a policy segment or as the agent resumes control'],
        [2, "The agent's own grasp slips"],
        [1, 'Policy segment without the object, on the wrong one, or undoing a stage'],
        [3, 'Completion claimed while a stage is unmet'],
        [4, 'Other'],
      ].map(([k, label]) => ({
        label,
        values: harnessResults.configurations.map((x) => x.newlyFailed[k]),
      })),
      series: harnessResults.configurations.map((x, i) => ({
        label: x.label,
        color: harnessColors[i],
      })),
      active: harnessPolicy,
      label: 'Decisive incident of the newly failed episodes in each harness configuration',
    });
  },
  delegation(body) {
    const c = harnessResults.configurations[harnessPolicy],
      policy = modelLabel(c.policy),
      color = harnessColors[harnessPolicy];
    body.innerHTML = `<div class="field-summary"><div><b>${c.policyStepShare.toFixed(1)}%</b><span>of the physics steps of a task executed by ${policy}, on average</span></div><div><b>${c.switches[0].toFixed(1)} <small>vs.</small> ${c.switches[1].toFixed(1)}</b><span>transitions between agent and policy per successful and unsuccessful episode</span></div><div><b>${c.recovery[0].toFixed(1)}% <small>vs.</small> ${c.recovery[1].toFixed(1)}%</b><span>of policy invocations ask to recover a slipped, missed, or displaced object</span></div></div>${harnessLegend(
      [
        ['is-line', 'Successful episodes', color],
        ['is-line is-failure', 'Unsuccessful episodes'],
      ],
    )}<div class="viz-figure harness-chart"></div><p class="fineprint">Each point averages the share of physics steps executed by ${policy} in one tenth of an episode. Waypoint and gripper commands of GPT-6-Astra count as its own steps.</p>`;
    viz.harnessDelegation(body.querySelector('.harness-chart'), {
      ...c.stepShare,
      policy,
      color,
    });
  },
  tokens(body) {
    const t = harnessResults.tokens,
      keys = ['direct', ...harnessResults.configurations.map((c) => c.id)],
      series = [
        { label: 'Direct control', color: '#3456ef' },
        ...harnessResults.configurations.map((c, i) => ({
          label: c.label,
          color: harnessColors[i],
        })),
      ];
    const card = (title, field, format, extra = () => '') =>
      `<div class="harness-kpi"><h4>${title}</h4><dl>${keys
        .map((k, i) => {
          const cut = i
            ? ` <small>−${Math.round(100 * (1 - t[k][field] / t.direct[field]))}%</small>`
            : '';
          return `<div style="--mark:${series[i].color}"><dt>${series[i].label}${extra(k)}</dt><dd>${format(t[k][field])}${cut}</dd></div>`;
        })
        .join('')}</dl></div>`;
    const millions = (v) => `${v.toFixed(1)}M`;
    body.innerHTML = `<div class="harness-kpis">${card('Tokens per success', 'perSuccess', millions)}${card('API cost per success', 'usdPerSuccess', (v) => `$${v.toFixed(2)}`)}${card(
      'Tool calls per episode',
      'toolCalls',
      (v) => v.toFixed(1),
      (k) =>
        t[k].policyInferences
          ? `<small class="harness-kpi-note">+ ${t[k].policyInferences} policy inferences</small>`
          : '',
    )}</div>${harnessLegend(series.map((s) => ['is-series', s.label, s.color]))}<div class="harness-token-charts"><figure><figcaption>Tokens per episode</figcaption><div class="viz-figure" data-chart-part="episode"></div></figure><figure><figcaption>Tokens per success</figcaption><div class="viz-figure" data-chart-part="success"></div></figure></div><p class="fineprint">Tokens count the input and output of GPT-6-Astra. Tokens per success divide all tokens of a group, including those of its unsuccessful episodes, by its successful episodes, and the API cost applies the published GPT-6-Astra tariff. Direct-control values are lower bounds, since 44 of its episodes lack their final token record.</p>`;
    const bars = (part, groups, label) =>
      viz.groupedBars(body.querySelector(`[data-chart-part="${part}"]`), {
        groups: groups.map(([name, field]) => ({
          label: name,
          values: keys.map((k) => t[k][field]),
        })),
        series,
        format: (v) => `${v.toFixed(2)}M`,
        label,
      });
    bars(
      'episode',
      [
        ['Successful', 'successful'],
        ['Unsuccessful', 'unsuccessful'],
      ],
      'Mean tokens per successful and per unsuccessful episode',
    );
    bars(
      'success',
      [
        ['Short horizon', 'shortPerSuccess'],
        ['Long horizon', 'longPerSuccess'],
      ],
      'Tokens per success on short-horizon and long-horizon tasks',
    );
  },
};
function drawHarnessFigures() {
  document.querySelectorAll('[data-harness-figure]').forEach((host) => {
    harnessFigures[host.dataset.harnessFigure](host.querySelector('.harness-figure-body'));
  });
}
function renderHarness(results) {
  harnessResults = results;
  $('#harness-table').innerHTML =
    '<div class="harness-view" aria-label="Table columns"><button type="button" data-harness-view="groups" aria-pressed="true">Task groups</button><button type="button" data-harness-view="shifts" aria-pressed="false">Distribution shifts</button></div><div class="harness-table-body"></div>';
  initSegmentedControl($('#harness-table .harness-view'));
  drawHarnessTable();
  document.querySelectorAll('[data-harness-figure]').forEach((host) => {
    const switchable = host.dataset.harnessFigure !== 'tokens';
    host.innerHTML = `${switchable ? `<div class="harness-policy" aria-label="Policy in the harness">${results.configurations.map((c, i) => `<button type="button" data-harness-policy="${i}" aria-pressed="${i === harnessPolicy}">${modelLabel(c.policy)}</button>`).join('')}</div>` : ''}<div class="harness-figure-body"></div>`;
    if (switchable) initSegmentedControl(host.querySelector('.harness-policy'));
    const body = host.querySelector('.harness-figure-body'),
      draw = () => harnessFigures[host.dataset.harnessFigure](body);
    draw();
    viz.resizeRedraw(body, draw);
    viz.bindTips(host);
  });
}
document.addEventListener('click', (e) => {
  const view = e.target.closest('[data-harness-view]'),
    policy = e.target.closest('[data-harness-policy]');
  if (view) {
    harnessView = view.dataset.harnessView;
    document
      .querySelectorAll('[data-harness-view]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b === view)));
    drawHarnessTable();
  } else if (policy) {
    harnessPolicy = Number(policy.dataset.harnessPolicy);
    document
      .querySelectorAll('[data-harness-policy]')
      .forEach((b) =>
        b.setAttribute(
          'aria-pressed',
          String(b.dataset.harnessPolicy === policy.dataset.harnessPolicy),
        ),
      );
    drawHarnessFigures();
  }
});
let activeCase = 'icl',
  iclTask = 'frame',
  adaptTask = 'teacup';
function openSelectedCase(id) {
  if (id === 'fine') {
    activeCase = 'adapt';
    adaptTask = 'glasses';
  } else if (id === 'recovery') {
    activeCase = 'adapt';
    adaptTask = 'teacup';
  } else activeCase = id;
  if (activeCase !== 'poc') changeCase(activeCase);
  document.getElementById('case-' + activeCase).scrollIntoView({ behavior: 'smooth' });
}
function renderCase() {
  for (const item of cases) renderCaseSection(item.id);
}
function renderCaseSection(activeCase) {
  const area = document.querySelector('#case-' + activeCase + ' .case-study-content');
  let html = '';
  if (activeCase === 'poc') {
    renderPoc(area);
    return;
  }
  if (activeCase.startsWith('harness')) html = harnessCaseHTML(activeCase);
  else if (activeCase === 'icl') {
    let frame = iclTask === 'frame';
    html = `<div class="case-heading"><div><h3>In-Context Learning Can Guide Task-Specific Manipulation</h3></div><div class="segmented" aria-label="ICL task"><button data-icl="frame" aria-pressed="${frame}">Frame Against Pen Holder</button><button data-icl="gear" aria-pressed="${!frame}">Install Gear</button></div></div><div class="evidence-pair case-videos">${video(`media/cases/zero-shot-${iclTask}.mp4`, 'Zero-shot', '', 'No demo')}${video(`media/cases/icl-${iclTask}.mp4`, 'In-context learning', '', 'With demo')}</div><p class="case-description">${frame ? 'In the photo-frame task, zero-shot execution demonstrates reaching and moving the target, repeatedly adjusts its approach and wrist orientation without completing the required manipulation. After observing a demonstration, GPT-6-Astra adopts a more appropriate grasp orientation and coordinates both grippers to manipulate the frame, then positions the frame over the cup.' : 'In the gear installation task, zero-shot execution likewise demonstrates basic object-handling ability: GPT-6-Astra grasps and lifts the gear, but its placement attempts leave the gear outside the intended assembly position, and installation remains incomplete. With ICL, it positions the gear in the gap between the two existing gears, lowers it into place, releases it, and withdraws the gripper, leaving the gear installed.'}</p><div class="case-insight"><p>In-context learning is most useful when the demonstrated experience is instructive to the agent. In frame placement, it supplies the two-arm division of labor that zero-shot execution does not find, and complete successes rise accordingly. In precise operations such as gear installation, the demonstration still helps correct the attempt, guiding the gear toward the gap and into place, but it does not turn into more successes: what the agent lacks there is precise action, which a demonstration does not supply.</p><div class="icl-case-links"><button class="appendix-link" data-appendix="ablation">Explore the paired ICL experiments ${reportIcon('external-link')}</button></div></div>`;
  } else {
    let glasses = adaptTask === 'glasses',
      suffix = glasses ? 'glasses' : 'teacup';
    html = `<div class="case-heading"><div><h3>${glasses ? 'Imprecise manipulation of articulated objects' : 'Affordance-directed grasping and task-state recovery'}</h3></div><div class="segmented" aria-label="Adaptation task"><button data-adapt="teacup" aria-pressed="${!glasses}">Teacup to saucer</button><button data-adapt="glasses" aria-pressed="${glasses}">Put glass in glassbox</button></div></div><div class="evidence-trio case-videos">${[
      [
        'astra',
        'GPT-6-Astra · Agent',
        glasses
          ? 'Initial transfer succeeds; protruding temples block closure.'
          : 'Handle-directed grasp, then return after displacement.',
      ],
      [
        'pi05',
        'π₀.₅ · VLA',
        glasses
          ? 'Temples folded; lid remains open.'
          : 'Repeated approach; cup transfer unresolved.',
      ],
      [
        'openwam',
        'OpenWAM-α · WAM',
        glasses
          ? 'Temples folded and case closed.'
          : 'Cup grasp fails; teapot moved, cup left off the saucer.',
      ],
    ]
      .map(([file, name, desc]) => video(`media/cases/${file}-${suffix}.mp4`, name, desc, ''))
      .join(
        '',
      )}</div><p class="case-description">${glasses ? 'The glasses packing task exposes a different limitation. GPT-6-Astra successfully performs the coarse bimanual transfer, while the breakdown occurs during the subsequent adjustments needed to fold the temples and close the lid. The temples remain protruding after manipulation, obstructing closure, and further corrective contacts do not resolve the packing problem. This rollout indicates the distinction between making progress toward a task goal and satisfying its final requirements: GPT-6-Astra completes the initial placement but struggles with the precise folding and alignment needed for closure. In the π₀.₅ rollout, the glasses are placed in the case and the temples are folded into a more compact state, although the lid remains open at the end. OpenWAM-α additionally completes lid closure after the folding sequence. These results highlight more accurate execution of the fine-grained manipulation by the post-trained policies.' : 'In the teacup task, GPT-6-Astra initially targets the handle region and adjusts its wrist and gripper configuration across successive attempts before securing the teacup and teapot. This behavior is consistent with affordance-informed grasp selection and replanning. After initially placing the cup on the saucer, subsequent manipulation displaces it. GPT-6-Astra later revisits the cup, re-establishes a grasp, and carries it back toward the saucer, demonstrating a response to an invalidated state rather than simply continuing the preceding action sequence. In contrast, π₀.₅ performs repeated approach and retraction motions without completing the cup transfer. OpenWAM-α attempts to grasp the cup but fails, then moves the teapot onto the tray while leaving the cup off the saucer. The contrast therefore concerns not only object-handling ability, but whether ongoing execution is redirected to resolve unmet or disrupted task requirements.'}</p><div class="case-insight"><p>Together, the two tasks reveal complementary capability: GPT-6-Astra exhibits affordance-directed grasp selection, iterative adjustment, and recovery behavior, whereas the post-trained policies execute the precision task more accurately. Broad task understanding and observation-conditioned revision do not by themselves guarantee precise physical execution; conversely, successful execution of a familiar action trajectory does not necessarily entail recovery when a task requirement remains unmet.</p></div>`;
  }
  area.innerHTML = html;
  updateCaseNarrative(activeCase, area);
  layoutCaseSelector(area);
  initVideos();
  enhanceCaseControls(area);
}
const notes = {
  sources: [
    'Model References',
    `<ol class="model-references"><li><strong>GPT-6-Astra</strong><p>OpenAI (2026). <cite>GPT-6 Astra: A new generation of intelligence</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://openai.com/index/gpt-6-astra/" target="_blank" rel="noopener">Official release ${reportIcon('external-link')}</a></div></li><li><strong>OpenWAM-α</strong><p>Wang et al. (2026). <cite>OpenWAM: An Open, Modular Exploration Towards Systematic World-Action Model Pretraining</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2609.07398" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/OpenWAM-Official/OpenWAM" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>InternW0-Δ</strong><p>Miao et al. (2026). <cite>InternW0-Δ: A World Action Model Bridging Predictive Dynamics and Actions with 20K+ Hours of Open Data</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2609.31394" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a></div></li><li><strong>Qwen-RobotManip</strong><p>Qwen Team (2026). <cite>Qwen-RobotManip Technical Report: Alignment Unlocks Scale for Robotic Manipulation Foundation Models</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2606.17846" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/QwenLM/Qwen-RobotManip" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>π₀.₅</strong><p>Physical Intelligence et al. (2025). <cite>π₀.₅: a Vision-Language-Action Model with Open-World Generalization</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2504.16054" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/Physical-Intelligence/openpi" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>InternVLA-A1.5</strong><p>InternVLA-A1.5 team (2026). <cite>InternVLA-A1.5: Unifying Understanding, Latent Foresight, and Action for Compositional Generalization</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://internrobotics.github.io/internvla-a15.github.io/reference-assets/paper/InternVLA_A1_5.pdf" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/InternRobotics/InternVLA-A-series" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>π₀</strong><p>Black et al. (2024). <cite>π₀: A Vision-Language-Action Flow Model for General Robot Control</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2410.24164" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/Physical-Intelligence/openpi" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>GigaBrain-0.7</strong><p>GigaBrain Team et al. (2026). <cite>GigaBrain-0.7: Scaling Embodied Foundation Models to Emergent Capabilities with a Three-System Architecture</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2608.15875" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/open-gigaai/giga-brain-0" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>Fast-WAM</strong><p>Yuan et al. (2026). <cite>Fast-WAM: Do World Action Models Need Test-time Future Imagination?</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2603.16666" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/yuantianyuan01/FastWAM" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li></ol>`,
  ],

  metrics: [
    'What the numbers mean',
    `<p><b>SR</b> measures server-side complete success. <b>Score</b> is normalized terminal partial credit under task-specific rules.</p><p>Headline values average 26 task means equally: SR 46.7%, Score 0.654. There are 237 successes among 510 retained episodes; episode-weighted SR is 46.5%.</p><p>24 tasks have 20 instances; make_sandwich and microwave have 15 each. Attribute groups overlap and do not represent paired changes to identical tasks.</p>`,
  ],
};
let taskVideoReturnContext = null;

function openAppendix(key) {
  if (key === 'icl') {
    openICLPackage();
    return;
  }
  let content = notes[key];
  if (key === 'ablation') content = pairedICLContent();
  if (!content) return;
  taskVideoReturnContext = null;
  $('#appendix-dialog').dataset.content = key;
  $('#appendix-dialog').classList.remove('icl-dialog');
  $('#appendix-body').innerHTML = `<h2 id="appendix-title">${content[0]}</h2>${content[1]}`;
  if (!$('#appendix-dialog').open) $('#appendix-dialog').showModal();
  $('#appendix-body').scrollTop = 0;
  drawFigures($('#appendix-body'));
}
const observer = new IntersectionObserver(
  (entries) =>
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting && !target.getAttribute('src')) {
        target.src = target.dataset.src + '#t=0.1';
        target.preload = 'metadata';
      }
      if (!isIntersecting) target.pause();
    }),
  { rootMargin: '200px' },
);
function initVideos() {
  document.querySelectorAll('video[data-src]').forEach((v) => {
    if (v.dataset.bound) return;
    v.dataset.bound = 'true';
    observer.observe(v);
    v.addEventListener('error', () => {
      if (!v.parentElement.querySelector('.video-error'))
        v.insertAdjacentHTML(
          'afterend',
          '<p class="video-error">Recording could not load. <a href="' +
            v.dataset.src +
            ('" target="_blank">Open video directly ' + reportIcon('external-link') + '</a></p>'),
        );
    });
  });
}
function changeCase(id) {
  const area = document.querySelector('#case-' + id + ' .case-study-content');
  area.querySelectorAll('video').forEach((v) => {
    v.pause();
    observer.unobserve(v);
  });
  renderCaseSection(id);
}
function layoutCaseSelector(area) {
  const choices = area.querySelector('.case-heading .segmented');
  const heading = area.querySelector('.case-heading h3');
  const h4 = document.createElement('h4');
  h4.innerHTML = heading.innerHTML;
  heading.replaceWith(h4);
  choices.className = 'case-recording-tabs';
  area.prepend(choices);
  choices.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const buttons = [...choices.querySelectorAll('button')],
      i = buttons.indexOf(document.activeElement);
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? buttons.length - 1
          : (i + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length;
    buttons[next].click();
  });
}

document.addEventListener('click', (e) => {
  let el = e.target.closest('[data-appendix]');
  if (el) openAppendix(el.dataset.appendix);
  el = e.target.closest('[data-icl]');
  if (el) {
    iclTask = el.dataset.icl;
    changeCase('icl');
    document.querySelector('[data-icl="' + iclTask + '"]').focus({ preventScroll: true });
  }
  el = e.target.closest('[data-adapt]');
  if (el) {
    adaptTask = el.dataset.adapt;
    changeCase('adapt');
    document.querySelector('[data-adapt="' + adaptTask + '"]').focus({ preventScroll: true });
  }
  el = e.target.closest('[data-harness-case]');
  if (el) {
    const [id, key] = el.dataset.harnessCase.split(':');
    harnessTask[id] = key;
    changeCase(id);
    document.querySelector(`[data-harness-case="${id}:${key}"]`).focus({ preventScroll: true });
  }
  el = e.target.closest('[data-task-video]');
  if (el) openTaskVideo(el);
});

function openTaskVideo(trigger) {
  const demo = demos.find((item) => item.task === trigger.dataset.taskVideo);
  if (!demo) return;
  const dialog = $('#appendix-dialog');
  const table = trigger.closest('.table-scroll, .insight-table-scroll');
  taskVideoReturnContext = {
    trigger,
    x: window.scrollX,
    y: window.scrollY,
    table,
    tableLeft: table?.scrollLeft,
    tableTop: table?.scrollTop,
  };
  trigger.focus({ preventScroll: true });
  dialog.querySelectorAll('video').forEach((video) => video.pause());
  dialog.dataset.content = 'task-video';
  dialog.classList.remove('icl-dialog');
  $('#appendix-body').innerHTML =
    `<button type="button" class="appendix-link" data-close-task-video>${reportIcon('chevron-left')} Back to results</button><h2 id="appendix-title">${title(demo.task)}</h2>${mainVideo(demo.task, demo.seed, 'GPT-6-Astra', '')}`;
  if (!dialog.open) dialog.showModal();
  $('#appendix-body').scrollTop = 0;
  initVideos();
}

$('.close-dialog').addEventListener('click', () => $('#appendix-dialog').close());
$('#appendix-dialog').addEventListener('click', (e) => {
  if (e.target.closest('[data-close-task-video]')) {
    e.currentTarget.close();
    return;
  }
  if (e.target === $('#appendix-dialog')) {
    const r = e.target.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      e.target.close();
  }
});
$('#appendix-dialog').addEventListener('close', () => {
  $('#appendix-dialog')
    .querySelectorAll('video')
    .forEach((video) => {
      video.pause();
      observer.unobserve(video);
    });
  const context = taskVideoReturnContext;
  taskVideoReturnContext = null;
  if (!context) return;
  if (context.trigger.isConnected) context.trigger.focus({ preventScroll: true });
  if (context.table?.isConnected) {
    context.table.scrollLeft = context.tableLeft;
    context.table.scrollTop = context.tableTop;
  }
  window.scrollTo({ left: context.x, top: context.y, behavior: 'instant' });
});
Promise.all(
  ['tasks', 'demo-videos', 'ablations', 'report-figures', 'harness-results'].map((n) =>
    fetch('data/' + n + '.json').then((r) => {
      if (!r.ok) throw Error(n);
      return r.json();
    }),
  ),
)
  .then(([t, d, a, r, h]) => {
    tasks = t;
    demos = d;
    ablations = a;
    reportFigures = r;
    reportFigures.models.forEach((m) => {
      if (m.id === 'Astra (ICL)') m.label = 'GPT-6-Astra (ICL)';
      if (m.id === 'FastWAM') m.label = 'Fast-WAM';
    });
    renderAnalysis();
    renderHarness(h);
    renderCase();
    enhanceEvidence(document);
    initResearch();
    initNarrative();
    initShowcase();
    initRefresh();
  })
  .catch((error) => {
    console.error('Report initialization failed:', error);
    $('#mobile-content').innerHTML =
      '<p>Benchmark data could not load. Please reload the page.</p>';
  });
// Enlarge one camera pane without altering the original recording.
// These original interaction recordings are stitched overview / left wrist / right wrist.
function cameraPosition(video, view) {
  const source = (video.currentSrc || video.getAttribute('src') || video.dataset.src || '').split(
    /[?#]/,
  )[0];
  const file = source.split('/').pop();
  const overviewFirst =
    /(^|\/)media\/(demos|harness)\//.test(source) ||
    [
      'collect_coffee_beans_009-web.mp4',
      'detergent_000-web.mp4',
      'dishwasher_009-web.mp4',
      'apple_to_fruit_bowl_003-web.mp4',
      'apple_to_fruit_bowl_009-web.mp4',
      'fruit_015-web.mp4',
      'apple_to_fruit_bowl_006-web.mp4',
      'collect_coffee_beans_013-web.mp4',
    ].includes(file);
  return overviewFirst ? { left: 'center', center: 'left', right: 'right' }[view] || view : view;
}
function enhanceCameraView(v) {
  if (v.videoWidth / v.videoHeight < 4 || v.dataset.cameraReady) return;
  v.dataset.cameraReady = 'true';
  v.dataset.view = cameraPosition(v, 'center');
  const bar = document.createElement('div');
  bar.className = 'camera-controls';
  bar.setAttribute('aria-label', 'Recording view');
  bar.innerHTML = [
    ['center', 'Overview'],
    ['left', 'Left wrist'],
    ['right', 'Right wrist'],
  ]
    .map(
      ([key, name]) =>
        `<button data-camera="${key}" aria-pressed="${key === 'center'}">${name}</button>`,
    )
    .join('');
  (v.closest('.media-viewport') || v).insertAdjacentElement('afterend', bar);
  initSegmentedControl(bar);
}
document.addEventListener(
  'loadedmetadata',
  (e) => {
    if (e.target.tagName === 'VIDEO') enhanceCameraView(e.target);
  },
  true,
);
document.querySelectorAll('video').forEach((v) => {
  if (v.readyState) enhanceCameraView(v);
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-camera]');
  if (!b) return;
  const bar = b.parentElement,
    previous = bar.previousElementSibling,
    v = previous.tagName === 'VIDEO' ? previous : previous.querySelector('video');
  v.dataset.view = cameraPosition(v, b.dataset.camera);
  bar.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
});

function playGroupLabel(playing) {
  return `${playing ? 'Pause' : 'Play'} both ${reportIcon(playing ? 'pause' : 'play')}`;
}

function enhanceEvidence(root) {
  root.querySelectorAll('.evidence-pair:not(.case-videos)').forEach((pair) => {
    if (pair.closest('.evidence-stage')) return;
    const stage = document.createElement('div');
    stage.className = 'evidence-stage';
    pair.before(stage);
    stage.innerHTML = `<div class="evidence-stage-heading"><span>OBSERVE THE EXECUTION</span><button type="button" class="play-group" aria-pressed="false">${playGroupLabel(false)}</button></div>`;
    stage.append(pair);
  });
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('.play-group');
  if (!b) return;
  const videos = [...b.closest('.evidence-stage').querySelectorAll('video')];
  const play = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', String(play));
  b.innerHTML = playGroupLabel(play);
  for (const v of videos) {
    if (play) {
      v.muted = true;
      if (!v.src) v.src = v.dataset.src;
      try {
        await v.play();
      } catch {
        const playing = videos.some((video) => !video.paused && !video.ended);
        b.setAttribute('aria-pressed', String(playing));
        b.innerHTML = playGroupLabel(playing);
      }
    } else v.pause();
  }
});

document.addEventListener('click', async (e) => {
  const b = e.target.closest('.video-start');
  if (!b) return;
  const v = b.parentElement.querySelector('video');
  v.controls = true;
  try {
    await v.play();
  } catch {
    v.controls = true;
    b.hidden = true;
  }
});
document.addEventListener(
  'play',
  (e) => {
    if (e.target.tagName !== 'VIDEO' || e.target.dataset.customControls) return;
    e.target.controls = true;
    const b = e.target.closest('.media-viewport')?.querySelector('.video-start');
    if (b) b.hidden = true;
  },
  true,
);

for (const event of ['play', 'pause', 'ended'])
  document.addEventListener(
    event,
    (e) => {
      if (e.target.tagName !== 'VIDEO') return;
      const stage = e.target.closest('.evidence-stage');
      if (!stage) return;
      const playing = [...stage.querySelectorAll('video')].some((v) => !v.paused && !v.ended),
        button = stage.querySelector('.play-group');
      button.setAttribute('aria-pressed', String(playing));
      button.innerHTML = playGroupLabel(playing);
    },
    true,
  );

// Keep the Model References anchor opening its shared dialog.
const appendixAnchors = {
  '#model-references': 'sources',
};
function openLinkedAppendix() {
  const key = appendixAnchors[location.hash];
  if (key) openAppendix(key);
}
window.addEventListener('hashchange', openLinkedAppendix);
window.addEventListener('DOMContentLoaded', openLinkedAppendix);
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  const key = link && appendixAnchors[link.hash];
  if (key) openAppendix(key);
});

function drawFigures(root = document) {
  root.querySelectorAll('[data-dumbbells]:not([data-ready])').forEach((host) => {
    host.dataset.ready = 'true';
    const which = host.dataset.dumbbells,
      pairs = ablations.pairs.filter((p) =>
        which === 'historical'
          ? p.experiment !== 'frame_gear_fresh'
          : p.experiment === 'frame_gear_fresh' && (which === 'fresh' || p.task === which),
      );
    const draw = () =>
      viz.pairedDumbbells(host, { pairs, compact: host.classList.contains('paired-mini-chart') });
    draw();
    viz.resizeRedraw(host, draw);
  });
  viz.bindTips(root === document ? document.body : root);
}

function initRefresh() {
  viz.readingProgress();
  viz.sectionAnchors();
  drawFigures(document);
}
