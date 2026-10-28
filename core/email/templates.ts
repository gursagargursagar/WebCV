import 'server-only';

/**
 * The messages this project sends.
 *
 * Plain text is written first and carries everything; the HTML wraps the same
 * words in WebCV's look (the platform's editorial style: logo, ruled mono
 * label, serif heading). No tracking pixels; the one remote image is WebCV's
 * own logo, served from webcv.au.
 *
 * User-supplied content appears in the body only. The one place it reaches a
 * header is `Reply-To`, and only after the contact route's `clean()` has
 * stripped control characters — which is what stops a newline in a form field
 * from becoming an extra mail header.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const INK = '#101212';
const BODY = '#3f3c42';
const MUTED = '#5f615f';
const PAPER = '#f3f3ef';
const LINE = '#dadada';
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

function logoUrl(): string {
  const origin = process.env.OPB_SITE_URL?.trim().replace(/\/$/, '') || 'https://www.webcv.au';
  return `${origin}/brand/webcv-mark.png`;
}

/** A paragraph in the body's type. */
function para(html: string, style = ''): string {
  return `<p style="margin:0 0 14px;font:400 15px/1.6 ${SANS};color:${BODY};${style}">${html}</p>`;
}

/** A link as a button. */
function button(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px"><tr><td style="background:${INK};border-radius:999px"><a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 22px;font:600 15px/1 ${SANS};color:#ffffff;text-decoration:none">${escapeHtml(label)}</a></td></tr></table>`;
}

/**
 * A link that carries a one-time secret (a reset or confirmation token).
 *
 * When the sending domain rewrites links for click tracking, the token would
 * pass through the tracker on its way. `OPB_MAIL_PLAIN_LINKS=1` shows these
 * links as text instead, which mail apps still make tappable but send
 * nowhere else first. Ordinary links stay buttons either way.
 */
function secretLink(url: string, label: string): string {
  if (process.env.OPB_MAIL_PLAIN_LINKS !== '1') return button(url, label);
  return [
    para(`${escapeHtml(label)}: open this link.`, 'margin-bottom:8px'),
    `<div style="margin:0 0 18px;padding:12px 14px;background:${PAPER};border:1px solid ${LINE};border-radius:12px;font:400 13px/1.5 ${MONO};color:${INK};word-break:break-all">${escapeHtml(url)}</div>`,
  ].join('');
}

/** WebCV's email frame: logo, ruled label, heading, then the message. */
function layout(input: { kicker: string; heading: string; body: string; preheader: string }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(input.heading)}</title></head>
<body style="margin:0;padding:0;background:${PAPER}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${INK};border-radius:18px">
<tr><td style="padding:26px 32px 0">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle"><img src="${logoUrl()}" width="36" height="36" alt="WebCV" style="display:block;border:0;border-radius:10px"></td>
<td style="vertical-align:middle;padding-left:10px;font:700 19px/1 ${SERIF};color:${INK};letter-spacing:-0.02em">WebCV</td>
</tr></table>
</td></tr>
<tr><td style="padding:24px 32px 0"><div style="padding-bottom:10px;border-bottom:1px solid ${INK};font:700 11px/1.4 ${MONO};letter-spacing:0.14em;text-transform:uppercase;color:${MUTED}">${escapeHtml(input.kicker)}</div></td></tr>
<tr><td style="padding:22px 32px 6px;font:400 30px/1.15 ${SERIF};color:${INK};letter-spacing:-0.02em">${escapeHtml(input.heading)}</td></tr>
<tr><td style="padding:12px 32px 22px">${input.body}</td></tr>
</table>
<p style="max-width:520px;margin:16px auto 0;font:400 12px/1.6 ${SANS};color:${MUTED};text-align:center">WebCV · portfolios at webcv.au/you</p>
</td></tr></table>
</body></html>`;
}

export interface EnquiryInput {
  siteName: string;
  name: string;
  email: string;
  company?: string;
  projectType?: string;
  message: string;
  inboxUrl: string;
}

export function enquiryNotification(input: EnquiryInput) {
  const details = [
    `From: ${input.name} <${input.email}>`,
    input.company ? `Company: ${input.company}` : null,
    input.projectType ? `About: ${input.projectType}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const text = [
    `${input.name} sent you a message through ${input.siteName}.`,
    '',
    details,
    '',
    input.message,
    '',
    `Reply to this email to answer them directly, or open your inbox:`,
    input.inboxUrl,
  ].join('\n');

  const html = layout({
    kicker: 'WebCV / New message',
    heading: `${input.name} wrote to you`,
    preheader: `${input.name} sent you a message through ${input.siteName}.`,
    body: [
      para(`${escapeHtml(input.name)} sent you a message through ${escapeHtml(input.siteName)}.`),
      para(escapeHtml(details).replace(/\n/g, '<br>'), `font:400 13px/1.6 ${MONO};color:${MUTED}`),
      `<blockquote style="margin:0 0 18px;padding:14px 16px;background:${PAPER};border-left:3px solid ${INK};font:400 15px/1.6 ${SANS};color:${INK}">${escapeHtml(input.message).replace(/\n/g, '<br>')}</blockquote>`,
      para('Reply to this email to answer them directly, or open your inbox.'),
      button(input.inboxUrl, 'Open your inbox'),
    ].join(''),
  });

  return { subject: `New enquiry from ${input.name}`, text, html };
}

export interface ResetInput {
  siteName: string;
  resetUrl: string;
  expiresMinutes: number;
}

export function passphraseReset(input: ResetInput) {
  const text = [
    `Somebody asked to reset the passphrase for ${input.siteName}.`,
    '',
    `Open this link within ${input.expiresMinutes} minutes to choose a new one:`,
    input.resetUrl,
    '',
    'It works once. If this was not you, nothing has changed and you can ignore',
    'this email — but somebody knows your address, so a strong passphrase is',
    'worth having.',
  ].join('\n');

  const html = layout({
    kicker: 'WebCV / Passphrase reset',
    heading: 'Choose a new passphrase',
    preheader: `Reset the passphrase for ${input.siteName}. The link works once.`,
    body: [
      para(`Somebody asked to reset the passphrase for ${escapeHtml(input.siteName)}.`),
      secretLink(input.resetUrl, 'Choose a new passphrase'),
      para(
        `The link works once, within ${input.expiresMinutes} minutes.`,
        `font:400 12px/1.6 ${MONO};color:${MUTED}`
      ),
      para(
        'If this was not you, nothing has changed and you can ignore this email — but somebody knows your address, so a strong passphrase is worth having.'
      ),
    ].join(''),
  });

  return { subject: `Reset your ${input.siteName} passphrase`, text, html };
}

export interface ConfirmSubscriptionInput {
  siteName: string;
  confirmUrl: string;
  expiresDays: number;
}

/**
 * "Did you mean to sign up?"
 *
 * The only email this project sends to somebody who is not the owner, and the
 * reason double opt-in exists: anybody can type anybody's address into a form.
 * It therefore has to read as a question to a stranger who may not have asked
 * for it, not as a welcome — hence the last paragraph, which is the part that
 * matters most to the person receiving it by mistake.
 */
export function confirmSubscription(input: ConfirmSubscriptionInput) {
  const text = [
    `Somebody — hopefully you — asked to receive updates from ${input.siteName}.`,
    '',
    'Open this link to confirm:',
    input.confirmUrl,
    '',
    `If you do nothing, the request is deleted after ${input.expiresDays} days and`,
    'you will not hear from this address again. Nobody has been added to any',
    'list yet.',
  ].join('\n');

  const html = layout({
    kicker: 'WebCV / Confirm',
    heading: 'Confirm your subscription',
    preheader: `Confirm you want updates from ${input.siteName}.`,
    body: [
      para(
        `Somebody — hopefully you — asked to receive updates from ${escapeHtml(input.siteName)}.`
      ),
      secretLink(input.confirmUrl, 'Confirm your subscription'),
      para(
        `If you do nothing, the request is deleted after ${input.expiresDays} days and you will not hear from this address again. Nobody has been added to any list yet.`
      ),
    ].join(''),
  });

  return { subject: `Confirm your subscription to ${input.siteName}`, text, html };
}

export interface SignInCodeInput {
  siteName: string;
  code: string;
  expiresMinutes: number;
}

/**
 * A one-time sign-in code for the owner.
 *
 * Goes to exactly one address — the owner's — so unlike the subscription
 * confirmation it needs no stranger-facing apology paragraph. The code is
 * short enough to retype from a phone notification and expires in minutes,
 * which is what makes reply-to guessing worthless.
 */
export function signInCode(input: SignInCodeInput) {
  const text = [
    `Your sign-in code for ${input.siteName} is:`,
    '',
    input.code,
    '',
    `It works once, within ${input.expiresMinutes} minutes. If this was not you,`,
    'nothing has changed and you can ignore this email.',
  ].join('\n');

  const html = layout({
    kicker: 'WebCV / Sign-in code',
    heading: 'Your sign-in code',
    preheader: `${input.code} is your ${input.siteName} sign-in code.`,
    body: [
      para(`Enter this code to sign in to ${escapeHtml(input.siteName)}.`),
      `<div style="margin:8px 0 10px;padding:20px 0;background:${PAPER};border:1px solid ${LINE};border-radius:12px;text-align:center;font:700 34px/1 ${MONO};letter-spacing:10px;color:${INK}">${escapeHtml(input.code)}</div>`,
      para(
        `Expires in ${input.expiresMinutes} minutes · works once`,
        `margin-bottom:20px;font:400 12px/1.6 ${MONO};color:${MUTED};text-align:center`
      ),
      para(
        'If this was not you, nothing has changed and you can ignore this email. Never share this code: WebCV will never ask you for it.'
      ),
    ].join(''),
  });

  return { subject: `Your ${input.siteName} sign-in code`, text, html };
}

export interface DigestInput {
  siteName: string;
  /** "October 2026" — the month just ended. */
  month: string;
  views: {
    visitors: number | null;
    pageviews: number | null;
    topPages: { path: string; views: number }[];
  } | null;
  newMessages: number;
  unread: number;
  unpublished: boolean;
  /** Launch-checklist steps still open, with where to do each. */
  todo: { label: string; url: string }[];
  adminUrl: string;
}

/**
 * The monthly note to the owner. Short on purpose: a portfolio is edited a few
 * times a year, and the reason to open it again is one line — someone wrote,
 * people looked, something is half-done — not a report.
 */
export function monthlyDigest(input: DigestInput) {
  const lines: string[] = [];
  if (input.views && (input.views.visitors ?? input.views.pageviews) !== null) {
    const parts = [
      input.views.visitors !== null ? `${input.views.visitors} visitors` : null,
      input.views.pageviews !== null ? `${input.views.pageviews} page views` : null,
    ].filter(Boolean);
    lines.push(`In the last 30 days: ${parts.join(', ')}.`);
    const top = input.views.topPages.slice(0, 3);
    if (top.length)
      lines.push(`Most read: ${top.map((page) => `${page.path} (${page.views})`).join(', ')}.`);
  }
  lines.push(
    input.newMessages === 0
      ? 'No new enquiries this month.'
      : `${input.newMessages} new ${input.newMessages === 1 ? 'enquiry' : 'enquiries'} this month${
          input.unread ? `, ${input.unread} still unread` : ''
        }.`
  );
  if (input.unpublished) lines.push('You have changes saved in your draft that are not live yet.');

  const text = [
    `Your ${input.month} on ${input.siteName}:`,
    '',
    ...lines,
    ...(input.todo.length
      ? [
          '',
          'Still to do before your site is fully launched:',
          ...input.todo.map((step) => `- ${step.label}: ${step.url}`),
        ]
      : []),
    '',
    `Open your admin: ${input.adminUrl}`,
    '',
    'You get this once a month. To stop it, set OPB_DIGEST=off in your hosting settings.',
  ].join('\n');

  const html = layout({
    kicker: `WebCV / ${input.month}`,
    heading: `Your ${input.month} on ${input.siteName}`,
    preheader: lines[0] ?? `Your ${input.month} on ${input.siteName}`,
    body: [
      `<ul style="margin:0 0 18px;padding-left:20px;font:400 15px/1.7 ${SANS};color:${BODY}">${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`,
      input.todo.length
        ? para('Still to do before your site is fully launched:') +
          `<ul style="margin:0 0 18px;padding-left:20px;font:400 15px/1.7 ${SANS}">${input.todo
            .map(
              (step) =>
                `<li><a href="${escapeHtml(step.url)}" style="color:${INK}">${escapeHtml(step.label)}</a></li>`
            )
            .join('')}</ul>`
        : '',
      button(input.adminUrl, 'Open your admin'),
      para(
        'You get this once a month. To stop it, set OPB_DIGEST=off in your hosting settings.',
        `font:400 12px/1.6 ${SANS};color:${MUTED}`
      ),
    ].join(''),
  });

  const subject =
    input.newMessages > 0
      ? `${input.siteName}: ${input.newMessages} new ${input.newMessages === 1 ? 'enquiry' : 'enquiries'} in ${input.month}`
      : `${input.siteName} in ${input.month}`;
  return { subject, text, html };
}
