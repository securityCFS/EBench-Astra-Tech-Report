// The archived September 17, 2026 leaderboard includes this overall-only entry.
// Keep it separate from reportFigures.models: detailed analyses use eight models.
const overallOnlyModel = {
  key: 'AMapbot',
  label: 'AMapbot',
  sr: 0.4891,
  score: 0.6386,
};

const labels = {
  'Astra (ICL)': 'GPT-6-Astra-ICL',
  'OpenWAM-Alpha': 'OpenWAM-α',
  FastWAM: 'Fast-WAM',
};

export function buildOverallRanking(reportFigures, onlineTotals) {
  const reportedTotals = new Map(onlineTotals.map((model) => [model.model, model]));
  const models = reportFigures.models.map((model) => {
    // Preserve the leaderboard's reported totals, not episode-recomputed rounding.
    const totals = reportedTotals.get(model.id) ?? model;
    return {
      key: model.id,
      label: labels[model.id] ?? model.label,
      sr: totals.sr,
      score: totals.score,
    };
  });
  return [...models, { ...overallOnlyModel }].sort((a, b) => b.sr - a.sr);
}
