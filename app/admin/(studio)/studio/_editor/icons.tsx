import type { StudioBlock } from '@/core/studio/blocks';

/** Line icons for the Studio, drawn on a 24px grid at a 1.75 stroke. */

const PATHS: Record<string, string> = {
  Hero: 'M4 6h16M4 10h11M4 15h8M4 19h5',
  Heading: 'M6 4v16M18 4v16M6 12h12',
  Text: 'M4 6h16M4 10h16M4 14h16M4 18h10',
  Quote: 'M7 10a3 3 0 1 1 0 6M7 10v8M15 10a3 3 0 1 1 0 6M15 10v8',
  Button: 'M3 9a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM8 12h8',
  Image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
  PhotoGrid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  Split: 'M3 5h8v14H3zM14 8h7M14 12h7M14 16h4',
  Video: 'M4 6h12v12H4zM16 10l5-3v10l-5-3',
  Projects: 'M3 4h8v6H3zM13 4h8v6h-8zM3 14h8v6H3zM13 14h8v6h-8z',
  Contact: 'M3 6h18v12H3zM3 7l9 6 9-6',
  Social: 'M8 12a4 4 0 0 1 4-4h4a4 4 0 0 1 0 8h-1M16 12a4 4 0 0 1-4 4H8a4 4 0 0 1 0-8h1',
  Spacer: 'M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4',
  Divider: 'M3 12h18',
  add: 'M12 5v14M5 12h14',
  pages: 'M7 3h7l5 5v13H7zM14 3v5h5',
  design:
    'M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-1.3-1-1.6-1-2.6 0-.9.7-1.3 1.6-1.3H16a5 5 0 0 0 5-5c0-4.2-4-7.5-9-7.5zM7.5 11h.01M10 7.5h.01M15 7.5h.01',
  advanced: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6',
  desktop: 'M3 5h18v11H3zM8 20h8M12 16v4',
  tablet: 'M6 3h12v18H6zM11 18h2',
  phone: 'M8 3h8v18H8zM11 18h2',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  back: 'M15 18l-6-6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
};

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name] ?? PATHS.add} />
    </svg>
  );
}

export function BlockIcon({ type }: { type: StudioBlock }) {
  return <Icon name={type} size={22} />;
}
