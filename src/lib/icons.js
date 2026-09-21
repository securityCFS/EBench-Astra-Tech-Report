import play from 'lucide-static/icons/play.svg?raw';
import pause from 'lucide-static/icons/pause.svg?raw';
import chevronLeft from 'lucide-static/icons/chevron-left.svg?raw';
import chevronRight from 'lucide-static/icons/chevron-right.svg?raw';
import chevronDown from 'lucide-static/icons/chevron-down.svg?raw';
import download from 'lucide-static/icons/download.svg?raw';
import externalLink from 'lucide-static/icons/external-link.svg?raw';
import bookOpen from 'lucide-static/icons/book-open.svg?raw';
import code from 'lucide-static/icons/code.svg?raw';
import check from 'lucide-static/icons/check.svg?raw';
import x from 'lucide-static/icons/x.svg?raw';
import menu from 'lucide-static/icons/panel-left.svg?raw';
import arxiv from 'simple-icons/icons/arxiv.svg?raw';

// Task-trait marks, drawn on the lucide grid so they sit beside the other icons.
// Precision is a target whose rings tighten from low to high; horizon is a chain of
// steps, two for a short procedure and four for a long one. All five share one box,
// so a column of them aligns without any text.
const trait = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const precisionLow = trait('<circle cx="12" cy="12" r="8.5"/>');
const precisionMedium = trait('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.25"/>');
const precisionHigh = trait(
  '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.25"/><circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none"/>',
);
const horizonShort = trait(
  '<path d="M9.5 12h5"/><circle cx="7.5" cy="12" r="2.4" fill="currentColor" stroke="none"/><circle cx="16.5" cy="12" r="2.4" fill="currentColor" stroke="none"/>',
);
const horizonLong = trait(
  '<path d="M5 12h14"/><circle cx="3.5" cy="12" r="2.4" fill="currentColor" stroke="none"/><circle cx="9.17" cy="12" r="2.4" fill="currentColor" stroke="none"/><circle cx="14.83" cy="12" r="2.4" fill="currentColor" stroke="none"/><circle cx="20.5" cy="12" r="2.4" fill="currentColor" stroke="none"/>',
);

// Import only the SVGs we use: no icon font, sprite download, or runtime package.
const icons = {
  play,
  pause,
  'chevron-left': chevronLeft,
  'chevron-right': chevronRight,
  'chevron-down': chevronDown,
  download,
  'external-link': externalLink,
  'book-open': bookOpen,
  code,
  check,
  x,
  menu,
  arxiv,
  'precision-low': precisionLow,
  'precision-medium': precisionMedium,
  'precision-high': precisionHigh,
  'horizon-short': horizonShort,
  'horizon-long': horizonLong,
};

/** Trusted, decorative SVG markup. The containing control supplies its accessible name. */
export function icon(name) {
  const source = icons[name];
  if (!source) throw new Error(`Unknown report icon: ${name}`);
  return source.replace(/<title>.*?<\/title>/gs, '').replace(/<svg\b([^>]*)>/, (_, attributes) => {
    // Normalize only the root: child rect dimensions are the pause glyph itself.
    const attrs = attributes.replace(/\s(?:width|height|role|class)="[^"]*"/g, '');
    return `<svg class="report-icon" aria-hidden="true" focusable="false" width="20" height="20"${attrs}${name === 'arxiv' ? ' fill="currentColor"' : ''}>`;
  });
}
