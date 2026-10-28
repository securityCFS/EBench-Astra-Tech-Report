const labels = {
  'Astra (ICL)': 'GPT-6-Astra',
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
  return models.sort((a, b) => b.sr - a.sr);
}
