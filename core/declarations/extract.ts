import 'server-only';
import { z } from 'zod';
import { getStorageAdapter } from '@/core/storage/registry';

/**
 * "Fill from my CV": a model reads pasted CV text and lists the facts in it.
 *
 * It only fills the form. The person checks and corrects every field before
 * saving, and the declaration's sentences still come from the fixed template —
 * the model never writes declaration text.
 *
 * Through OpenRouter, with the models the Swiss Cheese AI council chose
 * (debate 6ec2bf83, 27 Oct 2026): `openai/gpt-5-nano`, falling back to
 * `google/gemini-2.5-flash-lite` — both from US developers, both cheap — and
 * routed only to providers that neither train on nor retain prompts, failing
 * closed when none is available. Off unless `OPENROUTER_API_KEY` is set.
 */

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const PRIMARY = 'openai/gpt-5-nano';
const FALLBACK = 'google/gemini-2.5-flash-lite';

export function extractionAvailable(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export class ExtractError extends Error {}

const MAX_CV_CHARS = 20_000;
const DAILY_LIMIT = 10;
const MONTH = /^(19|20)\d{2}-(0[1-9]|1[0-2])$/;
const YEAR = /^(19|20)\d{2}$/;

const ExtractedFact = z.object({
  kind: z.enum(['employment', 'education', 'licence']),
  employer: z.string(),
  role: z.string(),
  from: z.string(),
  to: z.string(),
  qualification: z.string(),
  institution: z.string(),
  year: z.string(),
  name: z.string(),
  issuer: z.string(),
  number: z.string(),
});
const Extraction = z.object({ facts: z.array(ExtractedFact) });

export type ExtractedFact = z.infer<typeof ExtractedFact> & {
  /** Something in it was not found word for word in the CV: check it first. */
  check?: boolean;
};

const FIELDS = [
  'employer',
  'role',
  'from',
  'to',
  'qualification',
  'institution',
  'year',
  'name',
  'issuer',
  'number',
] as const;

/** Strict JSON Schema: every field required, nothing extra, empty for "not stated". */
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['facts'],
  properties: {
    facts: {
      type: 'array',
      maxItems: 12,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', ...FIELDS],
        properties: {
          kind: { type: 'string', enum: ['employment', 'education', 'licence'] },
          ...Object.fromEntries(FIELDS.map((f) => [f, { type: 'string' }])),
        },
      },
    },
  },
};

const SYSTEM = `You copy career facts out of CV text. The person will swear to them in an Australian statutory declaration, so copy, never infer.

- Only include facts the text states explicitly. Never infer, round or guess a date, title or name. If something is not stated, use an empty string.
- employment: employer and role exactly as written; from and to as "YYYY-MM"; to is "present" only if the text says the job is current.
- education: qualification as written, institution, year completed as "YYYY". Skip qualifications still in progress.
- licence: a licence, registration or membership that has a number: name, issuer, number. Skip any without a number.
- Leave fields that do not apply to the fact's kind as empty strings.
- Leave out skills, achievements, responsibilities, opinions, referees and anything about other people.
- At most 12 facts, most recent first.`;

const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** Drops values the template would refuse, and marks facts not found in the CV. */
function tidy(fact: z.infer<typeof ExtractedFact>, cv: string): ExtractedFact {
  const clean = { ...fact };
  for (const f of FIELDS) clean[f] = clean[f].replace(/\s+/g, ' ').trim().slice(0, 120);
  if (clean.from && !MONTH.test(clean.from)) clean.from = '';
  if (clean.to && clean.to !== 'present' && !MONTH.test(clean.to)) clean.to = '';
  if (clean.year && !YEAR.test(clean.year)) clean.year = '';

  // A schema-valid answer can still be a guess. Names and numbers should
  // appear in the CV as typed, and every date's year should appear somewhere.
  const text = squash(cv);
  const words = [
    'employer',
    'role',
    'qualification',
    'institution',
    'name',
    'issuer',
    'number',
  ] as const;
  const missingWord = words.some((f) => clean[f] && !text.includes(squash(clean[f])));
  const years = [clean.from, clean.to, clean.year]
    .filter((v) => v && v !== 'present')
    .map((v) => v.slice(0, 4));
  const missingYear = years.some((y) => !cv.includes(y));
  return { ...clean, check: missingWord || missingYear };
}

async function ask(model: string, cv: string): Promise<z.infer<typeof Extraction> | null> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY?.trim()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://www.webcv.au',
      'X-Title': 'WebCV',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `<cv>\n${cv}\n</cv>` },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'career_facts', strict: true, schema: SCHEMA },
      },
      // Reasoning tokens are billed as output; a little is plenty for copying.
      ...(model.startsWith('openai/gpt-5') ? { reasoning: { effort: 'low' } } : {}),
      max_tokens: 6000,
      // Personal data: only providers that neither train on nor keep prompts,
      // and nowhere else if none of them can take it.
      provider: {
        require_parameters: true,
        data_collection: 'deny',
        zdr: true,
        allow_fallbacks: false,
      },
    }),
    signal: AbortSignal.timeout(60_000),
    cache: 'no-store',
  }).catch(() => null);

  if (!res) return null;
  if (res.status === 429) throw new ExtractError('The reader is busy — try again in a minute.');
  if (!res.ok) {
    console.error('[webcv] CV extraction failed.', model, res.status);
    return null;
  }
  const json = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  } | null;
  const content = json?.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    const parsed = Extraction.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function extractFacts(site: string, cvText: string): Promise<ExtractedFact[]> {
  const text = cvText.trim();
  if (text.length < 40) throw new ExtractError('Paste a bit more of your CV.');
  if (text.length > MAX_CV_CHARS)
    throw new ExtractError('That is longer than a CV — paste the experience and education parts.');

  const kv = (await getStorageAdapter()).kv;
  const used = await kv.incr('ratelimit', `declaration-extract:${site}`, 86_400);
  if (used > DAILY_LIMIT)
    throw new ExtractError('That is enough for today — fill in the rest by hand.');

  const result = (await ask(PRIMARY, text)) ?? (await ask(FALLBACK, text));
  if (!result)
    throw new ExtractError('Could not read the CV just now — fill the facts in by hand.');
  return result.facts.slice(0, 12).map((fact) => tidy(fact, text));
}
