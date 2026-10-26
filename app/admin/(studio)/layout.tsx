import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireOwner, UnauthorizedError } from '@/core/auth/guard';

export const metadata: Metadata = {
  title: { default: 'Studio', template: '%s — Studio' },
  robots: { index: false, follow: false },
};

/**
 * The Studio's own shell: none, on purpose.
 *
 * Kept out of `(protected)` because the Studio is a full-screen editor — the
 * admin's header and sidebar would take room from the preview, which is the
 * whole point of it. The guard is the same as the admin's, and like the
 * admin's it is user experience: every endpoint the Studio calls checks the
 * session itself.
 */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireOwner();
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/admin/login?next=/admin/studio');
    throw err;
  }
  return children;
}
