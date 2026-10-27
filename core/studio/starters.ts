import type { Data } from '@puckeditor/core';
import { newId, templateInfo } from './design';
import type { StudioComponents, StudioBlock } from './blocks';
import type { StudioPage, StudioSite, TemplateId } from './types';

/**
 * Ready-to-edit starting sites, one per template.
 *
 * Each is a believable portfolio — a home page with a project grid, a few
 * projects, About and Contact — so a new owner edits something that already
 * looks finished instead of facing an empty canvas. The pictures are
 * placeholders from picsum.photos, chosen to be replaced.
 */

type Block = { [K in StudioBlock]: { type: K; props: Partial<StudioComponents[K]> } }[StudioBlock];

function page(blocks: Block[]): Data {
  return {
    root: { props: {} },
    content: blocks.map((block) => ({
      type: block.type,
      props: { ...block.props, id: `${block.type}-${newId('b').slice(2)}` },
    })),
  };
}

const photo = (seed: string, w = 1600, h = 1100) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

interface Copy {
  role: string;
  intro: string;
  tagline: string;
  projects: { title: string; subtitle: string; year: string; seed: string }[];
  about: string;
  clients: string;
  quote: [string, string];
}

const COPY: Record<TemplateId, Copy> = {
  atelier: {
    role: 'Brand & graphic designer',
    tagline: 'Brand & graphic design',
    intro: 'I design identities, packaging and books for people who care how things look.',
    projects: [
      {
        title: 'Field Notes Coffee',
        subtitle: 'Identity and packaging',
        year: '2026',
        seed: 'wc-coffee',
      },
      {
        title: 'North Shore Festival',
        subtitle: 'Campaign and signage',
        year: '2025',
        seed: 'wc-festival',
      },
      { title: 'Paper Botanics', subtitle: 'Book design', year: '2025', seed: 'wc-botanic' },
      { title: 'Studio Lamp', subtitle: 'Product launch', year: '2024', seed: 'wc-lamp' },
      { title: 'Harbour Ceramics', subtitle: 'Identity', year: '2024', seed: 'wc-ceramic' },
      { title: 'Type Specimen', subtitle: 'Personal project', year: '2023', seed: 'wc-type' },
    ],
    about:
      'I am an independent designer based in Melbourne. For ten years I have helped cafés, festivals, publishers and makers find a look that feels like them.\n\nI work closely with a small group of clients at a time, from first sketch to the last print run.',
    clients:
      'Field Notes Coffee · North Shore Festival · Penguin Random House · Aesop · The Wheeler Centre',
    quote: ['The new identity paid for itself within a season.', 'Maya Chen, Field Notes Coffee'],
  },
  gallery: {
    role: 'Photographer',
    tagline: 'Photography',
    intro: 'Landscapes, people and the light in between.',
    projects: [
      { title: 'Salt Lakes', subtitle: 'South Australia', year: '2026', seed: 'wc-salt' },
      { title: 'Night Market', subtitle: 'Street series', year: '2025', seed: 'wc-market' },
      { title: 'High Country', subtitle: 'Victoria', year: '2025', seed: 'wc-mountain' },
      { title: 'Portraits', subtitle: 'Ongoing', year: '2024', seed: 'wc-portrait' },
      { title: 'Coastline', subtitle: 'Tasmania', year: '2024', seed: 'wc-coast' },
      { title: 'Concrete', subtitle: 'Architecture', year: '2023', seed: 'wc-concrete' },
    ],
    about:
      'I photograph places and the people who live in them. My work has appeared in editorial, tourism and architecture publications across Australia.\n\nAvailable for commissions and licensing.',
    clients: 'The Guardian · Tourism Australia · Monocle · Broadsheet',
    quote: ['Every frame feels like a held breath.', 'Photo editor, Monocle'],
  },
  journal: {
    role: 'Illustrator & writer',
    tagline: 'Illustration & words',
    intro: 'I draw and write stories for books, magazines and the occasional wall.',
    projects: [
      { title: 'The Long Walk Home', subtitle: 'Picture book', year: '2026', seed: 'wc-book' },
      { title: 'Garden Almanac', subtitle: 'Editorial series', year: '2025', seed: 'wc-garden' },
      { title: 'City of Birds', subtitle: 'Mural', year: '2025', seed: 'wc-birds' },
      { title: 'Small Hours', subtitle: 'Zine', year: '2024', seed: 'wc-zine' },
    ],
    about:
      'I make pictures and the words that go with them. My books have been translated into six languages, and my drawings appear monthly in The Saturday Paper.\n\nI live by the sea with a dog who does not understand deadlines.',
    clients: 'Allen & Unwin · The Saturday Paper · State Library Victoria · Frankie',
    quote: ['Warm, funny and quietly devastating.', 'Books+Publishing'],
  },
  bold: {
    role: 'Creative director',
    tagline: 'Creative direction',
    intro: 'Ideas loud enough to be noticed.',
    projects: [
      { title: 'Run Club', subtitle: 'Brand campaign', year: '2026', seed: 'wc-run' },
      { title: 'Neon Nights', subtitle: 'Music festival', year: '2025', seed: 'wc-neon' },
      { title: 'Good Oats', subtitle: 'Launch', year: '2025', seed: 'wc-oats' },
      { title: 'Signal', subtitle: 'Rebrand', year: '2024', seed: 'wc-signal' },
    ],
    about:
      'I lead campaigns from the first idea to the last frame. Twelve years in agencies, now working directly with brands that want to be remembered.',
    clients: 'Nike · Spotify · Oatly · Telstra · Splendour in the Grass',
    quote: ['The campaign of the year, and it was not close.', 'Campaign Brief'],
  },
  grid: {
    role: 'Architect',
    tagline: 'Architecture & interiors',
    intro: 'Small buildings and quiet interiors, made to be lived in for a long time.',
    projects: [
      { title: 'House on a Hill', subtitle: 'Residential', year: '2026', seed: 'wc-house' },
      { title: 'Corner Store', subtitle: 'Retail', year: '2025', seed: 'wc-store' },
      { title: 'Studio Shed', subtitle: 'Workplace', year: '2025', seed: 'wc-shed' },
      { title: 'Courtyard', subtitle: 'Landscape', year: '2024', seed: 'wc-courtyard' },
      { title: 'Library Nook', subtitle: 'Interior', year: '2024', seed: 'wc-library' },
      { title: 'Timber Stair', subtitle: 'Detail', year: '2023', seed: 'wc-stair' },
      { title: 'Beach House', subtitle: 'Residential', year: '2023', seed: 'wc-beach' },
      { title: 'Gallery Fitout', subtitle: 'Interior', year: '2022', seed: 'wc-gallery' },
    ],
    about:
      'A small practice working on homes, shops and workplaces. We favour honest materials, natural light and buildings that age well.',
    clients: 'Private clients · City of Yarra · Aesop · Monash University',
    quote: ['They listened more than they talked, and it shows in every room.', 'A homeowner'],
  },
  swiss: {
    role: 'Product designer',
    tagline: 'Product design & engineering',
    intro: 'I design and build software that people trust with important work.',
    projects: [
      { title: 'Ledger', subtitle: 'Finance dashboard', year: '2026', seed: 'wc-ledger' },
      { title: 'Atlas', subtitle: 'Design system', year: '2025', seed: 'wc-atlas' },
      { title: 'Relay', subtitle: 'Messaging app', year: '2025', seed: 'wc-relay' },
      { title: 'Index', subtitle: 'Search tool', year: '2024', seed: 'wc-index' },
      { title: 'Orbit', subtitle: 'Analytics', year: '2024', seed: 'wc-orbit' },
      { title: 'Signal', subtitle: 'Incident response', year: '2023', seed: 'wc-signal2' },
    ],
    about:
      'Ten years designing and shipping software, from early-stage start-ups to regulated enterprises. I care about clarity, accessibility and the details people never notice when they are right.',
    clients: 'Atlassian · Canva · Commonwealth Bank · Swiss Cheese AI',
    quote: ['The clearest product thinking I have worked with.', 'Head of Product'],
  },
};

function projectBody(seed: string, subtitle: string): Data {
  return page([
    {
      type: 'Text',
      props: {
        text: `The brief, in a sentence or two. What was ${subtitle.toLowerCase()} for, who was it for, and what had to change?`,
        size: 'lead',
        align: 'left',
      },
    },
    {
      type: 'Image',
      props: { src: photo(`${seed}-1`, 2000, 1250), alt: '', caption: '', width: 'wide' },
    },
    {
      type: 'Text',
      props: {
        text: 'Then the work: the idea, the decisions that shaped it, and one detail you are proud of.\n\nFinish with the result — a number, a quote or simply what happened next.',
        size: 'body',
        align: 'left',
      },
    },
    {
      type: 'PhotoGrid',
      props: {
        images: [
          { src: photo(`${seed}-2`, 1000, 1000), alt: '' },
          { src: photo(`${seed}-3`, 1000, 1000), alt: '' },
          { src: photo(`${seed}-4`, 1000, 1000), alt: '' },
        ],
        columns: '3',
        gap: 'small',
      },
    },
    {
      type: 'Image',
      props: { src: photo(`${seed}-5`, 2000, 1250), alt: '', caption: '', width: 'full' },
    },
  ]);
}

export function starterSite(template: TemplateId, name: string): StudioSite {
  const copy = COPY[template];
  const info = templateInfo(template);
  const centred = template === 'atelier';
  const siteName = name.trim() || 'Your Name';

  const projects: StudioPage[] = copy.projects.map((p) => ({
    id: newId('pg'),
    kind: 'project',
    title: p.title,
    slug: p.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    inNav: false,
    subtitle: p.subtitle,
    year: p.year,
    cover: photo(p.seed, 1200, 900),
    data: projectBody(p.seed, p.subtitle),
  }));

  const home: StudioPage = {
    id: newId('pg'),
    kind: 'page',
    title: 'Work',
    slug: '',
    inNav: true,
    data: page([
      {
        type: 'Hero',
        props: { heading: copy.intro, text: '', size: 'm', align: centred ? 'center' : 'left' },
      },
      {
        type: 'Projects',
        props: { heading: '', columns: 'auto', shape: 'auto', captions: 'auto' },
      },
    ]),
  };

  const about: StudioPage = {
    id: newId('pg'),
    kind: 'page',
    title: 'About',
    slug: 'about',
    inNav: true,
    data: page([
      {
        type: 'Split',
        props: {
          src: photo(`${template}-portrait`, 1000, 1250),
          alt: `Portrait of ${siteName}`,
          heading: `Hi, I’m ${siteName.split(' ')[0]}.`,
          text: copy.about,
          side: 'left',
        },
      },
      { type: 'Spacer', props: { size: 'm' } },
      { type: 'Heading', props: { text: 'Selected clients', size: 's', align: 'left' } },
      { type: 'Text', props: { text: copy.clients, size: 'body', align: 'left' } },
      { type: 'Quote', props: { quote: copy.quote[0], by: copy.quote[1] } },
      {
        type: 'Button',
        props: { label: 'Get in touch', href: '/contact', variant: 'solid', align: 'left' },
      },
    ]),
  };

  const contact: StudioPage = {
    id: newId('pg'),
    kind: 'page',
    title: 'Contact',
    slug: 'contact',
    inNav: true,
    data: page([
      {
        type: 'Contact',
        props: {
          heading: 'Let’s work together',
          text: 'Tell me about your project, your timeline and your budget, and I will reply within two working days.',
          email: '',
          form: 'yes',
        },
      },
      {
        type: 'Social',
        props: {
          links: [
            { label: 'Instagram', url: '' },
            { label: 'LinkedIn', url: '' },
          ],
          align: template === 'grid' || template === 'swiss' ? 'left' : 'center',
        },
      },
    ]),
  };

  return {
    version: 1,
    design: {
      template,
      ...info.defaults,
      siteName,
      tagline: copy.tagline,
    },
    pages: [home, ...projects, about, contact],
  };
}

/** A page added from the Pages panel: a heading and a paragraph to replace. */
export function blankPage(kind: 'page' | 'project'): Data {
  if (kind === 'project') {
    return page([
      {
        type: 'Text',
        props: { text: 'Tell the story of this project.', size: 'lead', align: 'left' },
      },
      { type: 'Image', props: { src: '', alt: '', caption: '', width: 'wide' } },
    ]);
  }
  return page([
    { type: 'Heading', props: { text: 'New page', size: 'l', align: 'left' } },
    { type: 'Text', props: { text: 'Start writing here.', size: 'body', align: 'left' } },
  ]);
}

function projectSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const STARTER_SLUGS = new Set(
  Object.values(COPY).flatMap((copy) => copy.projects.map((p) => projectSlug(p.title)))
);

/**
 * Whether a site still carries a starter's sample projects — published before
 * its owner replaced them. Search engines see the same sample pages on every
 * such site, so these stay out of the sitemap and are marked noindex until
 * they are edited.
 */
export function looksLikeStarter(pageSlugs: string[]): boolean {
  return pageSlugs.filter((slug) => STARTER_SLUGS.has(slug)).length >= 3;
}
