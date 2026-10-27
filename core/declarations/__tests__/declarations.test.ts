import { describe, expect, it } from 'vitest';
import {
  checkFact,
  checkFacts,
  checkName,
  declarationText,
  fingerprint,
  licenceLapsed,
  statement,
  type Fact,
} from '../facts';
import { formatAud, priceFor } from '../price';
import { formEncode } from '@/core/payments/stripe';

const NOW = new Date('2026-10-27T00:00:00Z');

describe('declaration facts', () => {
  it('turns each kind of fact into one fixed sentence', () => {
    expect(
      statement({
        kind: 'employment',
        employer: 'Acme Pty Ltd',
        role: 'Design Engineer',
        from: '2021-03',
        to: '2024-06',
      })
    ).toBe('I was employed by Acme Pty Ltd as Design Engineer from March 2021 to June 2024.');
    expect(
      statement({
        kind: 'employment',
        employer: 'Acme Pty Ltd',
        role: 'Lead',
        from: '2024-07',
        to: 'present',
      })
    ).toBe('I have been employed by Acme Pty Ltd as Lead since July 2024.');
    expect(
      statement({
        kind: 'education',
        qualification: 'Bachelor of Engineering (Honours)',
        institution: 'QUT',
        year: '2020',
      })
    ).toBe('I was awarded the Bachelor of Engineering (Honours) by QUT in 2020.');
    expect(statement({ kind: 'licence', name: 'RPEQ', issuer: 'BPEQ', number: '12345' })).toBe(
      'I hold RPEQ, number 12345, issued by BPEQ, and it is current on the date of this declaration.'
    );
  });

  it('numbers the statements for pasting into myGov', () => {
    const facts: Fact[] = [
      { kind: 'education', qualification: 'BEng', institution: 'UQ', year: '2019' },
      { kind: 'licence', name: 'RPEQ', issuer: 'BPEQ', number: '1' },
    ];
    expect(declarationText(facts).split('\n')).toEqual([
      '1. I was awarded the BEng by UQ in 2019.',
      '2. I hold RPEQ, number 1, issued by BPEQ, and it is current on the date of this declaration.',
    ]);
  });

  it('rejects missing, future and out-of-order dates', () => {
    expect(
      checkFact({ kind: 'employment', employer: 'A', role: 'B', from: '', to: '' }, NOW).errors
    ).toContain('Start month is required.');
    expect(
      checkFact(
        { kind: 'employment', employer: 'A', role: 'B', from: '2027-01', to: 'present' },
        NOW
      ).errors
    ).toContain('Start month cannot be in the future.');
    expect(
      checkFact(
        { kind: 'employment', employer: 'A', role: 'B', from: '2022-05', to: '2021-01' },
        NOW
      ).errors
    ).toContain('End month is before the start.');
    expect(
      checkFact({ kind: 'education', qualification: 'A', institution: 'B', year: '2030' }, NOW)
        .errors
    ).toContain('Year completed cannot be in the future.');
  });

  it('refuses markup and quotes, so nothing but plain facts gets in', () => {
    const { errors } = checkFact(
      { kind: 'licence', name: '<b>RPEQ</b>', issuer: 'BPEQ', number: '1' },
      NOW
    );
    expect(errors).toContain('Licence or registration has characters a declaration cannot use.');
    expect(checkName('Jane "the best" Doe').error).toBeTruthy();
    expect(checkName('Seán O’Brien-Nguyen').error).toBeUndefined();
  });

  it('caps a declaration at twelve facts and needs at least one', () => {
    expect(checkFacts([]).errors).toEqual(['Add at least one fact.']);
    const many = Array.from({ length: 13 }, () => ({
      kind: 'licence',
      name: 'A',
      issuer: 'B',
      number: '1',
    }));
    expect(checkFacts(many).errors[0]).toMatch(/up to 12/);
  });

  it('fingerprints exactly what is declared', () => {
    const a: Fact[] = [
      { kind: 'education', qualification: 'BEng', institution: 'UQ', year: '2019' },
    ];
    const b: Fact[] = [
      { kind: 'education', qualification: 'BEng', institution: 'UQ', year: '2018' },
    ];
    expect(fingerprint('Jane Doe', a)).toBe(fingerprint('jane doe', a));
    expect(fingerprint('Jane Doe', a)).not.toBe(fingerprint('Jane Doe', b));
  });

  it('lets a licence claim lapse after a year', () => {
    expect(licenceLapsed('2025-10-01', NOW)).toBe(true);
    expect(licenceLapsed('2026-01-01', NOW)).toBe(false);
  });
});

describe('declaration price', () => {
  it('charges the founding price to the first hundred, then the full price', () => {
    expect(priceFor({ approvedForSite: 0, approvedTotal: 0 })).toEqual({
      cents: 1500,
      kind: 'founding',
    });
    expect(priceFor({ approvedForSite: 0, approvedTotal: 99 })).toEqual({
      cents: 1500,
      kind: 'founding',
    });
    expect(priceFor({ approvedForSite: 0, approvedTotal: 100 })).toEqual({
      cents: 1900,
      kind: 'standard',
    });
  });

  it('charges A$9 to declare again, founding window or not', () => {
    expect(priceFor({ approvedForSite: 1, approvedTotal: 3 })).toEqual({
      cents: 900,
      kind: 'redeclare',
    });
  });

  it('formats Australian dollars', () => {
    expect(formatAud(1900)).toBe('A$19');
    expect(formatAud(950)).toBe('A$9.50');
  });
});

describe('Stripe form encoding', () => {
  it('encodes nested objects and arrays the way Stripe expects', () => {
    const body = formEncode({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ quantity: 1, price_data: { currency: 'aud', unit_amount: 1500 } }],
      skipped: undefined,
    }).join('&');
    expect(decodeURIComponent(body)).toBe(
      'mode=payment&payment_method_types[0]=card&line_items[0][quantity]=1&line_items[0][price_data][currency]=aud&line_items[0][price_data][unit_amount]=1500'
    );
  });
});
