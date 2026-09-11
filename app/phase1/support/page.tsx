"use client";

/**
 * Support.
 *
 * The screen exists for the moment the product is in somebody's way, which is
 * the worst moment to be asked to describe your problem into an empty box. So
 * it does three things in order: offer the answer if the question is one of the
 * handful that are asked constantly, carry the account context automatically so
 * nobody has to type their CEA number to a person who can already see it, and
 * state a real response time.
 */

import { useMemo, useState } from 'react';
import {
  LifeBuoy, Send, Check, Clock, MessageSquare, Phone, Mail, ChevronDown, BookOpen, Info,
} from 'lucide-react';
import {
  Button, Card, SectionCard, PageHeader, Callout, MetricStrip, Metric, EmptyState,
  TextInput, TextArea, SelectInput, LinkButton, cx,
} from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { useDemo, TODAY, preferredName } from '../../../lib/phase1/DemoContext';
import { SUPPORT_AREAS } from '../../../lib/phase1/learn';
import { toolsId, type SupportTicket } from '../../../lib/phase1/tools';

const COMMON: { q: string; a: string; href?: string; linkLabel?: string }[] = [
  {
    q: 'My CEA number is not being accepted',
    a: 'The number is checked live against the public CEA register. If it comes back unknown, the register does not have it under that spelling — check for a transposed digit, and check the letter at the end. A registration that has lapsed will also fail, and only CEA can restore that.',
    href: '/phase1/verify',
    linkLabel: 'Check a registration',
  },
  {
    q: 'My listing will not publish',
    a: 'Publishing is gated on four things: a verified account, an active subscription, quota available on your plan, and the required fields complete. The listing manager lists which of the four is stopping you, with a link to the screen that fixes it.',
    href: '/phase1/listings',
    linkLabel: 'Listing manager',
  },
  {
    q: 'A photograph will not upload',
    a: 'Photographs are checked for resolution before they are accepted — anything under 1,000 pixels wide is rejected because it looks worse than no photograph on a listing page. HEIC files from an iPhone are converted; RAW files are not supported.',
  },
  {
    q: 'I was charged and my plan did not change',
    a: 'A payment that was taken but did not apply is a reconciliation problem on our side, not something to fix by paying again. Open a ticket with the date and we will find it against your account.',
    href: '/phase1/checkout',
    linkLabel: 'Subscription and receipts',
  },
  {
    q: 'How do I stop a featured run early?',
    a: 'Featured placement lists every run with a Stop button. Stopping ends the placement immediately and bills only the days used, not the days committed.',
    href: '/phase1/featured',
    linkLabel: 'Featured placement',
  },
];

/** What the team commits to, by how much the problem is costing the agent. */
const URGENCY = [
  { value: 'blocked', label: 'I cannot work — something is broken', sla: 'within 2 hours, business days' },
  { value: 'problem', label: 'Something is wrong but I have a way round it', sla: 'same working day' },
  { value: 'question', label: 'A question about how something works', sla: 'within one working day' },
];

export default function SupportPage() {
  const { state, setTools } = useDemo();
  const tickets = state.tools.tickets;

  const [area, setArea] = useState(SUPPORT_AREAS[0]);
  const [urgency, setUrgency] = useState('problem');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState('');
  const [openQ, setOpenQ] = useState('');

  const openTickets = tickets.filter((t) => t.status === 'open');

  const sla = useMemo(() => URGENCY.find((u) => u.value === urgency)!.sla, [urgency]);

  const submit = () => {
    if (!subject.trim() || !body.trim()) return;
    const ticket: SupportTicket = {
      id: toolsId('tkt'),
      area,
      subject: subject.trim(),
      body: body.trim(),
      at: new Date().toISOString(),
      status: 'open',
    };
    setTools({ tickets: [ticket, ...tickets] });
    setSent(ticket.id);
    setSubject('');
    setBody('');
    setTimeout(() => setSent(''), 6000);
  };

  return (
    <>
      <PageHeader
        eyebrow="Learn and get help"
        title="Support"
        description="Reach a person when the product is in your way. Your account, registration and plan come with the message, so nobody asks you to repeat them."
        actions={<LinkButton href="/phase1/learn" variant="outline" leftIcon={<BookOpen size={16} />}>Getting started guides</LinkButton>}
      />

      <MetricStrip className="mb-6" cols={3}>
        <Metric label="Open tickets" value={openTickets.length} hint={openTickets.length ? 'Somebody is on it' : 'Nothing outstanding'} icon={<MessageSquare size={15} />} tone={openTickets.length ? 'warning' : 'success'} />
        <Metric label="Support hours" value="9–7" hint="Monday to Saturday, Singapore time" icon={<Clock size={15} />} />
        <Metric label="Your plan" value={state.plan?.name ?? 'None'} hint={state.plan ? 'Support included' : 'Support is included on every plan'} icon={<LifeBuoy size={15} />} />
      </MetricStrip>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-6 [&>*]:min-w-0">
          <SectionCard
            title="The questions we are asked most"
            description="Answered here, because waiting for a reply to one of these is a waste of your morning."
            icon={<Info size={16} />}
            padding="none"
          >
            <ul className="divide-y divide-p1-border">
              {COMMON.map((c) => {
                const on = openQ === c.q;
                return (
                  <li key={c.q}>
                    <button
                      type="button"
                      onClick={() => setOpenQ(on ? '' : c.q)}
                      aria-expanded={on}
                      className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-p1-subtle/50"
                    >
                      <span className="text-[14.5px] font-medium text-p1-text">{c.q}</span>
                      <ChevronDown size={17} aria-hidden className={cx('shrink-0 text-p1-text-3 transition-transform', on && 'rotate-180')} />
                    </button>
                    {on && (
                      <div className="border-t border-p1-border bg-p1-subtle/40 px-5 py-4">
                        <p className="max-w-[68ch] text-[13.5px] leading-6 text-p1-text-2">{c.a}</p>
                        {c.href && (
                          <LinkButton href={c.href} size="sm" variant="outline" className="mt-3">
                            {c.linkLabel ?? 'Open it'}
                          </LinkButton>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </SectionCard>

          <SectionCard title="Open a ticket" icon={<Send size={16} />}>
            {sent && (
              <Callout tone="success" title="Ticket opened" className="mb-4">
                We have it, with your account and registration attached. You will hear back {sla.toLowerCase()}.
              </Callout>
            )}

            <div className="grid gap-4">
              <SelectInput
                label="What is this about"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                options={SUPPORT_AREAS.map((a) => ({ value: a, label: a }))}
              />

              <div>
                <span className="mb-2 block text-[13.5px] font-semibold text-p1-text">How much is it costing you</span>
                <div className="grid gap-2">
                  {URGENCY.map((u) => (
                    <button
                      key={u.value}
                      type="button"
                      onClick={() => setUrgency(u.value)}
                      aria-pressed={urgency === u.value}
                      className={cx(
                        'flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                        urgency === u.value
                          ? 'border-p1-primary bg-p1-primary-soft/50'
                          : 'border-p1-border hover:border-p1-border-strong',
                      )}
                    >
                      <span className="text-[13.5px] text-p1-text">{u.label}</span>
                      <span className="shrink-0 text-[12.5px] font-semibold text-p1-text-2">{u.sla}</span>
                    </button>
                  ))}
                </div>
              </div>

              <TextInput
                label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="One line — what went wrong"
              />
              <TextArea
                label="What happened"
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What you were doing, what you expected, what happened instead. A listing reference or a screenshot saves a round trip."
                hint="Your name, email, CEA registration and plan are attached automatically."
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[12.5px] text-p1-text-3">Reply {sla}.</p>
                <Button variant="primary" onClick={submit} disabled={!subject.trim() || !body.trim()} leftIcon={<Send size={16} />}>
                  Send it
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Your tickets" icon={<MessageSquare size={16} />} padding={tickets.length ? 'none' : 'md'}>
            {tickets.length === 0 ? (
              <EmptyState compact title="No tickets" description="Anything you open appears here with its reply." />
            ) : (
              <ul className="divide-y divide-p1-border">
                {tickets.map((t) => (
                  <li key={t.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[14.5px] font-semibold text-p1-text">{t.subject}</span>
                          <Pill tone={t.status === 'open' ? 'warning' : 'success'}>{t.status === 'open' ? 'Open' : 'Answered'}</Pill>
                        </div>
                        <div className="mt-0.5 text-[12.5px] text-p1-text-3">
                          {t.area} · opened {new Date(t.at).toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <p className="mt-1.5 max-w-[68ch] text-[13.5px] leading-5 text-p1-text-2">{t.body}</p>
                      </div>
                      <span className="font-mono text-[12px] text-p1-text-3">{t.id.slice(-6).toUpperCase()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <aside className="grid min-w-0 content-start gap-4 [&>*]:min-w-0">
          <Card className="border-transparent bg-p1-sidebar text-white" padding="lg">
            <div className="font-p1display text-[17px] font-bold text-white">Other ways through</div>
            <ul className="mt-3.5 space-y-3.5 text-[13.5px]">
              <li className="flex items-start gap-3">
                <Phone size={16} className="mt-0.5 shrink-0 text-p1-accent" aria-hidden />
                <span>
                  <span className="block font-semibold text-white">+65 6000 0000</span>
                  <span className="block text-white/60">Monday to Saturday, 9am to 7pm</span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={16} className="mt-0.5 shrink-0 text-p1-accent" aria-hidden />
                <span>
                  <span className="block font-semibold text-white">support@vrent.sg</span>
                  <span className="block text-white/60">Same queue as a ticket</span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MessageSquare size={16} className="mt-0.5 shrink-0 text-p1-accent" aria-hidden />
                <span>
                  <span className="block font-semibold text-white">WhatsApp</span>
                  <span className="block text-white/60">For a quick question during a viewing</span>
                </span>
              </li>
            </ul>
          </Card>

          <Card padding="md">
            <div className="text-[13px] font-semibold text-p1-text-3">Attached to anything you send</div>
            <dl className="mt-2.5 grid gap-1.5 text-[13px]">
              {[
                ['Name', preferredName(state.profile.fullName) || '—'],
                ['Email', state.profile.email || '—'],
                ['CEA registration', state.profile.ceaNumber || '—'],
                ['Agency', state.profile.agency || '—'],
                ['Plan', state.plan?.name ?? 'None'],
                ['Listings', String(state.listings.filter((l) => !l.archived).length)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3">
                  <dt className="text-p1-text-3">{k}</dt>
                  <dd className="min-w-0 truncate text-right font-medium text-p1-text">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 border-t border-p1-border pt-3 text-[12px] leading-5 text-p1-text-3">
              Sent so nobody has to ask you for it. Seen only by the support team, and only on tickets you open.
            </p>
          </Card>

          <Callout tone="info" title="Today">
            {TODAY.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' })} — the team is on
            and answering.
          </Callout>
        </aside>
      </div>
    </>
  );
}
