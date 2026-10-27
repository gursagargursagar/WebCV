import type { ComponentConfig, Config, CustomField, Field } from '@puckeditor/core';
import type { CSSProperties, ReactNode } from 'react';
import { fontPair, onAccent, safeAccent } from './design';
import { ContactForm } from './contact-form';
import type { StudioMeta } from './types';

/**
 * The blocks a Studio page is made of, and the frame around them.
 *
 * Deliberately free of hooks and of any import from the editor: the published
 * site renders these on the server with plain props, and the editor renders
 * the same functions inside Puck with its inline-editing props. Anything only
 * the editor needs reaches a block through `metadata.edit` and is absent when
 * the page is published.
 *
 * Text fields are `contentEditable`, so in the editor a block's words are
 * edited where they sit on the page. That turns those props into elements
 * while editing — so a prop that is also used as a string (an image's alt
 * text) is always a separate field.
 */

/* --------------------------------------------------------------- helpers */

type Puck = { metadata: Record<string, unknown>; isEditing: boolean };

function metaOf(puck: Puck | undefined): StudioMeta {
  return puck?.metadata as unknown as StudioMeta;
}

/** The text behind a prop that may be an inline-editing element. */
function textOf(node: unknown): string | null {
  if (typeof node === 'string') return node;
  if (node && typeof node === 'object' && 'props' in node) {
    const value = (node as { props?: { value?: unknown } }).props?.value;
    if (typeof value === 'string') return value;
    if (value == null) return '';
  }
  return null;
}

function isBlank(node: unknown): boolean {
  const text = textOf(node);
  return text !== null && text.trim() === '';
}

/** Links a visitor can follow; anything else (`javascript:` and friends) goes nowhere. */
export function safeHref(url: unknown): string {
  const value = String(url ?? '').trim();
  if (!value) return '#';
  if (value.startsWith('#')) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  if (/^[^\s@/]+@[^\s@/]+\.[a-z]{2,}$/i.test(value)) return `mailto:${value}`;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(value)) return `https://${value}`;
  return '#';
}

/** Images from an upload or an https address; nothing else is rendered. */
export function safeSrc(url: unknown): string | null {
  const value = String(url ?? '').trim();
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (/^https:\/\//i.test(value)) return value;
  return null;
}

/** A YouTube or Vimeo address as an embeddable player address, or null. */
export function videoEmbed(url: unknown): string | null {
  const value = String(url ?? '').trim();
  const yt =
    value.match(/youtu\.be\/([\w-]{6,})/) ??
    value.match(/youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = value.match(/vimeo\.com\/(?:video\/)?(\d{5,})/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

/** A link on the published site; in the editor, the same text without anywhere to go. */
function Anchor({
  href,
  children,
  ...rest
}: {
  href: string | null;
  children: ReactNode;
  className?: string;
  rel?: string;
  target?: string;
}) {
  if (href === null) return <span className={rest.className}>{children}</span>;
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

/** A heading, or the same text as a plain block inside a decorative preview. */
function H({
  level,
  puck,
  className,
  children,
}: {
  level: 1 | 2;
  puck: Puck | undefined;
  className?: string;
  children: ReactNode;
}) {
  if (metaOf(puck)?.decorative) {
    return <div className={`${className ?? ''} wcs-h${level}`.trim()}>{children}</div>;
  }
  const Tag = level === 1 ? 'h1' : 'h2';
  return <Tag className={className}>{children}</Tag>;
}

function Placeholder({ children }: { children: ReactNode }) {
  return <div className="wcs-placeholder">{children}</div>;
}

/* ---------------------------------------------------------------- fields */

/**
 * Field types the editor supplies. The published site renders without them,
 * so its bundle never contains the upload widget.
 */
export interface FieldKit {
  image: CustomField<string>['render'];
}

function imageField(kit: FieldKit | undefined, label: string): Field<string> {
  if (!kit) return { type: 'text', label };
  return { type: 'custom', label, render: kit.image };
}

const WIDTHS = [
  { label: 'Narrow', value: 'narrow' },
  { label: 'Normal', value: 'normal' },
  { label: 'Wide', value: 'wide' },
  { label: 'Full', value: 'full' },
];

const ALIGN = [
  { label: 'Left', value: 'left' },
  { label: 'Centre', value: 'center' },
];

/* ---------------------------------------------------------------- blocks */

type Align = 'left' | 'center';
type Width = 'narrow' | 'normal' | 'wide' | 'full';

export type HeroProps = { heading: string; text: string; align: Align; size: 's' | 'm' | 'l' };
export type HeadingProps = { text: string; size: 's' | 'm' | 'l'; align: Align };
export type TextProps = { text: string; size: 'body' | 'lead'; align: Align };
export type ImageProps = { src: string; alt: string; caption: string; width: Width };
export type PhotoGridProps = {
  images: { src: string; alt: string }[];
  columns: '2' | '3' | '4';
  gap: 'none' | 'small' | 'large';
};
export type SplitProps = {
  src: string;
  alt: string;
  heading: string;
  text: string;
  side: 'left' | 'right';
};
export type VideoProps = { url: string; caption: string };
export type ButtonProps = {
  label: string;
  href: string;
  variant: 'solid' | 'outline';
  align: Align;
};
export type QuoteProps = { quote: string; by: string };
export type ProjectsProps = {
  heading: string;
  columns: 'auto' | '1' | '2' | '3' | '4';
  shape: 'auto' | 'landscape' | 'square' | 'portrait';
  captions: 'auto' | 'below' | 'hover' | 'none';
};
export type ContactProps = {
  heading: string;
  text: string;
  email: string;
  form: 'yes' | 'no';
};
export type SocialProps = { links: { label: string; url: string }[]; align: Align };
export type SpacerProps = { size: 's' | 'm' | 'l' | 'xl' };
export type DividerProps = { style: 'line' | 'short' };

export type StudioComponents = {
  Hero: HeroProps;
  Heading: HeadingProps;
  Text: TextProps;
  Image: ImageProps;
  PhotoGrid: PhotoGridProps;
  Split: SplitProps;
  Video: VideoProps;
  Button: ButtonProps;
  Quote: QuoteProps;
  Projects: ProjectsProps;
  Contact: ContactProps;
  Social: SocialProps;
  Spacer: SpacerProps;
  Divider: DividerProps;
};

export type StudioBlock = keyof StudioComponents;

/** The Add panel's catalogue: plain names and one line on what each is for. */
export const BLOCK_INFO: { type: StudioBlock; name: string; hint: string; group: string }[] = [
  { type: 'Hero', name: 'Intro', hint: 'A big headline and a line about you', group: 'Text' },
  { type: 'Heading', name: 'Heading', hint: 'A section title', group: 'Text' },
  { type: 'Text', name: 'Text', hint: 'Paragraphs of writing', group: 'Text' },
  { type: 'Quote', name: 'Quote', hint: 'A testimonial or pull quote', group: 'Text' },
  { type: 'Button', name: 'Button', hint: 'A link people can tap', group: 'Text' },
  { type: 'Image', name: 'Image', hint: 'One picture, any width', group: 'Media' },
  { type: 'PhotoGrid', name: 'Photo grid', hint: 'Several pictures side by side', group: 'Media' },
  { type: 'Split', name: 'Image + text', hint: 'A picture beside some words', group: 'Media' },
  { type: 'Video', name: 'Video', hint: 'YouTube or Vimeo', group: 'Media' },
  {
    type: 'Projects',
    name: 'Project grid',
    hint: 'Cards linking to your projects',
    group: 'Portfolio',
  },
  { type: 'Contact', name: 'Contact', hint: 'Email and a message form', group: 'Portfolio' },
  {
    type: 'Social',
    name: 'Social links',
    hint: 'Instagram, LinkedIn, Behance…',
    group: 'Portfolio',
  },
  { type: 'Spacer', name: 'Space', hint: 'Breathing room', group: 'Layout' },
  { type: 'Divider', name: 'Divider', hint: 'A thin rule', group: 'Layout' },
];

function hero(): ComponentConfig<HeroProps> {
  return {
    label: 'Intro',
    fields: {
      heading: { type: 'textarea', label: 'Headline', contentEditable: true },
      text: { type: 'textarea', label: 'Text', contentEditable: true },
      size: {
        type: 'radio',
        label: 'Size',
        options: [
          { label: 'S', value: 's' },
          { label: 'M', value: 'm' },
          { label: 'L', value: 'l' },
        ],
      },
      align: { type: 'radio', label: 'Alignment', options: ALIGN },
    },
    defaultProps: {
      heading: 'Hello, I make things.',
      text: 'A sentence or two about who you are and the work you do.',
      size: 'l',
      align: 'left',
    },
    render: ({ heading, text, size, align, puck }) => (
      <section className={`wcs-block wcs-hero s-${size} a-${align}`}>
        <H level={1} puck={puck} className="wcs-hero-title">
          {heading}
        </H>
        {isBlank(text) && !metaOf(puck)?.edit ? null : <p className="wcs-hero-text">{text}</p>}
      </section>
    ),
  };
}

function heading(): ComponentConfig<HeadingProps> {
  return {
    label: 'Heading',
    fields: {
      text: { type: 'text', label: 'Heading', contentEditable: true },
      size: {
        type: 'radio',
        label: 'Size',
        options: [
          { label: 'S', value: 's' },
          { label: 'M', value: 'm' },
          { label: 'L', value: 'l' },
        ],
      },
      align: { type: 'radio', label: 'Alignment', options: ALIGN },
    },
    defaultProps: { text: 'A section title', size: 'm', align: 'left' },
    render: ({ text, size, align, puck }) => (
      <div className={`wcs-block wcs-heading s-${size} a-${align}`}>
        <H level={2} puck={puck}>
          {text}
        </H>
      </div>
    ),
  };
}

function text(): ComponentConfig<TextProps> {
  return {
    label: 'Text',
    fields: {
      text: { type: 'textarea', label: 'Text', contentEditable: true },
      size: {
        type: 'radio',
        label: 'Style',
        options: [
          { label: 'Body', value: 'body' },
          { label: 'Large', value: 'lead' },
        ],
      },
      align: { type: 'radio', label: 'Alignment', options: ALIGN },
    },
    defaultProps: {
      text: 'Write about the work: what it was for, what you did, and what came of it.',
      size: 'body',
      align: 'left',
    },
    render: ({ text, size, align }) => (
      <div className={`wcs-block wcs-text s-${size} a-${align}`}>
        <p>{text}</p>
      </div>
    ),
  };
}

function image(kit?: FieldKit): ComponentConfig<ImageProps> {
  return {
    label: 'Image',
    fields: {
      src: imageField(kit, 'Image'),
      alt: { type: 'text', label: 'Describe the image (for screen readers)' },
      caption: { type: 'text', label: 'Caption', contentEditable: true },
      width: { type: 'select', label: 'Width', options: WIDTHS },
    },
    defaultProps: { src: '', alt: '', caption: '', width: 'wide' },
    render: ({ id, src, alt, caption, width, puck }) => {
      const edit = metaOf(puck)?.edit;
      const url = safeSrc(src);
      return (
        <figure className={`wcs-block wcs-image w-${width}`}>
          <div className="wcs-media">
            {url ? (
              <img src={url} alt={alt} loading="lazy" />
            ) : (
              <Placeholder>Add an image</Placeholder>
            )}
            {edit ? <edit.ImageTools blockId={id} prop="src" /> : null}
          </div>
          {edit || !isBlank(caption) ? (
            <figcaption className="wcs-caption">{caption}</figcaption>
          ) : null}
        </figure>
      );
    },
  };
}

function photoGrid(kit?: FieldKit): ComponentConfig<PhotoGridProps> {
  return {
    label: 'Photo grid',
    fields: {
      images: {
        type: 'array',
        label: 'Photos',
        arrayFields: {
          src: imageField(kit, 'Image'),
          alt: { type: 'text', label: 'Describe the image' },
        },
        defaultItemProps: { src: '', alt: '' },
        getItemSummary: (item, index) => item.alt || `Photo ${(index ?? 0) + 1}`,
      },
      columns: {
        type: 'radio',
        label: 'Columns',
        options: [
          { label: '2', value: '2' },
          { label: '3', value: '3' },
          { label: '4', value: '4' },
        ],
      },
      gap: {
        type: 'radio',
        label: 'Spacing',
        options: [
          { label: 'None', value: 'none' },
          { label: 'Small', value: 'small' },
          { label: 'Large', value: 'large' },
        ],
      },
    },
    defaultProps: {
      images: [
        { src: '', alt: '' },
        { src: '', alt: '' },
        { src: '', alt: '' },
      ],
      columns: '3',
      gap: 'small',
    },
    render: ({ id, images, columns, gap, puck }) => {
      const edit = metaOf(puck)?.edit;
      return (
        <div className={`wcs-block wcs-photos c-${columns} g-${gap}`}>
          {(images ?? []).map((photo, index) => {
            const url = safeSrc(photo.src);
            return (
              <div className="wcs-media" key={index}>
                {url ? (
                  <img src={url} alt={photo.alt} loading="lazy" />
                ) : (
                  <Placeholder>Photo {index + 1}</Placeholder>
                )}
                {edit ? (
                  <edit.ImageTools blockId={id} prop={`images[${index}].src`} label="Replace" />
                ) : null}
              </div>
            );
          })}
        </div>
      );
    },
  };
}

function split(kit?: FieldKit): ComponentConfig<SplitProps> {
  return {
    label: 'Image + text',
    fields: {
      src: imageField(kit, 'Image'),
      alt: { type: 'text', label: 'Describe the image' },
      heading: { type: 'text', label: 'Heading', contentEditable: true },
      text: { type: 'textarea', label: 'Text', contentEditable: true },
      side: {
        type: 'radio',
        label: 'Image side',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Right', value: 'right' },
        ],
      },
    },
    defaultProps: {
      src: '',
      alt: '',
      heading: 'About me',
      text: 'Where you are, what you do, who you have done it for.',
      side: 'left',
    },
    render: ({ id, src, alt, heading, text, side, puck }) => {
      const edit = metaOf(puck)?.edit;
      const url = safeSrc(src);
      return (
        <section className={`wcs-block wcs-split side-${side}`}>
          <div className="wcs-media">
            {url ? (
              <img src={url} alt={alt} loading="lazy" />
            ) : (
              <Placeholder>Add an image</Placeholder>
            )}
            {edit ? <edit.ImageTools blockId={id} prop="src" /> : null}
          </div>
          <div className="wcs-split-body">
            <H level={2} puck={puck}>
              {heading}
            </H>
            <p>{text}</p>
          </div>
        </section>
      );
    },
  };
}

function video(): ComponentConfig<VideoProps> {
  return {
    label: 'Video',
    fields: {
      url: { type: 'text', label: 'YouTube or Vimeo link' },
      caption: { type: 'text', label: 'Caption', contentEditable: true },
    },
    defaultProps: { url: '', caption: '' },
    render: ({ url, caption, puck }) => {
      const embed = videoEmbed(url);
      const edit = metaOf(puck)?.edit;
      return (
        <figure className="wcs-block wcs-video">
          <div className="wcs-media ratio-16x9">
            {embed ? (
              <iframe
                src={embed}
                title={textOf(caption) || 'Video'}
                loading="lazy"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                style={edit ? { pointerEvents: 'none' } : undefined}
              />
            ) : (
              <Placeholder>Paste a YouTube or Vimeo link in the panel on the right</Placeholder>
            )}
          </div>
          {edit || !isBlank(caption) ? (
            <figcaption className="wcs-caption">{caption}</figcaption>
          ) : null}
        </figure>
      );
    },
  };
}

function button(): ComponentConfig<ButtonProps> {
  return {
    label: 'Button',
    fields: {
      label: { type: 'text', label: 'Label', contentEditable: true },
      href: { type: 'text', label: 'Link (a web address, an email, or /a-page)' },
      variant: {
        type: 'radio',
        label: 'Style',
        options: [
          { label: 'Solid', value: 'solid' },
          { label: 'Outline', value: 'outline' },
        ],
      },
      align: { type: 'radio', label: 'Alignment', options: ALIGN },
    },
    defaultProps: { label: 'Get in touch', href: '', variant: 'solid', align: 'left' },
    render: ({ label, href, variant, align, puck }) => {
      const meta = metaOf(puck);
      let target = safeHref(href);
      // A link to one of the site's own pages, written as `/about`.
      if (target.startsWith('/') && meta && !meta.edit) {
        const page = meta.pages.find((p) => `/${p.slug}` === target);
        if (page) target = meta.hrefFor(page.slug);
      }
      return (
        <div className={`wcs-block wcs-button a-${align}`}>
          {meta?.edit ? (
            <span className={`wcs-btn ${variant}`}>{label}</span>
          ) : (
            <a className={`wcs-btn ${variant}`} href={target}>
              {label}
            </a>
          )}
        </div>
      );
    },
  };
}

function quote(): ComponentConfig<QuoteProps> {
  return {
    label: 'Quote',
    fields: {
      quote: { type: 'textarea', label: 'Quote', contentEditable: true },
      by: { type: 'text', label: 'Who said it', contentEditable: true },
    },
    defaultProps: {
      quote: 'Working together was a joy. The result spoke for itself.',
      by: 'A happy client',
    },
    render: ({ quote, by, puck }) => (
      <figure className="wcs-block wcs-quote">
        <blockquote>{quote}</blockquote>
        {isBlank(by) && !metaOf(puck)?.edit ? null : <figcaption>{by}</figcaption>}
      </figure>
    ),
  };
}

function projects(): ComponentConfig<ProjectsProps> {
  return {
    label: 'Project grid',
    fields: {
      heading: { type: 'text', label: 'Heading (optional)', contentEditable: true },
      columns: {
        type: 'select',
        label: 'Columns',
        options: [
          { label: 'Template default', value: 'auto' },
          { label: '1', value: '1' },
          { label: '2', value: '2' },
          { label: '3', value: '3' },
          { label: '4', value: '4' },
        ],
      },
      shape: {
        type: 'select',
        label: 'Cover shape',
        options: [
          { label: 'Template default', value: 'auto' },
          { label: 'Landscape', value: 'landscape' },
          { label: 'Square', value: 'square' },
          { label: 'Portrait', value: 'portrait' },
        ],
      },
      captions: {
        type: 'select',
        label: 'Titles',
        options: [
          { label: 'Template default', value: 'auto' },
          { label: 'Below the cover', value: 'below' },
          { label: 'On hover', value: 'hover' },
          { label: 'Hidden', value: 'none' },
        ],
      },
    },
    defaultProps: { heading: '', columns: 'auto', shape: 'auto', captions: 'auto' },
    render: ({ heading, columns, shape, captions, puck }) => {
      const meta = metaOf(puck);
      const edit = meta?.edit;
      const list = (meta?.pages ?? []).filter((p) => p.kind === 'project');
      return (
        <section
          className={`wcs-block wcs-projects cols-${columns} shape-${shape} cap-${captions}`}
        >
          {edit || !isBlank(heading) ? (
            <H level={2} puck={puck} className="wcs-projects-title">
              {heading}
            </H>
          ) : null}
          {list.length === 0 ? (
            <Placeholder>
              No projects yet. Add one from the Pages panel and it appears here.
            </Placeholder>
          ) : (
            <ul className="wcs-grid">
              {list.map((project) => {
                const cover = safeSrc(project.cover);
                return (
                  <li key={project.id} className="wcs-card">
                    <Anchor
                      href={edit ? null : meta.hrefFor(project.slug)}
                      className="wcs-card-link"
                    >
                      <span className="wcs-card-cover">
                        {cover ? (
                          <img src={cover} alt="" loading="lazy" />
                        ) : (
                          <span className="wcs-card-empty">{project.title}</span>
                        )}
                      </span>
                      <span className="wcs-card-text">
                        <span className="wcs-card-title">{project.title}</span>
                        {project.subtitle ? (
                          <span className="wcs-card-sub">{project.subtitle}</span>
                        ) : null}
                      </span>
                    </Anchor>
                    {edit ? <edit.OpenButton pageId={project.id} label="Edit project" /> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      );
    },
  };
}

function contact(): ComponentConfig<ContactProps> {
  return {
    label: 'Contact',
    fields: {
      heading: { type: 'text', label: 'Heading', contentEditable: true },
      text: { type: 'textarea', label: 'Text', contentEditable: true },
      email: { type: 'text', label: 'Email address shown on the page (optional)' },
      form: {
        type: 'radio',
        label: 'Message form',
        options: [
          { label: 'Show', value: 'yes' },
          { label: 'Hide', value: 'no' },
        ],
      },
    },
    defaultProps: {
      heading: 'Let’s work together',
      text: 'Tell me a little about your project and I will get back to you.',
      email: '',
      form: 'yes',
    },
    render: ({ heading, text, email, form, puck }) => {
      const meta = metaOf(puck);
      const address = String(email ?? '').trim();
      const mail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? address : '';
      return (
        <section className="wcs-block wcs-contact">
          <H level={2} puck={puck}>
            {heading}
          </H>
          {isBlank(text) && !meta?.edit ? null : <p>{text}</p>}
          {mail ? (
            <p className="wcs-contact-mail">
              <Anchor href={meta?.edit ? null : `mailto:${mail}`}>{mail}</Anchor>
            </p>
          ) : null}
          {form === 'yes' ? (
            <ContactForm endpoint={meta?.edit ? null : (meta?.contactEndpoint ?? null)} />
          ) : null}
        </section>
      );
    },
  };
}

function social(): ComponentConfig<SocialProps> {
  return {
    label: 'Social links',
    fields: {
      links: {
        type: 'array',
        label: 'Links',
        arrayFields: {
          label: { type: 'text', label: 'Name' },
          url: { type: 'text', label: 'Address' },
        },
        defaultItemProps: { label: 'Instagram', url: '' },
        getItemSummary: (item) => item.label || 'Link',
      },
      align: { type: 'radio', label: 'Alignment', options: ALIGN },
    },
    defaultProps: {
      links: [
        { label: 'Instagram', url: '' },
        { label: 'LinkedIn', url: '' },
        { label: 'Behance', url: '' },
      ],
      align: 'left',
    },
    render: ({ links, align, puck }) => {
      const edit = metaOf(puck)?.edit;
      return (
        <ul className={`wcs-block wcs-social a-${align}`}>
          {(links ?? []).map((link, index) => (
            <li key={index}>
              <Anchor href={edit ? null : safeHref(link.url)} rel="me noopener" target="_blank">
                {link.label}
              </Anchor>
            </li>
          ))}
        </ul>
      );
    },
  };
}

function spacer(): ComponentConfig<SpacerProps> {
  return {
    label: 'Space',
    fields: {
      size: {
        type: 'radio',
        label: 'Height',
        options: [
          { label: 'S', value: 's' },
          { label: 'M', value: 'm' },
          { label: 'L', value: 'l' },
          { label: 'XL', value: 'xl' },
        ],
      },
    },
    defaultProps: { size: 'm' },
    render: ({ size }) => <div className={`wcs-spacer s-${size}`} aria-hidden="true" />,
  };
}

function divider(): ComponentConfig<DividerProps> {
  return {
    label: 'Divider',
    fields: {
      style: {
        type: 'radio',
        label: 'Style',
        options: [
          { label: 'Full', value: 'line' },
          { label: 'Short', value: 'short' },
        ],
      },
    },
    defaultProps: { style: 'line' },
    render: ({ style }) => <hr className={`wcs-block wcs-divider ${style}`} />,
  };
}

/* ----------------------------------------------------------------- frame */

function SiteFrame({ children, puck }: { children: ReactNode; puck: Puck }) {
  const meta = metaOf(puck);
  if (!meta) return <>{children}</>;
  const { design, pages, pageId, edit } = meta;
  const fonts = fontPair(design.fonts);
  const accent = safeAccent(design.accent);
  const page = pages.find((p) => p.id === pageId);
  const nav = pages.filter((p) => p.inNav && p.slug !== '');
  const home = pages.find((p) => p.slug === '');

  const style = {
    '--accent': accent,
    '--on-accent': onAccent(accent),
    '--f-head': fonts.head,
    '--f-body': fonts.body,
  } as CSSProperties;

  const link = (target: { id: string; slug: string }) =>
    edit ? { href: '#', 'data-studio-open': target.id } : { href: meta.hrefFor(target.slug) };

  return (
    <div
      className={`wcs t-${design.template} m-${design.mode}${edit ? ' wcs-edit' : ''}`}
      style={style}
    >
      <header className="wcs-header">
        <div className="wcs-brand-wrap">
          {edit ? (
            <div className="wcs-brand">
              <edit.Text
                value={design.siteName}
                placeholder="Your name"
                label="Site name"
                onCommit={(siteName) => edit.setDesign({ siteName })}
              />
            </div>
          ) : (
            <a className="wcs-brand" {...(home ? link(home) : { href: meta.hrefFor('') })}>
              {design.siteName}
            </a>
          )}
          {edit ? (
            <div className="wcs-tagline">
              <edit.Text
                value={design.tagline}
                placeholder="Add a tagline"
                label="Tagline"
                onCommit={(tagline) => edit.setDesign({ tagline })}
              />
            </div>
          ) : design.tagline ? (
            <p className="wcs-tagline">{design.tagline}</p>
          ) : null}
        </div>
        {nav.length > 0 ? (
          <nav className="wcs-nav" aria-label="Main">
            <ul>
              {nav.map((p) => (
                <li key={p.id}>
                  <a {...link(p)} aria-current={p.id === pageId ? 'page' : undefined}>
                    {p.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <main className="wcs-main" id="main">
        {/* Every page has one top-level heading for screen readers and search;
            a page with no Intro block and no project title gets its name. */}
        {page && page.kind !== 'project' && !meta.hasHeading && !meta.decorative ? (
          <h1 className="wcs-visually-hidden">
            {page.slug === '' ? design.siteName : `${page.title} — ${design.siteName}`}
          </h1>
        ) : null}
        {page?.kind === 'project' ? (
          <header className="wcs-project-head">
            {edit ? (
              <>
                <h1 className="wcs-project-title">
                  <edit.Text
                    value={page.title}
                    placeholder="Project title"
                    label="Project title"
                    onCommit={(title) => edit.updatePage(page.id, { title })}
                  />
                </h1>
                <p className="wcs-project-sub">
                  <edit.Text
                    value={page.subtitle ?? ''}
                    placeholder="Add a short description"
                    label="Project description"
                    onCommit={(subtitle) => edit.updatePage(page.id, { subtitle })}
                  />
                </p>
                <p className="wcs-project-year">
                  <edit.Text
                    value={page.year ?? ''}
                    placeholder="Year"
                    label="Year"
                    onCommit={(year) => edit.updatePage(page.id, { year })}
                  />
                </p>
                <edit.CoverTools pageId={page.id} />
              </>
            ) : (
              <>
                <H level={1} puck={puck} className="wcs-project-title">
                  {page.title}
                </H>
                {page.subtitle ? <p className="wcs-project-sub">{page.subtitle}</p> : null}
                {page.year ? <p className="wcs-project-year">{page.year}</p> : null}
              </>
            )}
          </header>
        ) : null}
        {children}
      </main>

      <footer className="wcs-footer">
        <span>
          © {new Date().getFullYear()} {design.siteName}
        </span>
        <a href="https://www.webcv.au" className="wcs-made">
          Made with WebCV
        </a>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------- config */

export function studioConfig(kit?: FieldKit): Config<StudioComponents> {
  return {
    root: {
      // No page-level fields: the page's name, address and cover live in the
      // Pages panel, where people look for them.
      fields: {},
      render: ({ children, puck }) => <SiteFrame puck={puck}>{children}</SiteFrame>,
    },
    components: {
      Hero: hero(),
      Heading: heading(),
      Text: text(),
      Image: image(kit),
      PhotoGrid: photoGrid(kit),
      Split: split(kit),
      Video: video(),
      Button: button(),
      Quote: quote(),
      Projects: projects(),
      Contact: contact(),
      Social: social(),
      Spacer: spacer(),
      Divider: divider(),
    },
  };
}
