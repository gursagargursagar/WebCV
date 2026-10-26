'use client';

import dynamic from 'next/dynamic';

/** Puck's editor runs in the browser only; the server sends a quiet placeholder. */
export const StudioLoader = dynamic(() => import('./studio-app').then((m) => m.StudioApp), {
  ssr: false,
  loading: () => (
    <div className="scai min-h-screen bg-bg" aria-busy="true" aria-label="Loading the Studio" />
  ),
});
