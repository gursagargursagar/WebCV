import 'server-only';
import { liveDeclaration } from './store';

/**
 * The link a portfolio shows when its owner has an approved declaration.
 *
 * Worded as what happened — a declaration was made and its document checked —
 * never as "verified": WebCV did not check that the facts are true.
 */

function declaredLabel(declaredOn: string): string {
  const date = new Date(declaredOn).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `Statutory declaration document checked · declared ${date}`;
}

/** Null when there is none — or when the lookup fails: a badge never breaks a portfolio. */
export async function declaredLink(site: string): Promise<{ href: string; label: string } | null> {
  try {
    const live = await liveDeclaration(site);
    if (!live?.declaredOn) return null;
    return { href: `/${site}/declaration`, label: declaredLabel(live.declaredOn) };
  } catch (err) {
    console.error('[webcv] Could not read the declaration badge.', err);
    return null;
  }
}
