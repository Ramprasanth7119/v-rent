"use client";

/**
 * Create an agent account.
 *
 * Registration comes before the account on purpose. The CEA check is the one
 * thing that can disqualify an applicant, it is instant, and seeing your own
 * name and agency come back from the public register is what makes the platform
 * feel like it already knows the industry. Filling in a password first and
 * being rejected afterwards is the worse order.
 *
 * Three short steps rather than one long form: the register, how to reach you,
 * a password. Each asks for only what the signup route requires. When the route
 * refuses something, its error code decides which step the applicant is taken
 * back to, so the message always sits beside the field it is about.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, BadgeCheck, Building2, CalendarClock, Check, IdCard, Loader2, RotateCcw, Search,
} from 'lucide-react';
import { AuthShell } from '../../../components/phase1/auth/AuthShell';
import {
  AuthFeedback, AuthHeader, AuthProgress, AuthStep, AuthSubmit, EMAIL_RE, authLink, type SubmitStatus,
} from '../../../components/phase1/auth/parts';
import { Button, Checkbox, PasswordInput, PhoneNumberInput, TextInput, cx } from '../../../components/phase1/kit';
import { useToast } from '../../../components/phase1/Toast';
import { sgDate, sgTime } from '../../../lib/phase1/format';
import { sgMobileProblem } from '../../../lib/phase1/mobile';

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

type Step = 1 | 2 | 3;
const STEPS = ['CEA registration', 'Contact details', 'Password'];

/** The same list `passwordProblem` refuses on the server. */
const COMMON = ['password1234', 'qwertyuiop12', '123456789012'];

const fmt = (iso: string) =>
  iso ? sgDate(iso) : '—';

const secondaryLink =
  'inline-flex cursor-pointer items-center gap-1.5 rounded text-[13.5px] font-medium text-p1-text-2 underline-offset-4 hover:text-p1-text hover:underline disabled:pointer-events-none disabled:opacity-50';

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
  const { push } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [dir, setDir] = useState<'fwd' | 'back' | 'none'>('none');
  const go = (to: Step) => {
    setDir(to > step ? 'fwd' : 'back');
    setStep(to);
  };

  /* ------------------------------------------------------- step 1: the register */
  const prefill = (params.get('cea') ?? '').trim().toUpperCase();
  const [cea, setCea] = useState(prefill);
  const [checking, setChecking] = useState(false);
  const [ceaError, setCeaError] = useState('');
  const [verified, setVerified] = useState<Verified | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

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

  /* The record is the question "is this you?", so the answer takes focus. */
  useEffect(() => {
    if (verified && step === 1) confirmRef.current?.focus({ preventScroll: false });
  }, [verified, step]);

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

  /* ------------------------------------------------------ step 2: contact */
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [contactTried, setContactTried] = useState(false);
  const [emailServerError, setEmailServerError] = useState<{ text: string; taken: boolean } | null>(null);
  const [mobileServerError, setMobileServerError] = useState('');

  const emailOk = EMAIL_RE.test(email.trim());
  /* The same rule the signup route enforces, so the form cannot offer to
     submit something the server will refuse. */
  const mobileProblem = sgMobileProblem(mobile);
  const mobileOk = mobileProblem === null;
  const emailError = emailServerError?.text
    ?? ((contactTried || email) && !emailOk ? (email ? 'Enter a valid email address.' : 'Enter your work email address.') : undefined);
  const mobileError = mobileServerError
    || ((contactTried || mobile) && mobileProblem ? mobileProblem : undefined);

  const toPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setContactTried(true);
    if (!emailOk || !mobileOk || emailServerError || mobileServerError) return;
    setEmail(email.trim());
    go(3);
  };

  /* ------------------------------------------------------ step 3: password */
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [finalTried, setFinalTried] = useState(false);
  const [passwordServerError, setPasswordServerError] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [formError, setFormError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const rules = [
    { label: 'At least 12 characters', ok: password.length >= 12 },
    { label: 'Not only numbers', ok: password.length > 0 && !/^\d+$/.test(password) },
    { label: 'Not a commonly used password', ok: password.length >= 12 && !COMMON.includes(password.toLowerCase()) },
  ];
  const passwordOk = rules.every((r) => r.ok);

  const refuse = (text: string) => {
    setFormError(text);
    setAttempt((n) => n + 1);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'idle' || !verified) return;
    setFinalTried(true);
    if (!passwordOk || !agreed) return;
    setStatus('loading');
    setFormError('');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, mobile, registrationNo: verified.record.registrationNo }),
      });
      const body = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) {
        setStatus('idle');
        const text = body.error ?? 'The account could not be created. Try again.';
        /* Back to the step that owns the field, with the message on the field. */
        switch (body.code) {
          case 'email_taken':
          case 'bad_email':
            /* The way out is offered as links under the field, so the message need not say it too. */
            setEmailServerError(body.code === 'email_taken'
              ? { text: 'An account with this email address already exists.', taken: true }
              : { text, taken: false });
            go(2);
            return;
          case 'bad_mobile':
            setMobileServerError(text);
            go(2);
            return;
          case 'weak_password':
            setPasswordServerError(text);
            return;
          case 'cea_not_found':
          case 'cea_taken':
            setVerified(null);
            setCeaError(text);
            go(1);
            return;
          default:
            refuse(text);
            return;
        }
      }
      setStatus('success');
      push({
        tone: 'success',
        title: 'Account created',
        body: 'Your CEA registration was matched. Your application is with a verification officer.',
      });
      router.replace('/phase1/dashboard');
      router.refresh();
    } catch {
      setStatus('idle');
      refuse('Could not reach V-RENT. Check your connection and try again — nothing has been saved yet.');
    }
  };

  /* ------------------------------------------------------------------ render */

  const credential = verified
    ? {
      name: verified.display.name,
      agency: verified.display.agency,
      registrationNo: verified.record.registrationNo,
      agencyLicenceNo: verified.record.agencyLicenceNo,
    }
    : null;

  const header = {
    1: { title: 'Create your agent account', subtitle: 'Start with your CEA registration. We check it against the public register straight away.' },
    2: { title: 'How can we reach you?', subtitle: 'You’ll sign in with this email address.' },
    3: { title: 'Secure your account', subtitle: 'One password, and you’re in.' },
  }[step];

  /** The applicant, carried through steps 2 and 3 so they can see whose account this is. */
  const whoChip = verified && (
    <div className="flex items-center gap-3 rounded-xl border border-p1-border bg-p1-subtle/70 py-2 pl-3 pr-2">
      <BadgeCheck size={18} className="shrink-0 text-p1-success" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold text-p1-text">{verified.display.name}</div>
        <div className="truncate text-[12.5px] text-p1-text-2">
          {verified.record.registrationNo} · {verified.display.agency}
        </div>
      </div>
      <button
        type="button"
        onClick={() => go(1)}
        className="shrink-0 cursor-pointer rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-p1-primary hover:bg-p1-primary-soft"
      >
        Change<span className="sr-only"> CEA registration</span>
      </button>
    </div>
  );

  return (
    <AuthShell
      scene="signup"
      credential={credential}
      aside={
        <span>
          Have an account?{' '}
          <Link href="/phase1/login" className={authLink}>Sign in</Link>
        </span>
      }
    >
      <div className="p1-auth-stagger">
        <AuthProgress step={step} labels={STEPS} />
        <div className="grid gap-7">
          <AuthHeader title={header.title} subtitle={header.subtitle} />

          {step === 1 && (
            <AuthStep key="s1" dir={dir} className="grid gap-5">
              {!byName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (cea.trim().length >= 8) void verify(cea);
                  }}
                  className="grid gap-4"
                  noValidate
                >
                  <TextInput
                    label="CEA registration number"
                    required
                    autoFocus={!verified}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="e.g. R012345A"
                    value={cea}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      setCea(value);
                      setCeaError('');
                      /* A different number is a different person: the record shown no longer answers it. */
                      if (verified && value.trim() !== verified.record.registrationNo) setVerified(null);
                    }}
                    leftIcon={<IdCard size={16} />}
                    hint="Printed on your CEA card and shown on your agency profile."
                    error={ceaError || undefined}
                    className="font-mono tracking-[0.06em]"
                    containerClassName="p1-auth-field"
                    maxLength={9}
                  />
                  {!verified && (
                    <div className="grid gap-3">
                      <AuthSubmit status={checking ? 'loading' : 'idle'} busyLabel="Checking the register…" disabled={cea.trim().length < 8}>
                        Check the register
                      </AuthSubmit>
                      <button
                        type="button"
                        onClick={() => { setByName(true); setCeaError(''); }}
                        className={cx(secondaryLink, 'justify-center py-1')}
                      >
                        <Search size={14} aria-hidden /> I don’t know my number
                      </button>
                    </div>
                  )}
                </form>
              ) : (
                <div className="grid gap-4">
                  <TextInput
                    label="Your name as it appears on the register"
                    autoFocus
                    autoComplete="name"
                    placeholder="e.g. Jeremy Wang"
                    value={nameTerm}
                    onChange={(e) => setNameTerm(e.target.value)}
                    leftIcon={<Search size={16} />}
                    hint="Searches the public CEA register. Choose yourself from the results."
                    containerClassName="p1-auth-field"
                  />
                  <div aria-live="polite" className="grid gap-3 empty:hidden">
                    {searching && (
                      <p className="flex items-center gap-2 text-[13px] text-p1-text-3">
                        <Loader2 size={14} className="animate-spin" aria-hidden /> Searching the register…
                      </p>
                    )}
                    {termReady && nameResults && nameResults.length === 0 && !searching && (
                      <p className="text-[13.5px] text-p1-text-2">No salesperson on the active register matches that name.</p>
                    )}
                  </div>
                  {termReady && nameResults && nameResults.length > 0 && (
                    <ul className="p1-auth-in max-h-[300px] divide-y divide-p1-border overflow-y-auto rounded-xl border border-p1-border">
                      {nameResults.map((r) => (
                        <li key={r.record.registrationNo}>
                          <button
                            type="button"
                            onClick={() => { setCea(r.record.registrationNo); setByName(false); void verify(r.record.registrationNo); }}
                            className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-p1-subtle focus-visible:bg-p1-subtle focus-visible:outline-none"
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
                    className={cx(secondaryLink, 'justify-center py-1')}
                  >
                    <ArrowLeft size={14} aria-hidden /> Enter my registration number instead
                  </button>
                </div>
              )}

              {verified && (
                <div className="p1-auth-in overflow-hidden rounded-2xl border border-p1-success-border bg-p1-surface shadow-p1-md" role="status">
                  <div className="flex items-center gap-2 border-b border-p1-success-border/70 bg-p1-success-soft px-4 py-2.5">
                    <span className="p1-auth-pop flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-p1-success text-p1-primary-on" aria-hidden>
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span className="text-[13.5px] font-semibold text-p1-success">Found on the CEA register</span>
                    <span className="ml-auto text-[12px] text-p1-text-3">Checked {sgTime(verified.checkedAt)}</span>
                  </div>
                  <div className="px-4 py-4">
                    <div className="text-[19px] font-semibold leading-tight text-p1-text">{verified.display.name}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-[13.5px] text-p1-text-2">
                      <Building2 size={14} className="shrink-0 text-p1-text-3" aria-hidden />
                      <span className="min-w-0 truncate">{verified.display.agency}</span>
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
                    <p className={cx('mt-3 flex flex-wrap items-center gap-x-1.5 text-[13px]', verified.display.expiringSoon ? 'text-p1-warning' : 'text-p1-text-2')}>
                      <CalendarClock size={14} className="shrink-0" aria-hidden />
                      Valid until {fmt(verified.record.registrationEnd)}
                      {typeof verified.display.daysUntilExpiry === 'number' && (
                        <span className="text-p1-text-3">· {verified.display.daysUntilExpiry} days remaining</span>
                      )}
                    </p>
                  </div>
                  <div className="grid gap-2 border-t border-p1-border px-4 py-4">
                    <Button ref={confirmRef} variant="primary" size="lg" block className="p1-auth-cta" onClick={() => go(2)}>
                      Yes, this is me
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setVerified(null); setCea(''); }}
                      className={cx(secondaryLink, 'justify-center py-1.5')}
                    >
                      <RotateCcw size={14} aria-hidden /> Not me — check another number
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[12.5px] leading-5 text-p1-text-3">
                The Council for Estate Agencies publishes the register, and it lists only salespersons who are currently
                registered. Nothing is stored until you create the account.
              </p>
            </AuthStep>
          )}

          {step === 2 && (
            <AuthStep key="s2" dir={dir}>
              <form onSubmit={toPassword} className="grid gap-5" noValidate>
                {whoChip}
                <TextInput
                  label="Work email address"
                  type="email"
                  name="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                  required
                  placeholder="name@agency.com.sg"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailServerError(null); }}
                  error={emailError}
                  containerClassName="p1-auth-field"
                  rightSlot={emailOk && !emailServerError ? (
                    <span className="p1-auth-pop flex h-5 w-5 items-center justify-center rounded-full bg-p1-success-soft text-p1-success" aria-hidden>
                      <Check size={12} strokeWidth={3} />
                    </span>
                  ) : undefined}
                />
                {emailServerError?.taken && (
                  <p className="-mt-3 text-[13px] text-p1-text-2">
                    <Link href="/phase1/login" className={authLink}>Sign in instead</Link>
                    {' '}or{' '}
                    <Link href={`/phase1/forgot?email=${encodeURIComponent(email)}`} className={authLink}>reset your password</Link>.
                  </p>
                )}
                <PhoneNumberInput
                  label="Mobile number"
                  required
                  value={mobile}
                  onChange={(v) => { setMobile(v); setMobileServerError(''); }}
                  error={mobileError}
                  hint="For listing alerts and account recovery."
                />
                <AuthSubmit>Continue</AuthSubmit>
                <button type="button" onClick={() => go(1)} className={cx(secondaryLink, 'justify-center py-1')}>
                  <ArrowLeft size={14} aria-hidden /> Back
                </button>
              </form>
            </AuthStep>
          )}

          {step === 3 && (
            <AuthStep key="s3" dir={dir}>
              <form onSubmit={submit} className="grid gap-5" noValidate>
                {/* For password managers: the account this password is saved against. */}
                <input type="email" name="username" autoComplete="username" value={email} readOnly tabIndex={-1} aria-hidden className="sr-only" />
                {whoChip}

                {formError && (
                  <AuthFeedback key={attempt} tone="danger">{formError}</AuthFeedback>
                )}

                <div>
                  <PasswordInput
                    label="Password"
                    name="new-password"
                    required
                    autoFocus
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordServerError(''); }}
                    error={passwordServerError || (finalTried && !passwordOk ? 'Choose a password that meets all three rules below.' : undefined)}
                    containerClassName="p1-auth-field"
                  />
                  <ul className="mt-3 grid gap-1.5" aria-label="Password rules">
                    {rules.map((r) => (
                      <li key={r.label} className={cx('flex items-center gap-2 text-[13px] transition-colors duration-200', r.ok ? 'text-p1-success' : 'text-p1-text-3')}>
                        <span
                          className={cx(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
                            r.ok ? 'bg-p1-success text-p1-primary-on' : 'border border-dashed border-p1-border-strong',
                          )}
                          aria-hidden
                        >
                          {r.ok && <Check size={10} strokeWidth={3.5} className="p1-auth-pop" />}
                        </span>
                        {r.label}
                        <span className="sr-only">{r.ok ? ' — met' : ' — not met yet'}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <Checkbox
                    label="I confirm I am the registered salesperson shown above"
                    hint="Your CEA details go on every listing you publish, as Singapore’s property advertising rules require."
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  {finalTried && !agreed && (
                    <p className="mt-1.5 pl-8 text-[13px] text-p1-danger" role="alert">Confirm this to create the account.</p>
                  )}
                </div>

                <AuthSubmit status={status} busyLabel="Creating your account…" doneLabel="Account created">
                  Create account
                </AuthSubmit>
                <button type="button" onClick={() => go(2)} className={cx(secondaryLink, 'justify-center py-1')} disabled={status !== 'idle'}>
                  <ArrowLeft size={14} aria-hidden /> Back
                </button>
              </form>
            </AuthStep>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
