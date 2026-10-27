// Derived comparisons; source values and denominators remain inspectable.
function renderPerturbationRanges(container) {
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
    );
  const conditions = [
    ['object', 'Object', 120],
    ['background', 'Background', 130],
    ['instruction', 'Instruction', 130],
    ['mix', 'Mix', 130],
  ];
  const rows = reportFigures.models
    .map((model) => {
      const rates = conditions.map(([key]) => model.generalization[key].sr * 100);
      return {
        id: model.id,
        label: modelLabel(model.id),
        rates,
        range: Math.max(...rates) - Math.min(...rates),
      };
    })
    .sort((a, b) => a.range - b.range || a.label.localeCompare(b.label));

  container.innerHTML = `
    <p class="perturbation-range-note" id="perturbation-range-note">
      <strong>How much does success rate change across conditions?</strong>
      Range is the highest minus the lowest success rate, in percentage points (pp).
    </p>
    <div class="table-scroll" tabindex="0" role="region" aria-label="Success rates and variation across perturbation conditions">
      <table class="report-table report-table--plain perturbation-range-table" aria-describedby="perturbation-range-note">
        <thead><tr><th scope="col">Model</th>${conditions.map(([, label, episodes]) => `<th scope="col">${label}<small>${episodes} episodes</small></th>`).join('')}<th scope="col" aria-sort="ascending">Range (pp)</th></tr></thead>
        <tbody>${rows.map((row) => `<tr data-model="${escape(row.id)}" class="${row.id === 'Astra (ICL)' ? 'highlight' : ''}"><th scope="row">${escape(row.label)}</th>${row.rates.map((rate, i) => `<td data-condition="${conditions[i][0]}" data-value="${rate}">${rate.toFixed(1)}%</td>`).join('')}<td class="perturbation-range-value" data-range="${row.range}">${row.range.toFixed(1)}</td></tr>`).join('')}</tbody>
      </table>
    </div>`;
}
