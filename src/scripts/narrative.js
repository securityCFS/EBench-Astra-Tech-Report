/* Editorial narrative rendered into [data-narrative] containers. */
const reportNarrative = {
  introduction: [
    'Recent advances in frontier large language models have opened new possibilities for embodied agents, enabling robots to interpret open-ended instructions, reason about their surroundings, and adapt their behaviors beyond fixed trajectory execution. However, whether these capabilities translate into reliable physical task completion remains an open question. In this work, we evaluate GPT-6-Astra as an embodied agent and examine how its capabilities compare with those of post-trained robot policies.',
    'To systematically measure these capabilities, we select EBench as our simulation benchmark, which enables assessment of embodied agents across diverse functional scenarios and realistic task settings, including household, retail, and industrial environments. Through its task-level annotations of mobility, manipulation precision, and task horizon, EBench allows us to establish structured comparisons between GPT-6-Astra and post-trained robot policies, while providing fine-grained analysis of where different approaches succeed or fail. In addition, EBench incorporates controlled variations in objects, backgrounds, and instructions to evaluate robustness under changing deployment conditions. Our evaluation covers the complete EBench test set, including 26 tasks and 510 episodes, comparing GPT-6-Astra with seven post-trained policies using task success and partial completion scores. GPT-6-Astra operates through a fixed robot execution interface and receives one annotated demonstration per task as contextual input.',
    "Our evaluation reveals GPT-6-Astra's strengths in short-horizon manipulation, while also exposing challenges in precise contact-rich interaction and long-horizon execution. Beyond aggregate performance, we analyze exploration, recovery, and safety behaviors through task comparisons, and further examine GPT-6-Astra's capabilities beyond individual manipulation primitives through case studies on in-context learning, adaptive replanning, and skill composition.",
  ],
  relatedWork: [
    'Recent reports have begun to explore frontier agents as robot policies. The <a class="source-link" href="https://robodojo-benchmark.com/" target="_blank" rel="noopener">RoboDojo</a> <a class="paper-citation" href="#ref-robodojo" role="doc-biblioref" aria-label="Reference 3">[3]</a> <a class="source-link" href="https://robodojo-benchmark.com/report/gpt-6-astra-eval" target="_blank" rel="noopener">evaluation</a> tests direct robot control and adaptation under visual and action perturbations <a class="paper-citation" href="#ref-robodojo-astra" role="doc-biblioref" aria-label="Reference 4">[4]</a>. GPT 6 Astra as an Embodied Policy <a class="paper-citation" href="#ref-embodied-policy" role="doc-biblioref" aria-label="Reference 5">[5]</a> compares direct control with Astra-guided correction of π₀.₅ on RoboDojo and RoboLab. PhysEvo <a class="paper-citation" href="#ref-physevo" role="doc-biblioref" aria-label="Reference 6">[6]</a> explores self-evolution driven by execution feedback on a selected set of RoboDojo tasks. Embodied In-Context Learning for GPT-6 Astra <a class="paper-citation" href="#ref-roboicl" role="doc-biblioref" aria-label="Reference 7">[7]</a> investigates adaptation from executable demonstrations. Pantograph <a class="paper-citation" href="#ref-pantograph" role="doc-biblioref" aria-label="Reference 8">[8]</a> compares frontier models on real-robot manipulation. StationeryBench <a class="paper-citation" href="#ref-stationerybench" role="doc-biblioref" aria-label="Reference 9">[9]</a> compares GPT-6-Astra with MolmoAct2 on bimanual tasks. EmbodiedSWE <a class="paper-citation" href="#ref-embodiedswe" role="doc-biblioref" aria-label="Reference 10">[10]</a> extends the evaluation of coding agents to long-horizon dexterous robotics. These studies reveal promising but uneven capabilities. Yet task success alone does not separate understanding what to do from being able to execute it: the same outcome can conceal different strengths in visual grounding, planning, contact control and recovery. In contrast, we study a complementary capability profile across mobility, precision and task horizon, alongside controlled changes in objects, backgrounds and instructions. Evaluating these dimensions within one benchmark helps us compare GPT-6-Astra with post-trained policies, identifying where it performs better and where precise contact or sustained execution remains challenging.',
  ],
  overall: [
    'With one demonstration per task, GPT-6-Astra ranks third on success rate and second on partial-completion score among all models, only 8.6 percentage points behind the top-ranked policy, OpenWAM-α. Unlike the post-trained policies, which are trained on the EBench training data, GPT-6-Astra receives only this single demonstration per task. Specifically, the agent leads all eight models in average success rate across the 11 short-horizon tasks, but falls behind on average in the tabletop dexterous-and-precise (D&P) and long-horizon groups. This aggregate outcome blends substantial leads on certain tasks with notable deficits on others. We begin with the distance between the two metrics: success rate counts only finished tasks, while score credits the stages an episode reaches, so the gap between them separates episodes that fail outright from those that stall part-way. That separation is what motivates the capability comparison that follows, in which the task annotations are taken in turn. Execution videos and interaction logs then capture the qualitative behaviors behind the numbers. We examine how execution breaks down, where the models diverge, and how the agent reacts to these failures.',
  ],
  mobile: [
    "We take two tasks to demonstrate GPT-6-Astra's advantage: remote-to-holder and bookmark placement. On remote-to-holder, GPT-6-Astra completes all 20 episodes, compared to 65% for OpenWAM-α. On bookmark placement, it achieves 90%, whereas the next-best model (π₀.₅) reaches 55%. The bookmark scene requires selecting the target object amid clutter; in these examples, the observed target selection and placement behavior suggests capable visual grounding and spatial reasoning.",
  ],
  shifts: [
    'Beyond differences between task types, we evaluate whether GPT-6-Astra maintains its capabilities when objects, backgrounds, and instructions change. Each task uses the same demonstration across perturbation conditions, requiring the agent to adapt that example to the current scene and instruction.',
    "Across these conditions, GPT-6-Astra performs at an even level: no single type of perturbation stands out as harder for it. The post-trained policies show clear gaps between conditions, and every one of them performs worst under mixed perturbations.",
  ],
  precision: [
    'At the aggregate level, success declines most steeply as tasks move from coarse transport to precise contact. GPT-6-Astra’s success rate falls from 60.6% on low-precision tasks to 40.2% on medium-precision tasks and 11.3% on high-precision tasks; its ranking drops from second to seventh. Every model finds the high-precision group harder, but GPT-6-Astra’s relative position deteriorates particularly strongly.',
    'Peg insertion makes the gap between progress and completion concrete: GPT-6-Astra obtains a mean Score of 0.600 but only 20% success. Nut tightening shows the same pattern, with 0.550 Score and 10% success. Reaching the target neighborhood is often insufficient; the remaining alignment and sustained contact determine whether the task is actually finished.',
    'Estimating surface height, clearance, and contact geometry is a long-standing problem for learned policies, but a new one for a reasoning agent. These quantities can in principle be inferred by combining RGB images with the absolute end-effector pose, yet neither a single frame nor the robot state alone determines them: one image leaves depth ambiguous, and the pose locates the gripper without locating the surface it is about to meet. A policy absorbs this uncertainty implicitly from its training data; the agent has to resolve it explicitly, from the observations it chooses to request.',
  ],
  horizon: [
    'GPT-6-Astra’s success rate falls from 73.2% on the 11 short-horizon tasks, where it ranks first, to 27.3% on the 15 long-horizon tasks, where it ranks sixth; OpenWAM-α reaches 47.6% on the long-horizon group. Detergent placement reaches 55% success with a partial Score of 0.800; dishwasher execution reaches only 5% success with a Score of 0.533. Intermediate progress repeatedly fails to become a completed procedure.',
    'A retry can repair a local failure, but it can also spend the remaining execution budget or disturb an already achieved goal. Each retry uses part of the fixed physics-step budget. The next visual observation arrives after the full action chunk returns, so grasp loss or contact changes within that chunk can precede the next correction.',
    'This raises the question of how to recover without losing progress: when to inspect the scene and when to change the procedure. Bottle placement, shown below, illustrates a shared challenge: all eight models have zero complete successes on that task.',
  ],
  behavior: [
    'The recordings show how GPT-6-Astra responds when an action fails. It changes wrist or gripper configurations and returns to goals that later manipulation has undone. In the teacup comparison in the Case Studies, the cup is displaced after its initial placement; the agent subsequently goes back for it.',
    'What has happened within an episode becomes context for the next decision: the agent records a possible explanation for a failed action and subsequently revises its approach. This behavior is consistent with feedback-informed adaptation; the action notes do not independently establish the cause of the failure.',
  ],
  apple: [
    'GPT-6-Astra’s first transport attempt fails. The agent identifies a possible slip from the closed finger gap, moves its hand clear, and <strong>withdraws to obtain a wider view</strong> of the tabletop. After locating and regrasping the apple, its action note links a new transport strategy to the earlier failure: <strong>use the arm alone and avoid the previous base-motion slip</strong>.',
    'The demonstration used a base shift between pickup and bowl placement. The agent changes that procedure using what happened in this episode, then <strong>completes the task with server-confirmed success</strong>. Its action notes explicitly connect the earlier failure to the revised transport strategy.',
  ],
  coffee: [
    'The supplied execution guidance gives height caveats, and the demonstration a spoon-based collection procedure. During execution, GPT-6-Astra requests a spoon motion angled toward the tabletop, switches to scraping with the fingers, and adjusts the scraping height and tilt. These revisions show <strong>adaptation during execution</strong>, although collection remains unfinished: the episode ends with <strong>Score 0.500 and no complete success</strong>.',
  ],
  fruit: [
    'The live task asks for a milkshake in the cup, whereas the historical example places fruit in a large jug. The reference explicitly instructs the agent to prioritize the live task. GPT-6-Astra follows this guidance: its recorded action chooses the small cup, adapting the demonstrated procedure to the <strong>destination in the current instruction</strong>.',
    'The episode still ends incomplete with <strong>Score 0.600</strong>. This distinguishes <strong>selecting the requested destination from completing the physical task</strong>.',
  ],
  recovery: [
    'In the teacup task, GPT-6-Astra initially targets the handle region and adjusts its wrist and gripper configuration across successive attempts before securing the teacup and teapot. This behavior is consistent with affordance-informed grasp selection and replanning. After initially placing the cup on the saucer, subsequent manipulation displaces it. GPT-6-Astra later revisits the cup, re-establishes a grasp, and carries it back toward the saucer, demonstrating a response to an invalidated state rather than simply continuing the preceding action sequence.',
    'In contrast, π₀.₅ performs repeated approach and retraction motions without completing the cup transfer. OpenWAM-α attempts to grasp the cup but fails, then moves the teapot onto the tray while leaving the cup off the saucer. The contrast therefore concerns not only object-handling ability, but whether ongoing execution is redirected to resolve unmet or disrupted task requirements.',
  ],
  fine: [
    'The glasses packing task exposes a different limitation. GPT-6-Astra successfully performs the coarse bimanual transfer, while the breakdown occurs during the subsequent adjustments needed to fold the temples and close the lid. The temples remain protruding after manipulation, obstructing closure, and further corrective contacts do not resolve the packing problem.',
    'This rollout indicates the distinction between making progress toward a task goal and satisfying its final requirements: GPT-6-Astra completes the initial placement but struggles with the precise folding and alignment needed for closure.',
    'In the π₀.₅ rollout, the glasses are placed in the case and the temples are folded into a more compact state, although the lid remains open at the end. OpenWAM-α additionally completes lid closure after the folding sequence. These results highlight more accurate execution of the fine-grained manipulation by the post-trained policies.',
  ],
  adaptSummary: [
    'Together, the observed behavior is consistent with complementary capabilities in these examples: GPT-6-Astra adjusts its grasps and revisits disrupted goals, whereas the post-trained policies execute the precision task more accurately. Broad task understanding and observation-conditioned revision do not by themselves guarantee precise physical execution; conversely, successful execution of a familiar action trajectory does not necessarily entail recovery when a task requirement remains unmet.',
  ],
  iclFrame: [
    'In the photo-frame task, zero-shot execution reaches and moves the target and repeatedly adjusts its approach and wrist orientation without completing the required manipulation. After observing a demonstration, GPT-6-Astra adopts a more appropriate grasp orientation and coordinates both grippers to manipulate the frame, then stands the frame against the pen holder.',
  ],
  iclGear: [
    'In the gear installation task, zero-shot execution likewise demonstrates basic object-handling ability: GPT-6-Astra grasps and lifts the gear, but its placement attempts leave the gear outside the intended assembly position, and installation remains incomplete. With ICL, it positions the gear in the gap between the two existing gears, lowers it into place, releases it, and withdraws the gripper, leaving the gear installed.',
  ],
  iclSummary: [
    'The frame and gear examples show how a demonstration can guide grasp geometry and the operation sequence <strong>without parameter updates</strong>. Across all 20 seeds of each task, matched with and without the demonstration, it raises frame placement from 1 to 13 complete successes (mean Score 0.283 to 0.800), while gear installation stays at 3 of 20 in both conditions (mean Score 0.200).',
    'In-context learning is most useful when the demonstrated experience is instructive to the agent. In frame placement, it supplies the two-arm division of labor that zero-shot execution does not find, and complete successes rise accordingly. In precise operations such as gear installation, the demonstration still helps correct the attempt, guiding the gear toward the gap and into place, but it does not turn into more successes: what the agent lacks there is precise action, which a demonstration does not supply.',
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
  $('#behavior-content .behavior-narrative').innerHTML = narrativeHTML(key);
}
function initNarrative() {
  document
    .querySelectorAll('[data-narrative]')
    .forEach((el) => (el.innerHTML = narrativeHTML(el.dataset.narrative)));
  $('#mobile-content .finding-story').innerHTML = narrativeHTML('mobile');
  $('#mobile-content .finding-story').classList.add('report-prose');
  $('#mobile-content').insertAdjacentHTML(
    'beforeend',
    `<div class="report-prose shift-analysis"><h3>Flatter performance across perturbations</h3>${narrativeHTML('shifts')}</div>`,
  );
  initAnalysisInsights();
  const library = $('#video-library');
  library.addEventListener('toggle', () => {
    if (!library.open) library.querySelectorAll('video').forEach((v) => v.pause());
  });
}
