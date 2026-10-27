'use client';

import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  discardDeclarationAction,
  extractFactsAction,
  saveDeclarationFactsAction,
  startCheckoutAction,
  withdrawDeclarationAction,
} from '../_actions/declaration';

type Kind = 'employment' | 'education' | 'licence';

/** One editable fact: every field a string, so inputs stay controlled. */
export interface FactDraft {
  kind: Kind;
  employer: string;
  role: string;
  from: string;
  to: string;
  qualification: string;
  institution: string;
  year: string;
  name: string;
  issuer: string;
  number: string;
  /** Read from a CV, with something not found there word for word. */
  check?: boolean;
}

const BLANK: Omit<FactDraft, 'kind'> = {
  employer: '',
  role: '',
  from: '',
  to: '',
  qualification: '',
  institution: '',
  year: '',
  name: '',
  issuer: '',
  number: '',
};

function blankFact(kind: Kind): FactDraft {
  return { kind, ...BLANK };
}

const KIND_LABEL: Record<Kind, string> = {
  employment: 'Job',
  education: 'Qualification',
  licence: 'Licence or registration',
};

const INPUT = 'rounded-xl border border-border bg-surface-primary px-3 text-text-primary';
const BUTTON =
  'rounded-full border border-border px-4 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50';
const PRIMARY =
  'rounded-full bg-text-primary px-4 text-sm font-semibold text-bg disabled:opacity-50';

function TextInput({
  label,
  value,
  onChange,
  hint,
  type = 'text',
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  type?: string;
  max?: string;
}) {
  const id = useId();
  return (
    <div className="grid content-start gap-1 text-sm">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={INPUT}
        style={{ minHeight: 44 }}
      />
      {hint ? (
        <span id={`${id}-hint`} className="text-text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function FactFields({ fact, onChange }: { fact: FactDraft; onChange: (f: FactDraft) => void }) {
  const set = (patch: Partial<FactDraft>) => onChange({ ...fact, ...patch });
  const current = fact.to === 'present';
  switch (fact.kind) {
    case 'employment':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label="Employer"
            value={fact.employer}
            onChange={(employer) => set({ employer })}
            hint="The organisation's name, e.g. Acme Engineering Pty Ltd"
          />
          <TextInput label="Job title" value={fact.role} onChange={(role) => set({ role })} />
          <TextInput
            label="Started"
            type="month"
            value={fact.from}
            onChange={(from) => set({ from })}
          />
          <div className="grid content-start gap-1 text-sm">
            {current ? null : (
              <TextInput
                label="Finished"
                type="month"
                value={fact.to}
                onChange={(to) => set({ to })}
              />
            )}
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={current}
                onChange={(e) => set({ to: e.target.checked ? 'present' : '' })}
                className="h-5 w-5"
              />
              I still work here
            </label>
          </div>
        </div>
      );
    case 'education':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label="Qualification"
            value={fact.qualification}
            onChange={(qualification) => set({ qualification })}
            hint="As on your testamur, e.g. Bachelor of Engineering (Honours)"
          />
          <TextInput
            label="Institution"
            value={fact.institution}
            onChange={(institution) => set({ institution })}
          />
          <TextInput
            label="Year completed"
            type="number"
            value={fact.year}
            onChange={(year) => set({ year })}
          />
        </div>
      );
    case 'licence':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label="Licence or registration"
            value={fact.name}
            onChange={(name) => set({ name })}
            hint="e.g. Registered Professional Engineer of Queensland"
          />
          <TextInput label="Issued by" value={fact.issuer} onChange={(issuer) => set({ issuer })} />
          <TextInput label="Number" value={fact.number} onChange={(number) => set({ number })} />
        </div>
      );
  }
}

/** Name and facts: the only things that go into the declaration. */
export function FactsForm({
  initialName,
  initialFacts,
  canExtract,
  locked,
}: {
  initialName: string;
  initialFacts: FactDraft[];
  canExtract: boolean;
  locked: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [facts, setFacts] = useState<FactDraft[]>(initialFacts);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [cv, setCv] = useState('');
  const [reading, setReading] = useState(false);

  const save = async () => {
    setBusy(true);
    setErrors([]);
    setNote(null);
    try {
      const result = await saveDeclarationFactsAction({ name, facts });
      if (result.ok) {
        setNote('Saved. Your statements are below.');
        router.refresh();
      } else {
        setErrors(result.errors ?? [result.error ?? 'That did not save.']);
      }
    } catch {
      setErrors(['That did not save. Reload and try again.']);
    } finally {
      setBusy(false);
    }
  };

  const readCv = async () => {
    setReading(true);
    setErrors([]);
    setNote(null);
    try {
      const result = await extractFactsAction(cv);
      if (result.ok) {
        if (result.facts.length === 0) setNote('No facts found in that text.');
        else {
          setFacts(result.facts.slice(0, 12));
          setNote(
            `Found ${result.facts.length}. Check every field against your records — you are the one declaring them.`
          );
        }
      } else setErrors([result.error]);
    } catch {
      setErrors(['Could not read the CV just now.']);
    } finally {
      setReading(false);
    }
  };

  if (locked) return null;

  return (
    <div className="grid gap-4">
      <TextInput
        label="Your full name"
        value={name}
        onChange={setName}
        hint="Exactly as it appears on your Digital ID — myGov puts that name on the declaration."
      />

      {canExtract ? (
        <details className="rounded-2xl border border-border p-3">
          <summary
            className="cursor-pointer text-sm font-semibold"
            style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}
          >
            Fill from my CV
          </summary>
          <div className="mt-2 grid gap-2">
            <p className="m-0 text-sm text-text-secondary">
              Paste your CV&apos;s experience and education. AI lists the facts it finds into the
              form below; it never writes your declaration, and you check every field.
            </p>
            <textarea
              value={cv}
              onChange={(e) => setCv(e.target.value)}
              rows={6}
              className={`${INPUT} py-2`}
              aria-label="CV text"
            />
            <div>
              <button
                type="button"
                onClick={readCv}
                disabled={reading || cv.trim().length < 40}
                className={BUTTON}
                style={{ minHeight: 44 }}
              >
                {reading ? 'Reading…' : 'Find the facts'}
              </button>
            </div>
          </div>
        </details>
      ) : null}

      <ol className="m-0 grid list-none gap-3 p-0">
        {facts.map((fact, i) => (
          <li key={i} className="grid gap-3 rounded-2xl border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="m-0 text-sm font-semibold">
                {i + 1}. {KIND_LABEL[fact.kind]}
              </p>
              <button
                type="button"
                onClick={() => setFacts(facts.filter((_, j) => j !== i))}
                className={BUTTON}
                style={{ minHeight: 44 }}
              >
                Remove
              </button>
            </div>
            {fact.check ? (
              <p role="note" className="m-0 rounded-xl bg-surface-secondary p-3 text-sm">
                Check this one first: part of it was not in your CV word for word, so it may have
                been misread.
              </p>
            ) : null}
            <FactFields
              fact={fact}
              onChange={(next) =>
                setFacts(facts.map((f, j) => (j === i ? { ...next, check: false } : f)))
              }
            />
          </li>
        ))}
      </ol>

      {facts.length < 12 ? (
        <div className="flex flex-wrap gap-2">
          {(['employment', 'education', 'licence'] as Kind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setFacts([...facts, blankFact(kind)])}
              className={BUTTON}
              style={{ minHeight: 44 }}
            >
              Add {KIND_LABEL[kind].toLowerCase()}
            </button>
          ))}
        </div>
      ) : null}

      {errors.length ? (
        <ul
          role="alert"
          className="m-0 grid gap-1 rounded-2xl border border-border bg-surface-secondary p-3 pl-8 text-sm"
        >
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      {note ? (
        <p role="status" className="m-0 text-sm text-text-secondary">
          {note}
        </p>
      ) : null}

      <div>
        <button
          type="button"
          onClick={save}
          disabled={busy || facts.length === 0}
          className={PRIMARY}
          style={{ minHeight: 44 }}
        >
          {busy ? 'Saving…' : 'Save facts'}
        </button>
      </div>
    </div>
  );
}

/** Copies the numbered statements, ready to paste into myGov. */
export function CopyStatements({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        });
      }}
      className={PRIMARY}
      style={{ minHeight: 44 }}
    >
      {copied ? 'Copied' : 'Copy statements'}
    </button>
  );
}

export function PdfUpload({ current }: { current: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set('file', file);
      const res = await fetch('/api/admin/declaration/pdf', { method: 'POST', body });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) setError(json.error ?? 'The upload did not go through.');
      else router.refresh();
    } catch {
      setError('The upload did not go through.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="grid gap-2">
      <label className="grid gap-1 text-sm">
        <span className="font-semibold">
          {current ? `Uploaded: ${current}` : 'The PDF from myGov'}
        </span>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
          className="text-sm"
          style={{ minHeight: 44 }}
        />
      </label>
      {busy ? (
        <p role="status" className="m-0 text-sm text-text-secondary">
          Uploading…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="m-0 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Confirm, then off to Stripe for the card hold. */
export function SubmitForCheck({
  priceLabel,
  disabled,
}: {
  priceLabel: string;
  disabled?: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await startCheckoutAction();
      if (result.ok) window.location.assign(result.url);
      else {
        setError(result.error);
        setBusy(false);
      }
    } catch {
      setError('The payment page could not be opened.');
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 h-5 w-5"
        />
        <span>
          I made this declaration myself in myGov, the PDF is the one myGov gave me, and every
          statement in it is true.
        </span>
      </label>
      <div>
        <button
          type="button"
          onClick={go}
          disabled={!confirmed || busy || disabled}
          className={PRIMARY}
          style={{ minHeight: 44 }}
        >
          {busy ? 'Opening payment…' : `Submit for checking — hold ${priceLabel}`}
        </button>
      </div>
      {error ? (
        <p role="alert" className="m-0 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Arm, then confirm — the inbox's delete pattern. */
function Confirming({
  label,
  question,
  confirmLabel,
  run,
}: {
  label: string;
  question: string;
  confirmLabel: string;
  run: () => Promise<unknown>;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className={BUTTON}
        style={{ minHeight: 44 }}
      >
        {label}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span role="alert" className="text-sm text-text-secondary">
        {question}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          run()
            .then(() => router.refresh())
            .finally(() => {
              setBusy(false);
              setArmed(false);
            });
        }}
        className="rounded-full bg-danger px-4 text-sm font-semibold text-bg disabled:opacity-50"
        style={{ minHeight: 44 }}
      >
        {busy ? 'Working…' : confirmLabel}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setArmed(false)}
        className={BUTTON}
        style={{ minHeight: 44 }}
      >
        Keep
      </button>
    </span>
  );
}

export function DiscardDraft() {
  return (
    <Confirming
      label="Start over"
      question="Delete these facts and any uploaded PDF?"
      confirmLabel="Delete draft"
      run={discardDeclarationAction}
    />
  );
}

export function WithdrawBadge() {
  return (
    <Confirming
      label="Take the badge down"
      question="Remove the badge and the declared facts from your portfolio?"
      confirmLabel="Take it down"
      run={withdrawDeclarationAction}
    />
  );
}
