import { buildSite, type PlainBlock } from '@/core/legacy/build';
import type { StudioSite } from '@/core/studio/types';

/**
 * The example portfolio at webcv.au/example: a fictional product design
 * engineer, written to show what a finished WebCV portfolio looks like.
 *
 * Jordan Reyes is not a real person, every project detail is invented, and
 * the pictures are illustrations. The page says so at the top and the bottom,
 * and it is kept out of search results. It lives in code, not the database:
 * nobody owns it and nobody can edit it.
 */

export const EXAMPLE_SLUG = 'example';
export const EXAMPLE_NAME = 'Jordan Reyes';

const img = (name: string) => `/example/${name}.svg`;

const heading = (text: string): PlainBlock => ({
  type: 'Heading',
  props: { text, size: 's', align: 'left' },
});
const text = (value: string, size: 'body' | 'lead' = 'body'): PlainBlock => ({
  type: 'Text',
  props: { text: value, size, align: 'left' },
});
const image = (name: string, alt: string, caption = ''): PlainBlock => ({
  type: 'Image',
  props: { src: img(name), alt, caption, width: 'wide' },
});

const NDA =
  'Details are described at the level of public product information. (In this fictional example, everything is invented.)';

export function exampleSite(): StudioSite {
  return buildSite({
    design: {
      template: 'swiss',
      mode: 'light',
      accent: '#0a66c2',
      fonts: 'grotesk',
      siteName: EXAMPLE_NAME,
      tagline: 'Product design engineer',
    },
    pages: [
      {
        title: 'Work',
        slug: '',
        blocks: [
          {
            type: 'Hero',
            props: {
              heading:
                'I design the parts you hold every day — and make sure a million of them fit.',
              text: 'Product design engineer at Apple in Cupertino. Enclosures, thermals and tolerance analysis, from first sketch to mass production.',
              size: 'm',
              align: 'left',
            },
          },
          {
            type: 'Projects',
            props: { heading: '', columns: 'auto', shape: 'auto', captions: 'below' },
          },
        ],
      },
      {
        title: 'About',
        slug: 'about',
        blocks: [
          {
            type: 'Split',
            props: {
              src: img('portrait'),
              alt: 'Illustrated placeholder portrait',
              heading: 'Hi, I’m Jordan.',
              text: 'I grew up in Sydney, studied mechanical engineering at UNSW, and have spent the last six years turning industrial design into parts that can be built by the million.\n\nI like problems where a tenth of a millimetre matters: how a cover glass sits flush, how heat leaves a device with no fan, why a hinge feels the same on the first day and the ten-thousandth.',
              side: 'left',
            },
          },
          { type: 'Spacer', props: { size: 'm' } },
          heading('Experience'),
          text(
            'Product Design Engineer — Apple, Cupertino · 2022 to now\nMechanical Engineer — Sonder Devices, Sydney · 2019 to 2022\nGraduate Engineer — Northline Manufacturing, Sydney · 2019'
          ),
          heading('Education'),
          text('Bachelor of Engineering (Mechanical), Honours — UNSW Sydney · 2018'),
          heading('Tools'),
          text(
            'CAD — Creo, NX, SolidWorks\nAnalysis — tolerance stack-ups (RSS and worst case), FEA, thermal simulation\nManufacturing — injection moulding, CNC aluminium, die casting, DFM/DFA, GD&T (ASME Y14.5)'
          ),
          {
            type: 'Quote',
            props: {
              quote: 'Jordan finds the problem in a drawing before the factory does.',
              by: 'Engineering manager (fictional)',
            },
          },
          {
            type: 'Button',
            props: { label: 'Get in touch', href: '/contact', variant: 'solid', align: 'left' },
          },
        ],
      },
      {
        title: 'Contact',
        slug: 'contact',
        blocks: [
          {
            type: 'Contact',
            props: {
              heading: 'Let’s talk',
              text: 'Open to conversations about hardware roles and mentoring graduate engineers. This is an example portfolio, so messages here go nowhere.',
              email: '',
              form: 'yes',
            },
          },
          {
            type: 'Social',
            props: {
              links: [{ label: 'LinkedIn', url: 'https://www.linkedin.com/' }],
              align: 'left',
            },
          },
        ],
      },
    ],
    projects: [
      {
        title: 'Wearable enclosure, sketch to production',
        slug: 'wearable-enclosure',
        subtitle: 'Apple · Enclosure design',
        year: '2025',
        cover: img('enclosure'),
        blocks: [
          text(
            'Owned the mechanical design of a wearable’s enclosure: five parts that had to close to a flush, water-resistant shell thinner than the previous generation.',
            'lead'
          ),
          heading('The problem'),
          text(
            'The new display stack was 0.4 mm thicker, but industrial design wanted the product thinner. Every part of the stack had to give something back without weakening the drop performance.'
          ),
          image(
            'enclosure',
            'Exploded view of the five-part enclosure, cover glass to rear housing'
          ),
          heading('What I did'),
          text(
            '• Re-partitioned the midframe so the battery could sit 0.25 mm lower\n• Ran 40+ tolerance stack-ups to hold a 0.05 mm flush between glass and housing\n• Worked with the factory on gate locations to keep sink marks off cosmetic faces\n• Built and drop-tested six prototype builds, P1 to P6'
          ),
          image('prototypes', 'Six prototype iterations shown side by side'),
          heading('Result'),
          text(
            '0.3 mm thinner overall, same drop rating, first-pass yield above target at mass production.'
          ),
          text(NDA),
        ],
      },
      {
        title: 'Cooling a device with no fan',
        slug: 'fanless-thermal',
        subtitle: 'Apple · Thermal design',
        year: '2024',
        cover: img('thermal'),
        blocks: [
          text(
            'Designed the heat path for a fanless device so the processor could hold full speed for longer without the case becoming uncomfortable to touch.',
            'lead'
          ),
          image(
            'thermal',
            'Simulated surface temperature map with the processor hot spot outlined'
          ),
          heading('Approach'),
          text(
            '• Mapped the hot spot with simulation, then confirmed it with thermocouples on early builds\n• Added a graphite spreader and a vapour-chamber path to the housing\n• Moved two components to open a conduction path to the largest metal surface'
          ),
          heading('Result'),
          text(
            'Peak skin temperature down 4 °C at the same workload; sustained performance up 12%.'
          ),
          text(NDA),
        ],
      },
      {
        title: 'A hinge that feels the same on day 1,000',
        slug: 'hinge-tolerances',
        subtitle: 'Apple · Tolerance analysis',
        year: '2023',
        cover: img('tolerance'),
        blocks: [
          text(
            'Led the tolerance analysis for a hinge whose opening force had to stay within a narrow band across every unit and its whole life.',
            'lead'
          ),
          image('tolerance', 'Tolerance stack-up chart for the hinge gap'),
          image('section', 'Section view of the sealed joint, with a compressed gasket'),
          heading('What I did'),
          text(
            '• Built the stack-up model (RSS and worst case) and found two contributors driving 70% of the variation\n• Changed the datum scheme so they were measured from the same feature\n• Wrote the inspection plan the factory used for incoming parts'
          ),
          heading('Result'),
          text('Variation in opening force halved; no tolerance-related rework at launch.'),
          text(NDA),
        ],
      },
      {
        title: 'Drop-test fixture',
        slug: 'drop-test-fixture',
        subtitle: 'Sonder Devices · Test equipment',
        year: '2021',
        cover: img('drop-fixture'),
        blocks: [
          text(
            'Designed a drop-test fixture that releases a device at a set angle, every time, so test results compare like with like.',
            'lead'
          ),
          image('drop-fixture', 'Drop-test fixture holding a device at a set release angle'),
          heading('Result'),
          text(
            'Release angle repeatable to ±0.5°, and test-to-test scatter cut by more than half. The design is still used for every new product.'
          ),
        ],
      },
    ],
  });
}
