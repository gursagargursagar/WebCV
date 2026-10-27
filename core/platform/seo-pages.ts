import type { TemplateId } from '@/core/studio/types';

/**
 * WebCV's own landing pages beyond the front page: the template gallery and
 * one page per kind of person a portfolio is for.
 *
 * Each audience page is written for that audience — what they need to show,
 * which template suits them, what they ask — rather than one page with the
 * job title swapped in. Search engines treat the swapped kind as doorway
 * pages, and people bounce off them.
 */

export interface AudiencePage {
  slug: string;
  /** The `<title>`: the phrase people search, then the brand. */
  title: string;
  description: string;
  h1: string;
  lede: string;
  points: { title: string; body: string }[];
  template: TemplateId;
  templateWhy: string;
  faq: { q: string; a: string }[];
}

export const AUDIENCES: AudiencePage[] = [
  {
    slug: 'designers',
    title: 'Free Design Portfolio Website | WebCV',
    description:
      'Make a free design portfolio website for graphic, brand, UX and product designers. Six templates, edit on the page, live at webcv.au/you.',
    h1: 'A design portfolio that looks designed.',
    lede: 'Graphic, brand, UX and product designers: show the work big, tell the story behind it, and send one short link with every application.',
    points: [
      {
        title: 'Case studies, not just thumbnails',
        body: 'Each project gets its own page: the brief, your process, the outcome. Hiring managers read the story, not only the pictures.',
      },
      {
        title: 'Layouts you would not be embarrassed by',
        body: 'Six templates with real typography and spacing. Change colours and fonts to match your own brand in a click.',
      },
      {
        title: 'Edit the page itself',
        body: 'Click a headline and type. Drag a photo grid into place. What you see is exactly what a recruiter sees.',
      },
    ],
    template: 'atelier',
    templateWhy:
      'Atelier centres your name and puts project titles under each cover — calm and easy to scan.',
    faq: [
      {
        q: 'Can I show UX case studies, not just visuals?',
        a: 'Yes. Mix text, images, photo grids, quotes and video on each project page to walk through research, decisions and results.',
      },
      {
        q: 'Is it really free?',
        a: 'Yes. Building and publishing your portfolio at webcv.au/your-name costs $0.',
      },
    ],
  },
  {
    slug: 'photographers',
    title: 'Free Photography Portfolio Website | WebCV',
    description:
      'Create a free photography portfolio website with full-width galleries and a dark theme that lets photos shine. Live at webcv.au/you.',
    h1: 'A photography portfolio where the pictures come first.',
    lede: 'Full-width images, tight photo grids and a dark gallery layout, so your work fills the screen and the website stays out of the way.',
    points: [
      {
        title: 'Built around images',
        body: 'Full-bleed images, two-to-four column photo grids and covers that crop cleanly on phones and big screens.',
      },
      {
        title: 'Series and stories',
        body: 'Give each series its own page with a short note on place, light and process — or let the photos speak alone.',
      },
      {
        title: 'Clients can reach you',
        body: 'A contact form sends enquiries to your WebCV inbox, so a commission never sits in a spam folder.',
      },
    ],
    template: 'gallery',
    templateWhy:
      'Gallery is dark, with a side menu and edge-to-edge images; titles appear only when someone hovers.',
    faq: [
      {
        q: 'Can I upload high-resolution photos?',
        a: 'Yes. Upload images up to 20 MB each; they are shown at full width on large screens.',
      },
      {
        q: 'Does it work on phones?',
        a: 'Every template adapts to phone screens, and you can preview phone, tablet and desktop while you edit.',
      },
    ],
  },
  {
    slug: 'architects',
    title: 'Free Architecture Portfolio Website | WebCV',
    description:
      'A free architecture and interior design portfolio website: square project grids, drawings and photography, live at webcv.au/you.',
    h1: 'An architecture portfolio with room to breathe.',
    lede: 'For architects, interior designers and students: projects in a quiet grid, drawings beside photography, and words only where they help.',
    points: [
      {
        title: 'Drawings and photographs together',
        body: 'Plans, sections and renders sit beside site photography in photo grids, with captions where they matter.',
      },
      {
        title: 'A practice, or a student folio',
        body: 'Show built work for clients, or studio projects for graduate applications — the same layouts suit both.',
      },
      {
        title: 'Your own address',
        body: 'One link, webcv.au/your-name, for applications, awards submissions and your email signature.',
      },
    ],
    template: 'grid',
    templateWhy:
      'Grid shows projects as tight squares with titles on hover — minimal, like a well-kept drawing set.',
    faq: [
      {
        q: 'Can I add PDFs of drawings?',
        a: 'Upload drawings as images (PNG or JPG) so they display on the page; link to a PDF with a Button block if you need the full set.',
      },
      {
        q: 'Can I change the template later?',
        a: 'Yes. Switch templates at any time and every word and picture comes with you.',
      },
    ],
  },
  {
    slug: 'engineers',
    title: 'Free Engineering Portfolio Website | WebCV',
    description:
      'A free engineering portfolio website for mechanical, civil, electrical and software engineers. Show projects, results and experience at webcv.au/you.',
    h1: 'An engineering portfolio that shows how you think.',
    lede: 'Mechanical, civil, electrical and software engineers: show the problem, the design decisions and the measured result — the things a CV has no room for.',
    points: [
      {
        title: 'Projects with numbers',
        body: 'Lead each project with the outcome — weight saved, cost cut, tolerance held — then show the CAD, tests and photos behind it.',
      },
      {
        title: 'Clean and credible',
        body: 'Restrained layouts with clear headings, so the work reads as rigorous rather than decorated.',
      },
      {
        title: 'One link for every application',
        body: 'Put webcv.au/your-name on your résumé, LinkedIn and graduate applications.',
      },
    ],
    template: 'swiss',
    templateWhy:
      'Swiss is black and white with ruled lines and mono labels — precise, like a good drawing title block.',
    faq: [
      {
        q: 'Is a portfolio worth it for engineers?',
        a: 'For graduate and design roles especially: it lets an interviewer see real work before the interview, which a one-page résumé cannot.',
      },
      {
        q: 'Can I see an example?',
        a: 'Yes — webcv.au/example is a sample product design engineer’s portfolio (a fictional person) built on WebCV.',
      },
    ],
  },
  {
    slug: 'graduates',
    title: 'Free Graduate & Student Portfolio Website | WebCV',
    description:
      'Make a free student or graduate portfolio website in minutes. Show uni projects, internships and skills at webcv.au/you — no code, $0.',
    h1: 'A graduate portfolio, ready before your next application.',
    lede: 'Turn uni projects, internships and side work into a portfolio employers can open from your résumé — in an afternoon, for $0.',
    points: [
      {
        title: 'Start from a finished site',
        body: 'Every template comes filled in. Replace the sample words and pictures with yours; nothing starts blank.',
      },
      {
        title: 'Projects count as experience',
        body: 'Capstones, studio work and hackathons each get a page that shows what you did and what you learned.',
      },
      {
        title: 'Private until you publish',
        body: 'Your changes save as you go and stay private until you press Publish.',
      },
    ],
    template: 'bold',
    templateWhy:
      'Bold puts your name and a big headline first — memorable in a stack of applications.',
    faq: [
      {
        q: 'Do I need to know how to code?',
        a: 'No. You click on the page and type, and add blocks from a panel. If you can write an email, you can build it.',
      },
      {
        q: 'What should I put in a graduate portfolio?',
        a: 'Three to six of your strongest projects, a short About with your study and interests, and a way to contact you.',
      },
    ],
  },
  {
    slug: 'writers',
    title: 'Free Writing & Illustration Portfolio Website | WebCV',
    description:
      'A free portfolio website for writers and illustrators: a warm serif layout for clips, books and commissions, live at webcv.au/you.',
    h1: 'A portfolio for writers and illustrators.',
    lede: 'Clips, books, commissions and drawings, in a warm editorial layout that reads like a well-set page.',
    points: [
      {
        title: 'Words look like words',
        body: 'Serif typography and generous line spacing, so excerpts and essays are a pleasure to read.',
      },
      {
        title: 'Books, clips and drawings',
        body: 'A page per book or series, with covers, spreads and quotes from editors and readers.',
      },
      {
        title: 'Commissions come to you',
        body: 'A contact form on every site, and enquiries collected in one place.',
      },
    ],
    template: 'journal',
    templateWhy:
      'Journal uses warm paper tones and a serif voice — made for words and illustration.',
    faq: [
      {
        q: 'Can I link to articles published elsewhere?',
        a: 'Yes. Add a Button block or a link in your text for each clip.',
      },
      {
        q: 'Can I show quotes from editors or clients?',
        a: 'Yes — the Quote block is made for testimonials and pull quotes.',
      },
    ],
  },
];

export function audience(slug: string): AudiencePage | null {
  return AUDIENCES.find((a) => a.slug === slug) ?? null;
}

/** Every platform page beyond `/` and `/signup`, for the sitemap and footer. */
export const PLATFORM_PAGES: { path: string; label: string }[] = [
  { path: '/templates', label: 'Templates' },
  ...AUDIENCES.map((a) => ({ path: `/for/${a.slug}`, label: `For ${a.slug}` })),
];
