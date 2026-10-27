/* One-sentence readings of the case studies, condensed from Appendix D of the arXiv report. */
const reportNarrative = {
  iclFrame:
    'With the demonstration, the agent holds the frame with both grippers and stands it upright against the pen holder, raising successes from 1 to 13 of 20.',
  iclGear:
    'With the demonstration, the agent brings the gear between the two mounted gears and lowers it, yet successes stay at 3 of 20.',
  recovery:
    'When the teapot displaces the cup, the agent re-grasps the cup and restores it to the saucer, whereas π₀.₅ never completes the cup transfer and OpenWAM-α leaves the cup off the saucer.',
  fine: 'The agent places the glasses in the case but leaves a temple protruding, so the lid cannot close, whereas π₀.₅ folds both temples and OpenWAM-α also closes the lid.',
};
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
  const prose = document.createElement('p');
  prose.className = 'case-description';
  prose.textContent = reportNarrative[key];
  description.replaceWith(prose);
  area.querySelector('.case-insight')?.remove();
}
function initNarrative() {
  const library = $('#video-library');
  library.addEventListener('toggle', () => {
    if (!library.open) library.querySelectorAll('video').forEach((v) => v.pause());
  });
}
