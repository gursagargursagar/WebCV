import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { getStorageAdapter } from '@/core/storage/registry';

/**
 * "Fill from my CV": Claude reads pasted CV text and lists the facts in it.
 *
 * It only fills the form. The person checks and corrects every field before
 * saving, and the declaration's sentences still come from the fixed template —
 * the model never writes declaration text. Off unless `ANTHROPIC_API_KEY` is
 * set for the platform.
 */

export function extractionAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export class ExtractError extends Error {}

const MAX_CV_CHARS = 20_000;
const DAILY_LIMIT = 10;

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

export type ExtractedFact = z.infer<typeof ExtractedFact>;

const SYSTEM = `You turn CV text into structured career facts that the person will later swear to in an Australian statutory declaration, so accuracy matters more than completeness.

Rules:
- Only include facts the text states explicitly. Never infer, round or guess a date, title or name. If a month or year is not stated, leave that field as an empty string.
- employment: employer (organisation name as written), role (job title as written), from and to as "YYYY-MM"; to is "present" only if the text says the job is current.
- education: qualification (e.g. "Bachelor of Engineering (Honours)"), institution, year completed as "YYYY". Skip qualifications still in progress.
- licence: a licence, registration or membership with an identifying number: name, issuer (the body that issued it) and number. Skip any without a number.
- Leave every field that does not apply to the fact's kind as an empty string.
- Leave out skills, achievements, responsibilities, opinions, referees and anything about other people.
- At most 12 facts, most recent first.`;

export async function extractFacts(site: string, cvText: string): Promise<ExtractedFact[]> {
  const text = cvText.trim();
  if (text.length < 40) throw new ExtractError('Paste a bit more of your CV.');
  if (text.length > MAX_CV_CHARS)
    throw new ExtractError('That is longer than a CV — paste the experience and education parts.');

  const kv = (await getStorageAdapter()).kv;
  const used = await kv.incr('ratelimit', `declaration-extract:${site}`, 86_400);
  if (used > DAILY_LIMIT)
    throw new ExtractError('That is enough for today — fill in the rest by hand.');

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(Extraction) },
      system: SYSTEM,
      messages: [{ role: 'user', content: `<cv>\n${text}\n</cv>` }],
    });
    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      throw new ExtractError('Could not read facts from that text — fill them in by hand.');
    }
    return response.parsed_output.facts.slice(0, 12);
  } catch (err) {
    if (err instanceof ExtractError) throw err;
    if (err instanceof Anthropic.RateLimitError) {
      throw new ExtractError('The reader is busy — try again in a minute.');
    }
    if (err instanceof Anthropic.APIError) {
      console.error('[webcv] CV extraction failed.', err.status, err.message);
      throw new ExtractError('Could not read the CV just now — fill the facts in by hand.');
    }
    throw err;
  }
}
