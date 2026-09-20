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
