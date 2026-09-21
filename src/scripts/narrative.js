/* Editorial narrative rendered into [data-narrative] containers. */
const reportNarrative = {
  introduction: [
    "Recent advances in frontier large language models have opened new possibilities for embodied agents, enabling robots to interpret open-ended instructions, reason about their surroundings, and adapt their behaviors beyond fixed trajectory execution. However, whether these capabilities translate into reliable physical task completion remains an open question. In this work, we evaluate GPT-6-Astra as an embodied agent and examine how its capabilities compare with those of learned robot policies. Our evaluation reveals GPT-6-Astra's strengths in short-horizon manipulation, while also exposing challenges in precise contact-rich interaction and long-horizon execution. We conduct task comparisons to analyze instruction following, exploration, recovery, and safety behaviors, and further examine how GPT-6-Astra performs beyond individual manipulation primitives through case studies on in-context learning, adaptive replanning, and skill composition.",
    'To systematically measure these capabilities, we select EBench as our simulation benchmark, which enables assessment of embodied agents across diverse functional scenarios and realistic task settings, including household, retail, and industrial environments. Through its task-level annotations of mobility, manipulation precision, and task horizon, EBench allows us to establish structured comparisons between GPT-6-Astra and learned robot policies, while providing fine-grained analysis of where different approaches succeed or fail. In addition, EBench incorporates controlled variations in objects, backgrounds, and instructions to evaluate robustness under changing deployment conditions. Our evaluation covers the complete EBench test set, including 26 tasks and 510 episodes, comparing GPT-6-Astra with seven learned policies using task success and partial completion scores. GPT-6-Astra operates through a fixed robot execution interface and receives one annotated demonstration per task as contextual input.',
  ],
  relatedWork: [
    'Recent reports have begun to explore this frontier. The <a class="source-link" href="https://robodojo-benchmark.com/" target="_blank" rel="noopener">RoboDojo</a> [1] <a class="source-link" href="https://robodojo-benchmark.com/report/gpt-6-astra-eval" target="_blank" rel="noopener">evaluation</a> [2] tests direct robot control and adaptation under visual and action perturbations; GPT 6 Astra as an Embodied Policy [3] compares direct control with Astra-guided correction of π₀.₅ on RoboDojo and RoboLab; and PhysEvo [4] explores self-evolution driven by execution feedback on a selected set of RoboDojo tasks. Embodied In-Context Learning for GPT-6 Astra [5] investigates adaptation from executable demonstrations. Pantograph [6] compares frontier models on real-robot manipulation, while StationeryBench [7] compares GPT-6-Astra with MolmoAct2 on bimanual tasks. EmbodiedSWE [8] extends the evaluation of coding agents to long-horizon dexterous robotics. These studies reveal promising but uneven capabilities. Yet task success alone does not separate understanding what to do from being able to execute it: the same outcome can conceal different strengths in visual grounding, planning, contact control and recovery. This motivates a complementary capability profile across mobility, precision and task horizon, alongside controlled changes in objects, backgrounds and instructions. Evaluating these dimensions within one benchmark helps us compare Astra with learned policies, identifying where it performs better and where precise contact or sustained execution remains challenging.',
  ],
  overall: [
    'With one demonstration per task, GPT-6-Astra <strong>ranks second among the eight models analyzed below</strong> on both success rate and partial-completion Score, behind OpenWAM-α by <strong>8.59 percentage points</strong> in success rate. This result compares task-specific adaptation from one demonstration with policies trained on the EBench dataset.',
    'The agent <strong>leads all eight models on the 12 short-horizon tasks</strong> and falls behind on <strong>tabletop and long-horizon tasks</strong>. The aggregate result combines large leads on some tasks with large deficits on others. <strong>Task-level results locate these gaps; execution videos and interaction logs provide examples of the behaviors associated with them.</strong> We examine where the models differ, how execution fails, and how the agent responds to those failures.',
  ],
  mobile: [
    'Grouping tasks by mobility and horizon reveals a clear split. On the 12 short-horizon tasks, GPT-6-Astra achieves <strong>73.19% success, the highest among all eight models</strong>, ahead of OpenWAM-α at 65.28% by <strong>7.92 percentage points</strong>. On the seven long-horizon tasks, the order reverses: 28.10% against 51.43%. The pooled mobile result of 56.58% combines a clear lead in one subgroup with a clear deficit in the other.',
    '<strong>Remote-to-holder and bookmark placement</strong> illustrate this advantage. The agent completes all 20 remote-to-holder episodes, versus 65% success for OpenWAM-α. On bookmark placement, it reaches <strong>90%, compared with 55%</strong> for the next-best model, π₀.₅. The bookmark scene requires selecting the intended target amid clutter. The observed target selection and placement behavior is consistent with useful visual grounding and spatial reasoning in these examples.',
  ],
  shifts: [
    'Beyond differences between task types, we examine whether GPT-6-Astra maintains its capabilities when objects, backgrounds and instructions change. Each task uses the same demonstration across perturbation conditions, requiring the agent to adapt that example to the current scene and instruction.',
    'GPT-6-Astra combines <strong>competitive success rates across all four perturbation conditions with a balanced performance profile</strong>: 44.17% for objects, 50.77% for backgrounds, 44.62% for instructions and 46.15% for mixed perturbations. It <strong>ranks first under mixed perturbations</strong>, ahead of OpenWAM-α at 44.62% and Qwen-RobotManip at 33.85%.',
    'OpenWAM-α and Qwen-RobotManip achieve higher success rates in the background and instruction conditions, but both perform substantially worse under mixed perturbations. GPT-6-Astra sustains a comparable level of performance when perturbations are combined. Its 6.60 percentage-point range—the smallest among the eight models—supports this finding alongside its absolute success rates. <strong>The distinctive result is the combination of strong performance and consistency across perturbation types.</strong>',
  ],
  precision: [
    'The sharpest failure pattern appears at the <strong>transition from coarse transport to precise contact</strong>. GPT-6-Astra’s success rate falls from 60.60% on low-precision tasks to 40.21% on medium-precision tasks and <strong>11.25% on high-precision tasks</strong>; its <strong>ranking drops from second to seventh</strong>. Every model finds the high-precision group harder, but GPT-6-Astra’s relative position deteriorates particularly strongly.',
    'Peg insertion makes the gap between progress and completion concrete: GPT-6-Astra obtains a mean <strong>Score of 0.6000 but only 20% success</strong>. Nut tightening shows the same pattern, with 0.5500 Score and 10% success. Reaching the target neighborhood is often insufficient; the remaining alignment and sustained contact determine whether the task is actually finished.',
    '<strong>Surface height, clearance, and contact geometry are plausible sources of uncertainty</strong> because RGB images and robot-frame end-effector poses do not directly provide them. This motivates studying how an agent can <strong>estimate and verify contact</strong>, and how reasoning might cooperate with a precise execution policy.',
  ],
  horizon: [
    'GPT-6-Astra’s success rate falls from 53.60% on short tasks to <strong>28.10% on long tasks</strong>; <strong>OpenWAM-α reaches 51.43%</strong> on the long-horizon group. Detergent placement reaches 55% success with a partial Score of 0.8000; dishwasher execution reaches <strong>only 5% success with a Score of 0.5333</strong>. Intermediate progress repeatedly fails to become a completed procedure.',
    'A retry can repair a local failure, but it can also <strong>spend the remaining execution budget or disturb an already achieved goal</strong>. Each retry uses part of the fixed physics-step budget. The next visual observation arrives after the full action batch returns, so grasp loss or contact changes within that batch can precede the next correction.',
    'This raises the question of <strong>how to recover without losing progress</strong>: when to inspect the scene and when to change the procedure. Bottle placement, shown below, illustrates a shared challenge: all eight models have zero complete successes on that task.',
  ],
  behavior: [
    'The recordings show how GPT-6-Astra responds when an action fails. It changes wrist or gripper configurations and returns to goals that later manipulation has undone. In the teacup comparison, the cup is displaced after its initial placement; the agent subsequently goes back for it.',
    'What has happened within an episode becomes context for the next decision: the agent records a possible explanation for a failed action and subsequently revises its approach. This behavior is consistent with feedback-informed adaptation; the action notes do not independently establish the cause of the failure.',
  ],
  apple: [
    'GPT-6-Astra’s first transport attempt fails. The agent identifies a possible slip from the closed finger gap, moves its hand clear, and <strong>withdraws to obtain a wider view</strong> of the tabletop. After locating and regrasping the apple, its action note links a new transport strategy to the earlier failure: <strong>use the arm alone and avoid the previous base-motion slip</strong>.',
    'The demonstration used a base shift between pickup and bowl placement. The agent changes that procedure using what happened in this episode, then <strong>completes the task with server-confirmed success</strong>. Its action notes explicitly connect the earlier failure to the revised transport strategy.',
  ],
  coffee: [
    'The supplied demonstration gives height guidance and a spoon-based collection procedure. During execution, GPT-6-Astra requests a spoon motion angled toward the tabletop, switches to scraping with the fingers, and adjusts the scraping height and tilt. These revisions show <strong>adaptation during execution</strong>, although collection remains unfinished: the episode ends with <strong>Score 0.50 and no complete success</strong>.',
  ],
  fruit: [
    'The live task asks for a milkshake in the cup, whereas the historical example places fruit in a large jug. The reference explicitly instructs the agent to prioritize the live task. GPT-6-Astra follows this guidance: its recorded action chooses the small cup, adapting the demonstrated procedure to the <strong>destination in the current instruction</strong>.',
    'The episode still ends incomplete with <strong>Score 0.60</strong>. This distinguishes <strong>selecting the requested destination from completing the physical task</strong>.',
  ],
  recovery: [
    'In the teacup task, GPT-6-Astra initially targets the handle region and adjusts its wrist and gripper configuration across successive attempts before securing the teacup and teapot. This behavior is consistent with affordance-informed grasp selection and replanning.',
    'After initially placing the cup on the saucer, subsequent manipulation displaces it. GPT-6-Astra later revisits the cup, re-establishes a grasp, and carries it back toward the saucer, demonstrating a response to an invalidated state rather than simply continuing the preceding action sequence.',
    'In contrast, π₀.₅ performs repeated approach and retraction motions without completing the cup transfer. OpenWAM attempts to grasp the cup but failed, then moves the teapot onto the tray while leaving the cup off the saucer. The contrast therefore concerns not only object-handling ability, but whether ongoing execution is redirected to resolve unmet or disrupted task requirements.',
  ],
  fine: [
    'The glasses packing task exposes a different limitation. GPT-6-Astra successfully performs the coarse bimanual transfer, while the breakdown occurs during the subsequent adjustments needed to fold the temples and close the lid. The temples remain protruding after manipulation, obstructing closure, and further corrective contacts do not resolve the packing problem.',
    'This rollout indicates the distinction between making planning toward a task goal and satisfying its final requirements: GPT-6-Astra completes the initial placement but struggles with the precise folding and alignment needed for closure.',
    'In the π₀.₅ rollout, the glasses are placed in the case and the temples are folded into a more compact state, although the lid remains open at the end. OpenWAM additionally completes lid closure after the folding sequence. These results highlight more accurate execution of the fine-grained manipulation by the specialized policies.',
  ],
  adaptSummary: [
    'Together, the observed behavior is consistent with complementary capabilities in these examples: GPT-6-Astra adjusts its grasps and revisits disrupted goals, whereas the specialized policies execute the precision task more accurately. Broad task understanding and observation-conditioned revision do not by themselves guarantee precise physical execution; conversely, successful execution of a familiar action trajectory does not necessarily entail recovery when a task requirement remains unmet.',
  ],
  iclFrame: [
    'In the photo-frame task, zero-shot execution demonstrates reaching and moving the target, repeatedly adjusts its approach and wrist orientation without completing the required manipulation. After observing a demonstration, GPT-6-Astra adopts a more appropriate grasp orientation and coordinates both grippers to manipulate the frame, then positions the frame over the cup.',
  ],
  iclGear: [
    'In the gear installation task, zero-shot execution likewise demonstrates basic object-handling ability: GPT-6-Astra grasps and lifts the gear, but its placement attempts leave the gear outside the intended assembly position, and installation remains incomplete. With ICL, it positions the gear in the gap between the two existing gears, lowers it into place, releases it, and withdraws the gripper, leaving the gear installed.',
  ],
  iclSummary: [
    'The frame and gear examples show how a demonstration can guide grasp geometry and the operation sequence <strong>without parameter updates</strong>. Eight matched episode pairs compare completion with and without the demonstration.',
    'Together, these cases suggest that in-context learning can supply task-specific geometric and procedural cues that help translate high-level task intent into executable interaction strategies. Their value lies not merely in clarifying what to manipulate, but in guiding how to grasp, bimanual coordinate, and place objects precisely to satisfy the task objective.',
  ],
};
const narrativeHTML = (key) => reportNarrative[key].map((p) => `<p>${p}</p>`).join('');
// Render static report prose independently of benchmark data and interactive modules.
document
  .querySelectorAll('[data-narrative]')
  .forEach((el) => (el.innerHTML = narrativeHTML(el.dataset.narrative)));
function updateLimitNarrative(kind) {
  const story = $('#limits-content .finding-story');
  story.innerHTML = narrativeHTML(kind);
  story.classList.add('report-prose');
}
function updateCaseNarrative(activeCase, area) {
  if (activeCase === 'poc') return;
  const key =
    activeCase === 'icl'
      ? iclTask === 'frame'
        ? 'iclFrame'
        : 'iclGear'
      : adaptTask === 'glasses'
        ? 'fine'
        : 'recovery';
  const description = area.querySelector('.case-description');
  const prose = document.createElement('div');
  prose.className = 'case-description report-prose';
  prose.innerHTML = narrativeHTML(key);
  description.replaceWith(prose);
  const insight = area.querySelector('.case-insight');
  insight.querySelector('p').remove();
  if (activeCase === 'icl') insight.insertAdjacentHTML('afterbegin', narrativeHTML('iclSummary'));
  if (activeCase === 'adapt')
    insight.insertAdjacentHTML('afterbegin', narrativeHTML('adaptSummary'));
}
function updateBehaviorNarrative(key) {
  const story = $('#behavior-content .behavior-evidence>div');
  story.querySelector('p').remove();
  const trace = story.querySelector('.trace-excerpt');
  if (key === 'apple') {
    trace.innerHTML =
      '<dt>Call 10 · detect and inspect</dt><dd>“The finger gap closed during transport, indicating the apple slipped. Move the empty hand clear to locate the apple before retrying.”</dd><dt>Call 11 · seek a better view</dt><dd>“Withdraw to a wider view of the tabletop to locate the slipped apple without disturbing the bowl.”</dd><dt>Call 17 · use the earlier experience</dt><dd>“Carry the apple a short distance left and forward using the arm alone, avoiding the earlier base-motion slip.”</dd>';
    story.insertAdjacentHTML('beforeend', narrativeHTML(key));
    return;
  }
  trace.insertAdjacentHTML(
    'beforeend',
    `<dt>Historical demonstration</dt><dd>${key === 'coffee' ? '“With the right hand, grasp the spoon handle, lift it out of its holder, and sweep the beans toward the jar.”' : '“The left hand then carries and releases each fruit into the large pale jug.”'}</dd>`,
  );
  story.insertAdjacentHTML('beforeend', narrativeHTML(key));
}
function initNarrative() {
  document
    .querySelectorAll('[data-narrative]')
    .forEach((el) => (el.innerHTML = narrativeHTML(el.dataset.narrative)));
  $('#mobile-content .finding-story').innerHTML = narrativeHTML('mobile');
  $('#mobile-content .finding-story').classList.add('report-prose');
  $('#mobile-content').insertAdjacentHTML(
    'beforeend',
    `<div class="report-prose shift-analysis"><h3>Strong and balanced performance across perturbations</h3>${narrativeHTML('shifts')}</div>`,
  );
  $('#mobile-content .shift-analysis').before($('#cross-group-analysis'));
  initAnalysisInsights();
  const library = $('#video-library');
  library.addEventListener('toggle', () => {
    if (!library.open) library.querySelectorAll('video').forEach((v) => v.pause());
  });
}
