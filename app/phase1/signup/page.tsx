"use client";

/**
 * Create an agent account.
 *
 * Registration comes before the account on purpose. The CEA check is the one
 * thing that can disqualify an applicant, it is instant, and seeing your own
 * name and agency come back from the public register is what makes the platform
 * feel like it already knows the industry. Filling in a password first and
 * being rejected afterwards is the worse order.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout } from '../../../components/phase1/auth/AuthLayout';
import { Button, TextInput, Callout, Checkbox, cx } from '../../../components/phase1/kit';
import {
  ArrowRight, ArrowLeft, BadgeCheck, Search, Building2, CalendarClock, Check, IdCard, Loader2, RotateCcw,
} from 'lucide-react';
import { useToast } from '../../../components/phase1/Toast';
import { sgDate, sgTime } from '../../../lib/phase1/format';

interface CeaRecord {
  name: string;
  registrationNo: string;
  registrationStart: string;
  registrationEnd: string;
  agencyName: string;
  agencyLicenceNo: string;
}
interface CeaDisplay {
  name: string;
  agency: string;
  daysUntilExpiry?: number | null;
  expiringSoon?: boolean;
}
interface Verified {
  record: CeaRecord;
  display: CeaDisplay;
  checkedAt: string;
}

const fmt = (iso: string) =>
  iso ? sgDate(iso) : '—';

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupBody />
    </Suspense>
  );
}

function SignupBody() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<1 | 2>(1);

  /* ------------------------------------------------------- step 1: the register */
  const prefill = (params.get('cea') ?? '').trim().toUpperCase();
  const [cea, setCea] = useState(prefill);
  const [checking, setChecking] = useState(false);
  const [ceaError, setCeaError] = useState('');
  const [verified, setVerified] = useState<Verified | null>(null);

  const [byName, setByName] = useState(false);
  const [nameTerm, setNameTerm] = useState('');
  const [nameResults, setNameResults] = useState<{ record: CeaRecord; display: CeaDisplay }[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  const verify = useCallback(async (registration: string) => {
    setChecking(true);
    setCeaError('');
    setVerified(null);
    try {
      const res = await fetch(`/api/cea/lookup?registration=${encodeURIComponent(registration.trim())}`);
      const body = await res.json();
      if (!res.ok) {
        setCeaError(body.error ?? 'The register could not be reached. Try again in a moment.');
        return;
      }
      if (body.status === 'not_found') {
        setCeaError(
          `${registration.trim().toUpperCase()} is not on the active CEA register. Check the number, or search by your name instead.`,
        );
        return;
      }
      setVerified({ record: body.record, display: body.display, checkedAt: body.checkedAt });
    } catch {
      setCeaError('Could not reach the register. Check your connection and try again.');
    } finally {
      setChecking(false);
    }
  }, []);

  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current || prefill.length < 8) return;
    autoRan.current = true;
    void verify(prefill);
  }, [prefill, verify]);

  // Name search is a shortlist to choose from — the register's text search is fuzzy.
  // Everything runs inside the debounce timer, so a keystroke never sets state
  // during render and short terms simply do not search.
  const termReady = byName && nameTerm.trim().length >= 3;
  useEffect(() => {
    if (!termReady) return;
    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/cea/lookup?name=${encodeURIComponent(nameTerm.trim())}`);
        const body = await res.json();
        if (seq === searchSeq.current) setNameResults(body.results ?? []);
      } catch {
        if (seq === searchSeq.current) setNameResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [termReady, nameTerm]);

  /* ------------------------------------------------------ step 2: the account */
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToast();
  const [formError, setFormError] = useState('');

  const rules = [
    { label: 'At least 12 characters', ok: password.length >= 12 },
    { label: 'Not only numbers', ok: password.length > 0 && !/^\d+$/.test(password) },
    { label: 'Not a commonly used password', ok: password.length >= 12 && !['password1234', 'qwertyuiop12'].includes(password.toLowerCase()) },
  ];
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const mobileOk = /^\+?[0-9 ]{8,16}$/.test(mobile);
  const canSubmit = rules.every((r) => r.ok) && emailOk && mobileOk && agreed && !!verified;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !verified) return;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, mobile, registrationNo: verified.record.registrationNo }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFormError(body.error ?? 'The account could not be created. Try again.');
        return;
      }
      push({
        tone: 'success',
        title: 'Account created',
        body: 'Your CEA registration was matched. Your application is with a verification officer.',
      });
      router.replace('/phase1/dashboard');
      router.refresh();
    } catch {
      setFormError('Could not reach the server. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------ render */

  return (
    <AuthLayout
      wide
      title={step === 1 ? 'Verify your CEA registration' : 'Create your account'}
      subtitle={
        step === 1
          ? 'Every V-RENT account is tied to a salesperson on the public CEA register. We check it now, so your listings are compliant from the first one.'
          : 'Your registration is confirmed. These are the details you will sign in with.'
      }
      footer={
        <span>
          Already have an account?{' '}
          <Link href="/phase1/login" className="font-semibold text-p1-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <ol className="mb-7 flex items-center gap-3 text-[13px]" aria-label="Progress">
        {[
          { n: 1, label: 'CEA registration' },
          { n: 2, label: 'Account details' },
        ].map((s, i) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <li key={s.n} className="flex items-center gap-3">
              <span className="flex items-center gap-2">
                <span
                  className={cx(
                    'flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold',
                    done ? 'bg-p1-success text-white' : active ? 'bg-p1-primary text-white' : 'bg-p1-subtle text-p1-text-3',
                  )}
                  aria-hidden
                >
                  {done ? <Check size={13} strokeWidth={3} /> : s.n}
                </span>
                <span className={cx(active || done ? 'font-medium text-p1-text' : 'text-p1-text-3')}>{s.label}</span>
              </span>
              {i === 0 && <span className="h-px w-8 bg-p1-border" aria-hidden />}
            </li>
          );
        })}
      </ol>

      {step === 1 ? (
        <div className="grid gap-5">
          {!byName ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (cea.trim()) void verify(cea);
              }}
              className="grid gap-4"
            >
              <TextInput
                label="CEA registration number"
                required
                autoFocus
                placeholder="R062805D"
                value={cea}
                onChange={(e) => setCea(e.target.value.toUpperCase())}
                leftIcon={<IdCard size={16} />}
                hint="Printed on your CEA card, and shown on your agency profile."
                error={ceaError || undefined}
                className="font-mono tracking-[0.06em]"
                maxLength={9}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" variant="primary" size="lg" loading={checking} disabled={cea.trim().length < 8} rightIcon={<ArrowRight size={16} />}>
                  Check the register
                </Button>
                <button
                  type="button"
                  onClick={() => { setByName(true); setCeaError(''); }}
                  className="cursor-pointer text-[13.5px] text-p1-text-2 underline-offset-4 hover:text-p1-text hover:underline"
                >
                  I don&apos;t know my number
                </button>
              </div>
            </form>
          ) : (
            <div className="grid gap-4">
              <TextInput
                label="Your name as it appears on the register"
                autoFocus
                placeholder="e.g. Jeremy Wang"
                value={nameTerm}
                onChange={(e) => setNameTerm(e.target.value)}
                leftIcon={<Search size={16} />}
                hint="Searches the public CEA register. Choose yourself from the results."
              />
              {searching && (
                <p className="flex items-center gap-2 text-[13px] text-p1-text-3">
                  <Loader2 size={14} className="animate-spin" aria-hidden /> Searching the register…
                </p>
              )}
              {termReady && nameResults && nameResults.length === 0 && !searching && (
                <p className="text-[13.5px] text-p1-text-2">No salesperson on the active register matches that name.</p>
              )}
              {termReady && nameResults && nameResults.length > 0 && (
                <ul className="divide-y divide-p1-border overflow-hidden rounded-lg border border-p1-border">
                  {nameResults.map((r) => (
                    <li key={r.record.registrationNo}>
                      <button
                        type="button"
                        onClick={() => { setCea(r.record.registrationNo); setByName(false); void verify(r.record.registrationNo); }}
                        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-p1-subtle"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-p1-text">{r.display.name}</span>
                          <span className="block truncate text-[12.5px] text-p1-text-2">{r.display.agency}</span>
                        </span>
                        <span className="shrink-0 font-mono text-[12.5px] text-p1-text-3">{r.record.registrationNo}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => { setByName(false); setNameResults(null); }}
                className="flex cursor-pointer items-center gap-1.5 text-[13.5px] text-p1-text-2 underline-offset-4 hover:text-p1-text hover:underline"
              >
                <ArrowLeft size={14} aria-hidden /> Enter my registration number instead
              </button>
            </div>
          )}

          {verified && (
            <div className="overflow-hidden rounded-xl border border-p1-success-border bg-p1-success-soft">
              <div className="flex items-center gap-2 border-b border-p1-success-border/70 px-4 py-2.5">
                <BadgeCheck size={17} className="shrink-0 text-p1-success" aria-hidden />
                <span className="text-[13.5px] font-semibold text-p1-success">Found on the CEA register</span>
                <span className="ml-auto text-[12px] text-p1-text-3">
                  Checked {sgTime(verified.checkedAt)}
                </span>
              </div>
              <div className="bg-p1-surface px-4 py-4">
                <div className="text-[19px] font-semibold leading-tight text-p1-text">{verified.display.name}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[13.5px] text-p1-text-2">
                  <Building2 size={14} className="shrink-0 text-p1-text-3" aria-hidden />
                  {verified.display.agency}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-p1-border pt-4 text-[13px] sm:grid-cols-3">
                  <div>
                    <dt className="text-p1-text-3">Registration no.</dt>
                    <dd className="mt-0.5 font-mono font-medium text-p1-text">{verified.record.registrationNo}</dd>
                  </div>
                  <div>
                    <dt className="text-p1-text-3">Agency licence</dt>
                    <dd className="mt-0.5 font-mono font-medium text-p1-text">{verified.record.agencyLicenceNo}</dd>
                  </div>
                  <div>
                    <dt className="text-p1-text-3">Registered since</dt>
                    <dd className="mt-0.5 font-medium text-p1-text">{fmt(verified.record.registrationStart)}</dd>
                  </div>
                </dl>
                <p className={cx('mt-3 flex items-center gap-1.5 text-[13px]', verified.display.expiringSoon ? 'text-p1-warning' : 'text-p1-text-2')}>
                  <CalendarClock size={14} className="shrink-0" aria-hidden />
                  Valid until {fmt(verified.record.registrationEnd)}
                  {typeof verified.display.daysUntilExpiry === 'number' && (
                    <span className="text-p1-text-3">· {verified.display.daysUntilExpiry} days remaining</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-p1-border bg-p1-surface px-4 pb-4">
                <Button variant="primary" size="lg" className="mt-4" onClick={() => setStep(2)} rightIcon={<ArrowRight size={16} />}>
                  Yes, this is me
                </Button>
                <button
                  type="button"
                  onClick={() => { setVerified(null); setCea(''); }}
                  className="mt-4 flex cursor-pointer items-center gap-1.5 text-[13.5px] text-p1-text-2 underline-offset-4 hover:text-p1-text hover:underline"
                >
                  <RotateCcw size={14} aria-hidden /> Not me, check another number
                </button>
              </div>
            </div>
          )}

          <p className="border-t border-p1-border pt-5 text-[13px] leading-6 text-p1-text-3">
            The register is published by the Council for Estate Agencies and lists currently registered salespersons only.
            A number that is not found is either mistyped or no longer registered. Nothing is stored until you create the
            account.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-5" noValidate>
          {formError && <Callout tone="danger" compact>{formError}</Callout>}

          {verified && (
            <div className="flex items-center gap-3 rounded-lg border border-p1-border bg-p1-subtle/60 px-3.5 py-3">
              <BadgeCheck size={18} className="shrink-0 text-p1-success" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-p1-text">{verified.display.name}</div>
                <div className="truncate text-[12.5px] text-p1-text-2">
                  {verified.record.registrationNo} · {verified.display.agency}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="shrink-0 cursor-pointer text-[13px] text-p1-text-2 underline-offset-4 hover:text-p1-text hover:underline"
              >
                Change
              </button>
            </div>
          )}

          <TextInput
            label="Work email address"
            type="email"
            required
            autoComplete="email"
            autoFocus
            placeholder="you@agency.com.sg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={email && !emailOk ? 'Enter a valid email address.' : undefined}
            hint="You will sign in with this address."
          />

          <TextInput
            label="Mobile number"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+65 9123 4567"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            error={mobile && !mobileOk ? 'Enter a valid Singapore mobile number.' : undefined}
            hint="Used for listing alerts and account recovery."
          />

          <div>
            <TextInput
              label="Password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <ul className="mt-2.5 grid gap-1.5">
              {rules.map((r) => (
                <li key={r.label} className={cx('flex items-center gap-2 text-[12.5px]', r.ok ? 'text-p1-success' : 'text-p1-text-3')}>
                  <span
                    className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded-full', r.ok ? 'bg-p1-success-soft' : 'border border-dashed border-p1-border-strong')}
                    aria-hidden
                  >
                    {r.ok && <Check size={10} strokeWidth={3} />}
                  </span>
                  {r.label}
                </li>
              ))}
            </ul>
          </div>

          <Checkbox
            label="I confirm I am the registered salesperson shown above"
            hint="Your CEA details are carried onto every listing you publish, as required for property advertising in Singapore."
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" size="lg" loading={submitting} disabled={!canSubmit} rightIcon={<ArrowRight size={16} />}>
              Create account
            </Button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex cursor-pointer items-center gap-1.5 text-[13.5px] text-p1-text-2 underline-offset-4 hover:text-p1-text hover:underline"
            >
              <ArrowLeft size={14} aria-hidden /> Back
            </button>
          </div>

          <p className="border-t border-p1-border pt-5 text-[13px] leading-6 text-p1-text-3">
            Email and mobile confirmation, and an administrator review of new agents, are part of the full build. In this
            proof of concept the account is active as soon as the register confirms your registration.
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
