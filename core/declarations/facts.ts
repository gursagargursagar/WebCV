import { createHash } from 'node:crypto';

/**
 * Career facts a person can put in a statutory declaration, and the fixed
 * sentences they become.
 *
 * Structured fields only, and a template rather than free writing: a word
 * added that is not true makes the whole declaration false, so nothing — not
 * the person's phrasing, not an AI — gets to embellish. Opinions, reasons for
 * leaving and claims about other people have no field to go in.
 */

export type Fact =
  | { kind: 'employment'; employer: string; role: string; from: string; to: string }
  | { kind: 'education'; qualification: string; institution: string; year: string }
  | { kind: 'licence'; name: string; issuer: string; number: string };

export type FactKind = Fact['kind'];

export const MAX_FACTS = 12;

/** Letters, numbers and the punctuation names and titles use. No quotes, no markup. */
const TEXT = /^[\p{L}\p{M}\p{N} .,&'’()/+#:-]+$/u;
const MONTH = /^(19|20)\d{2}-(0[1-9]|1[0-2])$/;
const YEAR = /^(19|20)\d{2}$/;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function clean(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function text(value: unknown, label: string, errors: string[], max = 120): string {
  const v = clean(value);
  if (!v) errors.push(`${label} is required.`);
  else if (v.length > max) errors.push(`${label} must be ${max} characters or fewer.`);
  else if (!TEXT.test(v)) errors.push(`${label} has characters a declaration cannot use.`);
  return v;
}

export function monthLabel(value: string): string {
  const [year, month] = value.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/** Checks one fact; the returned fact is trimmed. */
export function checkFact(
  input: unknown,
  now = new Date()
): { fact: Fact | null; errors: string[] } {
  const errors: string[] = [];
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  switch (raw.kind) {
    case 'employment': {
      const employer = text(raw.employer, 'Employer', errors);
      const role = text(raw.role, 'Job title', errors);
      const from = clean(raw.from);
      const to = clean(raw.to) || 'present';
      if (!MONTH.test(from)) errors.push('Start month is required.');
      else if (from > thisMonth) errors.push('Start month cannot be in the future.');
      if (to !== 'present') {
        if (!MONTH.test(to)) errors.push('End month must be a month, or "present".');
        else if (MONTH.test(from) && to < from) errors.push('End month is before the start.');
        else if (to > thisMonth) errors.push('End month cannot be in the future.');
      }
      return {
        fact: errors.length ? null : { kind: 'employment', employer, role, from, to },
        errors,
      };
    }
    case 'education': {
      const qualification = text(raw.qualification, 'Qualification', errors);
      const institution = text(raw.institution, 'Institution', errors);
      const year = clean(raw.year);
      if (!YEAR.test(year)) errors.push('Year completed is required.');
      else if (Number(year) > now.getFullYear())
        errors.push('Year completed cannot be in the future.');
      return {
        fact: errors.length ? null : { kind: 'education', qualification, institution, year },
        errors,
      };
    }
    case 'licence': {
      const name = text(raw.name, 'Licence or registration', errors);
      const issuer = text(raw.issuer, 'Issued by', errors);
      const number = text(raw.number, 'Number', errors, 40);
      return { fact: errors.length ? null : { kind: 'licence', name, issuer, number }, errors };
    }
    default:
      return { fact: null, errors: ['Choose what kind of fact this is.'] };
  }
}

export function checkFacts(input: unknown): { facts: Fact[]; errors: string[] } {
  if (!Array.isArray(input) || input.length === 0) {
    return { facts: [], errors: ['Add at least one fact.'] };
  }
  if (input.length > MAX_FACTS) {
    return { facts: [], errors: [`A declaration can hold up to ${MAX_FACTS} facts.`] };
  }
  const facts: Fact[] = [];
  const errors: string[] = [];
  input.forEach((item, i) => {
    const checked = checkFact(item);
    if (checked.fact) facts.push(checked.fact);
    else errors.push(...checked.errors.map((e) => `Fact ${i + 1}: ${e}`));
  });
  return { facts: errors.length ? [] : facts, errors };
}

/** Full legal name, as the Digital ID shows it. */
export function checkName(value: unknown): { name: string; error?: string } {
  const name = clean(value);
  if (!name) return { name, error: 'Your full name is required.' };
  if (name.length > 120 || !TEXT.test(name))
    return { name, error: 'Use your name exactly as it appears on your Digital ID.' };
  return { name };
}

/** The sentence a fact becomes. Fixed wording; only the fields vary. */
export function statement(fact: Fact): string {
  switch (fact.kind) {
    case 'employment':
      return fact.to === 'present'
        ? `I have been employed by ${fact.employer} as ${fact.role} since ${monthLabel(fact.from)}.`
        : `I was employed by ${fact.employer} as ${fact.role} from ${monthLabel(fact.from)} to ${monthLabel(fact.to)}.`;
    case 'education':
      return `I was awarded the ${fact.qualification} by ${fact.institution} in ${fact.year}.`;
    case 'licence':
      return `I hold ${fact.name}, number ${fact.number}, issued by ${fact.issuer}, and it is current on the date of this declaration.`;
  }
}

export function statements(facts: Fact[]): string[] {
  return facts.map(statement);
}

/** The numbered text a person pastes into myGov. */
export function declarationText(facts: Fact[]): string {
  return statements(facts)
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n');
}

/** Identifies exactly what was declared: change a word and it changes. */
export function fingerprint(name: string, facts: Fact[]): string {
  return createHash('sha256')
    .update(JSON.stringify({ name: name.toLowerCase(), statements: statements(facts) }))
    .digest('hex');
}

/** Licence claims are "current" only as at the declaration; after a year they lapse. */
export const LICENCE_VALID_DAYS = 365;

export function licenceLapsed(declaredOn: string, now = new Date()): boolean {
  const declared = new Date(declaredOn);
  return now.getTime() - declared.getTime() > LICENCE_VALID_DAYS * 86_400_000;
}
