'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FieldLabel, registerOverlayPortal, setDeep, useGetPuck } from '@puckeditor/core';
import type { CustomFieldRender } from '@puckeditor/core';
import { useStudio } from './context';

/**
 * The editor's in-preview controls.
 *
 * These render inside the preview frame, over Puck's selection overlay. Each
 * registers itself as an overlay portal so a click or a keystroke reaches it
 * instead of starting a drag of the block underneath.
 */

function usePortal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => registerOverlayPortal(ref.current, { disableDrag: true }), []);
  return ref;
}

/** Text edited where it sits: the site name, a project's title. Saved on blur. */
export function InlineText({
  value,
  onCommit,
  placeholder,
  label,
  multiline,
}: {
  value: string;
  onCommit(value: string): void;
  placeholder: string;
  label: string;
  multiline?: boolean;
}) {
  const ref = usePortal<HTMLSpanElement>();
  return (
    <span
      // Remounts when the value changes elsewhere (the Pages panel), so the
      // browser's edited DOM never disagrees with React's.
      key={value}
      ref={ref}
      className="studio-inline"
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      tabIndex={0}
      aria-label={label}
      aria-multiline={multiline ? true : undefined}
      data-placeholder={placeholder}
      spellCheck
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !multiline) {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
          e.currentTarget.textContent = value;
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        const next = (e.currentTarget.textContent ?? '').replace(/\s+$/, '');
        if (next !== value) onCommit(next.trim());
      }}
    >
      {value}
    </span>
  );
}

function FilePill({
  label,
  busyLabel,
  onFile,
}: {
  label: string;
  busyLabel: string;
  onFile(file: File): Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        className="studio-pill"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <UploadIcon />
        {busy ? busyLabel : label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = '';
          if (!file) return;
          setBusy(true);
          try {
            await onFile(file);
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

/** "Replace image" over a picture in the preview. Writes the block's prop directly. */
export function ImageTools({
  blockId,
  prop,
  label = 'Replace image',
}: {
  blockId: string;
  prop: string;
  label?: string;
}) {
  const ref = usePortal<HTMLDivElement>();
  const getPuck = useGetPuck();
  const { upload } = useStudio();

  async function onFile(file: File) {
    const url = await upload(file);
    if (!url) return;
    const { getItemById, getSelectorForId, dispatch } = getPuck();
    const item = getItemById(blockId);
    const selector = getSelectorForId(blockId);
    if (!item || !selector) return;
    dispatch({
      type: 'replace',
      destinationIndex: selector.index,
      destinationZone: selector.zone,
      data: { ...item, props: setDeep(item.props, prop, url) },
    });
  }

  return (
    <div ref={ref} className="studio-tools">
      <FilePill label={label} busyLabel="Uploading…" onFile={onFile} />
    </div>
  );
}

/** On a project page: change the picture its card shows in the project grid. */
export function CoverTools({ pageId }: { pageId: string }) {
  const ref = usePortal<HTMLDivElement>();
  const { upload, updatePage, pageCover } = useStudio();
  const cover = pageCover(pageId);
  return (
    <div ref={ref} className="studio-cover">
      {cover ? <img src={cover} alt="" className="studio-cover-thumb" /> : null}
      <FilePill
        label={cover ? 'Change cover image' : 'Add a cover image'}
        busyLabel="Uploading…"
        onFile={async (file) => {
          const url = await upload(file);
          if (url) updatePage(pageId, { cover: url });
        }}
      />
    </div>
  );
}

/** A button inside a block that opens another page — "Edit project" on a card. */
export function OpenButton({ pageId, label }: { pageId: string; label: string }) {
  const ref = usePortal<HTMLButtonElement>();
  const { openPage } = useStudio();
  return (
    <button
      ref={ref}
      type="button"
      className="studio-pill"
      onClick={(e) => {
        e.stopPropagation();
        openPage(pageId);
      }}
    >
      {label}
      <span aria-hidden="true">→</span>
    </button>
  );
}

/** The inspector's image field: upload, paste a link, or remove. */
export const ImageField: CustomFieldRender<string> = ({ field, value, onChange, id }) => (
  <ImageFieldInner label={field.label ?? 'Image'} value={value ?? ''} onChange={onChange} id={id} />
);

function ImageFieldInner({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  id: string;
}) {
  const { upload } = useStudio();
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const external = /^https:\/\//.test(value) ? value : '';

  return (
    <FieldLabel label={label} el="div">
      <div className="studio-imagefield">
        <div className="studio-imagefield-thumb">
          {value ? <img src={value} alt="" /> : <span>No image yet</span>}
        </div>
        <div className="studio-imagefield-row">
          <button
            type="button"
            className="studio-btn primary"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? 'Uploading…' : value ? 'Replace' : 'Upload image'}
          </button>
          {value ? (
            <button type="button" className="studio-btn" onClick={() => onChange('')}>
              Remove
            </button>
          ) : null}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = '';
            if (!file) return;
            setBusy(true);
            try {
              const url = await upload(file);
              if (url) onChange(url);
            } finally {
              setBusy(false);
            }
          }}
        />
        <label className="studio-imagefield-link" htmlFor={`${id}-url`}>
          Or paste an image link
        </label>
        <input
          id={`${id}-url`}
          key={external}
          className="studio-input"
          type="url"
          inputMode="url"
          placeholder="https://…"
          defaultValue={external}
          onBlur={(e) => {
            const next = e.currentTarget.value.trim();
            if (next && next !== value && /^https:\/\//.test(next)) onChange(next);
          }}
        />
      </div>
    </FieldLabel>
  );
}

/**
 * Wraps the preview frame's document: gives it the font variables, and turns
 * a click on a menu link into "open that page" instead of a navigation.
 */
export function FrameBridge({
  children,
  document: doc,
  fontClass,
  onOpen,
}: {
  children: ReactNode;
  document?: Document;
  fontClass: string;
  onOpen(id: string): void;
}) {
  const open = useRef(onOpen);
  useEffect(() => {
    open.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    if (!doc) return;
    for (const name of fontClass.split(/\s+/).filter(Boolean))
      doc.documentElement.classList.add(name);
    const onClick = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest?.('[data-studio-open]');
      if (target) {
        event.preventDefault();
        open.current(target.getAttribute('data-studio-open') ?? '');
        return;
      }
      // Nothing in the preview should navigate the frame away.
      if ((event.target as Element | null)?.closest?.('a[href]')) event.preventDefault();
    };
    doc.addEventListener('click', onClick, true);
    return () => doc.removeEventListener('click', onClick, true);
  }, [doc, fontClass]);

  return <>{children}</>;
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16V4m0 0-5 5m5-5 5 5M5 20h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
