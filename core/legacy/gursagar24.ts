import type { StudioSite } from '@/core/studio/types';
import { buildSite, type PlainSite } from './build';
import content from './gursagar24.json';

/**
 * Gursagar's original hand-built portfolio, as a Studio site.
 *
 * `gursagar24.json` was produced once from `public/gursagar24/index.html` by a
 * conversion script; the pictures stay where they were, under
 * `/gursagar24/img/`. This seeds the portfolio when its owner claims the
 * address — after that, the Studio is where it is edited.
 */
export function gursagar24Site(): StudioSite {
  return buildSite(content as PlainSite);
}
