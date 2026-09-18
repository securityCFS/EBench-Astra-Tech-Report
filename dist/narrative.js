/* Editorial synthesis of the supplied report; provenance is in docs/REPORT-COPY.md. */
const reportNarrative = {
 introduction: [
  "Ever since the launch of GPT-6-Astra on September 3, 2026, the tech landscape has witnessed a paradigm shift. The model has demonstrated breathtaking capabilities across intent comprehension, human-computer interaction, and cross-device execution. As the robotics community dives deeper, a fascinating consensus is emerging: GPT-6-Astra possesses an unimaginable level of adaptability for <strong>embodied tasks</strong>. It appears to effortlessly bypass the traditional bottlenecks of end-to-end policies—such as visual distractors, complex instruction following, and policy composition—while exhibiting a robust drive for proactive exploration and problem-solving. This naturally begs the question: <strong>Where exactly is the capability frontier of this cutting-edge agent? And how will it reshape our current understanding of embodied policies?</strong>",
  "To find out, we turned to <strong><a class=\"ebench-inline-link\" href=\"https://github.com/InternRobotics/EBench\" target=\"_blank\" rel=\"noopener\">EBench</a></strong>. Powered by Isaac Sim, EBench is a comprehensive benchmark designed to simulate complex, real-world physical interactions under a massive variety of conditions. Through this lens, we aim to map out the capability landscapes of GPT-6-Astra versus existing policies, and explore whether they can ultimately inspire and cross-pollinate one another."
],
 overall: [
  'With one historical demonstration per task, GPT-6-Astra <strong>ranks second among eight systems</strong> on both success rate and partial-completion Score. OpenWAM-α leads by <strong>8.59 percentage points</strong> in success rate. This establishes that general-purpose multimodal control can compete with specialized policies under task-specific context; it does not establish that the agent approach dominates robot-specific training.',
  'The aggregate hides a more informative split. GPT-6-Astra is close to OpenWAM-α on mobile manipulation and leads on selected object-placement tasks, but falls much further behind on <strong>precision-sensitive and long-horizon execution</strong>. We therefore read the benchmark together with trajectories: <strong>selecting an appropriate goal, repairing a disrupted state, and physically completing an operation are distinct capabilities</strong>.'
 ],
 mobile: [
  'GPT-6-Astra reaches <strong>56.58% success across 19 mobile tasks</strong>, <strong>only 3.60 percentage points below OpenWAM-α</strong>. On seven tabletop tasks, its success rate drops to <strong>20.00%, versus 42.14%</strong> for OpenWAM-α. GPT-6-Astra’s relative strength appears when reaching and manipulating an object also requires working across a larger space and adjusting the robot’s viewpoint.',
  'The task-level results sharpen this picture. GPT-6-Astra completes all 20 remote-to-holder episodes, versus 65% success for OpenWAM-α. On bookmark placement, it reaches <strong>90%, compared with 55%</strong> for the next-best system, π₀.₅. The bookmark scene requires selecting the intended target amid clutter. These are strong end-to-end results consistent with useful visual grounding and spatial reasoning; the evaluation does not separately isolate recognition, localization, or the benefit of exploration.'
 ],
 shifts: [
  'Changing objects, backgrounds, instructions, and all three together gives GPT-6-Astra success rates of 44.17%, 50.77%, 44.62%, and 46.15%. It remains competitive, but the ranking changes with the perturbation. Its first-place mixed-condition result is <strong>only two successes ahead of OpenWAM-α out of 130 episodes</strong>.',
  'This is <strong>robustness within demonstrated task definitions</strong>: each task retains the same reference package across its variations. Unseen task composition asks a different question and is evaluated separately in the POC. Keeping these settings distinct matters when interpreting “generalization.”'
 ],
 precision: [
  'The sharpest failure pattern appears at the <strong>transition from coarse transport to precise contact</strong>. GPT-6-Astra’s success rate falls from 60.60% on low-precision tasks to 40.21% on medium-precision tasks and <strong>11.25% on high-precision tasks</strong>; its <strong>ranking drops from second to seventh</strong>. Every system finds the high-precision group harder, but GPT-6-Astra’s relative position deteriorates particularly strongly.',
  'Peg insertion makes the gap between progress and completion concrete: GPT-6-Astra obtains a mean <strong>Score of 0.6000 but only 20% success</strong>. Nut tightening shows the same pattern, with 0.5500 Score and 10% success. Reaching the target neighborhood is often insufficient; the remaining alignment and sustained contact determine whether the task is actually finished.',
  '<strong>Surface height, clearance, and contact geometry are plausible sources of uncertainty</strong> because RGB images and robot-frame end-effector poses do not directly provide them. This motivates studying how an agent can <strong>estimate and verify contact</strong>, and how reasoning might cooperate with a precise execution policy. The benchmark identifies the execution gap; it does not isolate its cause or demonstrate that a hybrid controller resolves it.'
 ],
 horizon: [
  'GPT-6-Astra’s success rate falls from 53.60% on short tasks to <strong>28.10% on long tasks</strong>, while <strong>OpenWAM-α retains 51.43%</strong> on the long-horizon group. Detergent placement reaches 55% success despite a high partial Score of 0.8000; dishwasher execution reaches <strong>only 5% success despite a Score of 0.5333</strong>. Useful intermediate progress repeatedly fails to become a completed procedure.',
  'Retries have two effects: they can repair a local failure, but they can also <strong>spend the remaining execution budget or disturb an already achieved goal</strong>. The agent observes elapsed simulator time without an explicit numeric remaining-step budget, and each action batch postpones its next observation until the batch returns. These conditions motivate investigating the interaction between retry decisions, feedback timing, and stage planning.',
  'The research question is therefore how to <strong>preserve progress while recovering</strong>: when to inspect, when to retry, and when to change the procedure. More time alone is not an established remedy. Bottle placement, shown below, also illustrates a shared challenge: all eight systems have zero complete successes on that task, so it should not be used to explain GPT-6-Astra’s relative ranking.'
 ],
 behavior: [
  'GPT-6-Astra’s most interesting behavior is visible in how it responds after an action. Recorded trajectories contain renewed approaches, changes in wrist or gripper configuration, and <strong>a return to requirements that later manipulation has invalidated</strong>. In the teacup comparison, for example, the cup is displaced after its initial placement; GPT-6-Astra subsequently revisits it instead of simply continuing with the teapot.',
  'These observations suggest an agent that can use an unfolding interaction as context for its next decision. The report also describes qualitative instances of <strong>explaining a failed action and using that explanation to guide another attempt</strong>. We distinguish three connected capabilities below: exploring an interaction, correcting it from feedback, and summarizing experience within the episode.'
 ],
 apple: [
  'GPT-6-Astra’s first transport attempt fails. GPT-6-Astra identifies a possible slip from the closed finger gap, moves its hand clear, and <strong>withdraws to obtain a wider view</strong> of the tabletop. After locating and regrasping the apple, its action note explicitly links a new transport strategy to the earlier failure: <strong>use the arm alone and avoid the previous base-motion slip</strong>.',
  'That adjustment is particularly informative because the historical demonstration used a base shift between pickup and bowl placement. GPT-6-Astra adapts the demonstrated procedure using what happened in this episode, then <strong>completes the task with server-confirmed success</strong>. The public action notes connect active observation, error recovery, and a lesson applied to the next attempt; they do not independently prove the physical cause of the slip.'
 ],
 coffee: [
  'The coffee-bean episode exposes both an attempt at contact correction and its limit. After the recorded request to angle the spoon toward the tabletop, later requests adjust the height and tilt of a finger-based scraping motion. GPT-6-Astra is revising how it interacts with the scene, although the episode ends with <strong>partial Score 0.50 and no complete success</strong>.',
  'The prompt already warns that local end-effector z is not table height, and the demonstration supplies a spoon-based collection procedure. The interesting behavior is the <strong>subsequent adaptation during execution</strong>; it should not be presented as an independently invented strategy or a verified measurement of the tabletop. A useful next evaluation would ask whether these adjustments reduce contact error and lead to completion.'
 ],
 fruit: [
  'The live task asks for a milkshake in the cup, whereas the historical example places fruit in a large jug. GPT-6-Astra’s recorded action explicitly chooses the small cup. This shows the importance of <strong>interpreting a demonstration as a procedure with object roles</strong>, rather than automatically replaying its destination.',
  'The reference itself instructs GPT-6-Astra to defer to the live task, so the choice is not evidence of rejecting guidance. The episode remains incomplete with Score 0.60. <strong>Task interpretation and physical completion</strong> must both be examined: neither the stated intention nor the terminal score establishes that choosing the cup caused the failure.'
 ],
 recovery: [
  'GPT-6-Astra first targets the teacup’s handle region and adjusts its wrist and gripper through successive attempts before securing the cup and teapot. After the cup is initially placed on the saucer, subsequent manipulation displaces it. GPT-6-Astra later returns, re-establishes a grasp, and carries it back toward the saucer. The significant event is <strong>a previously achieved requirement becoming a goal again</strong>.',
  'In the selected π₀.₅ rollout, repeated approach and retraction do not complete the cup transfer. OpenWAM moves the teapot onto the tray while leaving the cup off the saucer. These trajectories illustrate different responses to an unmet goal: GPT-6-Astra <strong>redirects its execution toward the disrupted state</strong>. They do not establish how frequently each system can recover across the benchmark.'
 ],
 fine: [
  'Glasses packing reveals the complementary advantage of specialized policies. GPT-6-Astra performs the coarse bimanual transfer, but the subsequent folding leaves the temples protruding from the case. Further corrective contacts do not resolve the obstruction, so <strong>lid closure remains unfinished</strong>.',
  'π₀.₅ places the glasses and folds the temples into a more compact state, although its lid remains open. <strong>OpenWAM additionally closes the lid</strong>. In these rollouts, recognizing the intended final arrangement and making repeated adjustments is not sufficient: <strong>accurate folding and alignment are decisive</strong>. The contrast with teacup recovery separates observation-conditioned revision from precision in execution.'
 ],
 iclFrame: [
  'Without a demonstration, GPT-6-Astra reaches and moves the frame, but repeated changes in approach and wrist orientation do not complete the manipulation. With ICL, it adopts a more appropriate grasp and coordinates both grippers to perform the placement. The demonstration contributes <strong>operational geometry and a division of labor between the arms</strong>, beyond simply naming the target object.'
 ],
 iclGear: [
  'Without a demonstration, GPT-6-Astra grasps and lifts the gear but leaves it outside the intended assembly position. With ICL, it brings the gear into the gap between the two existing gears, lowers it, releases it, and withdraws. The contrast concerns how to execute the operation: the <strong>placement geometry and sequence</strong> are central to completing the goal.'
 ],
 iclSummary: [
  'Together, the frame and gear examples suggest that demonstrations can turn high-level intent into a more suitable interaction strategy <strong>without parameter updates</strong>. The independent paired experiments below provide a small quantitative check; they are separate from the selected videos and the main benchmark. Because every main-cohort episode already uses ICL, the headline result <strong>cannot measure the improvement due to demonstrations alone</strong>.'
 ]
};
const narrativeHTML=key=>reportNarrative[key].map(p=>`<p>${p}</p>`).join('');
function updateLimitNarrative(kind){
 const story=$('#limits-content .finding-story');
 story.innerHTML=narrativeHTML(kind);
 story.classList.add('report-prose');
}
function updateCaseNarrative(){
 if(activeCase==='poc')return;
 const key=activeCase==='icl'?(iclTask==='frame'?'iclFrame':'iclGear'):activeCase;
 const description=$('#case-content .case-description');
 const prose=document.createElement('div');prose.className='case-description report-prose';
 prose.innerHTML=narrativeHTML(key);description.replaceWith(prose);
 const insight=$('#case-content .case-insight');
 insight.querySelector('p').remove();
 insight.insertAdjacentHTML('afterbegin',activeCase==='icl'?narrativeHTML('iclSummary'):'<p>GPT-6-Astra’s grasp revision and goal recovery, and the specialized policies’ more accurate fine manipulation, point to <strong>complementary capabilities</strong>. A future system needs both a way to reconsider what remains to be done and a way to carry out the required contact reliably.</p>');
}
function updateBehaviorNarrative(key){
 const story=$('#behavior-content .behavior-evidence>div');
 story.querySelector('p').remove();
 story.querySelector('button').remove();
 const trace=story.querySelector('.trace-excerpt');
 if(key==='apple'){
  trace.innerHTML='<dt>Call 10 · detect and inspect</dt><dd>“The finger gap closed during transport, indicating the apple slipped. Move the empty hand clear to locate the apple before retrying.”</dd><dt>Call 11 · seek a better view</dt><dd>“Withdraw to a wider view of the tabletop to locate the slipped apple without disturbing the bowl.”</dd><dt>Call 17 · use the earlier experience</dt><dd>“Carry the apple a short distance left and forward using the arm alone, avoiding the earlier base-motion slip.”</dd>';
  story.insertAdjacentHTML('beforeend',narrativeHTML(key)+'<a class="source-link" href="data/apple-recovery-evidence.json" target="_blank">Public action notes & terminal result ↗</a>');
  return;
 }
 trace.insertAdjacentHTML('beforeend',`<dt>Historical demonstration</dt><dd>${key==='coffee'?'“With the right hand, grasp the spoon handle, lift it out of its holder, and sweep the beans toward the jar.”':'“The left hand then carries and releases each fruit into the large pale jug.”'}</dd>`);
 story.insertAdjacentHTML('beforeend',narrativeHTML(key));
}
function initNarrative(){
 document.querySelectorAll('[data-narrative]').forEach(el=>el.innerHTML=narrativeHTML(el.dataset.narrative));
 $('#mobile-content .finding-story').innerHTML=narrativeHTML('mobile');
 $('#mobile-content .finding-story').classList.add('report-prose');
 $('#mobile-content').insertAdjacentHTML('beforeend',`<div class="report-prose shift-analysis"><h3>Robustness to changed scenes is not unseen-task composition</h3>${narrativeHTML('shifts')}<div class="viz-figure" data-slopes data-viz-linked></div><div class="viz-legend"><span>Success rate under each controlled perturbation; GPT-6-Astra and OpenWAM-α are emphasized. Hover a line to isolate a system.</span></div><button class="appendix-link" data-appendix="generalization">Compare the four perturbation settings ↗</button></div>`);
 const library=$('#video-library');
 library.addEventListener('toggle',()=>{if(!library.open)library.querySelectorAll('video').forEach(v=>v.pause());});
}
