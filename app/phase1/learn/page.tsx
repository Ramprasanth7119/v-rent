"use client";

/**
 * Getting started guides.
 *
 * A guide that cannot send you to the screen it describes is a PDF with extra
 * steps, so every step here carries the link that performs it. Progress is
 * marked by the agent rather than inferred, because inferring it wrongly —
 * telling somebody they have finished something they have not — is worse than
 * asking.
 */

import { useState } from 'react';
import {
  BookOpen, Check, Clock, ArrowRight, ChevronDown, Video, LifeBuoy, Target,
} from 'lucide-react';
import {
  Button, Card, SectionCard, PageHeader, MetricStrip, Metric, ProgressBar,
  LinkButton, cx,
} from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { GUIDES } from '../../../lib/phase1/learn';

export default function LearnPage() {
  const { state, setTools } = useDemo();
  const done = state.tools.guidesDone;
  const [open, setOpen] = useState<string>(GUIDES[0].id);

  const toggleDone = (id: string) =>
    setTools({ guidesDone: done.includes(id) ? done.filter((g) => g !== id) : [...done, id] });

  const minutes = GUIDES.filter((g) => !done.includes(g.id)).reduce((n, g) => n + g.minutes, 0);
  const pct = Math.round((done.length / GUIDES.length) * 100);

  return (
    <>
      <PageHeader
        eyebrow="Learn and get help"
        title="Getting started guides"
        description="Five short sequences that cover everything from registration to keeping a portfolio visible. Each step links to the screen that does it."
        actions={
          <>
            <LinkButton href="/phase1/learn/sessions" variant="outline" leftIcon={<Video size={16} />}>Recorded sessions</LinkButton>
            <LinkButton href="/phase1/support" variant="outline" leftIcon={<LifeBuoy size={16} />}>Get help</LinkButton>
          </>
        }
      />

      <MetricStrip className="mb-6" cols={3}>
        <Metric label="Finished" value={`${done.length} of ${GUIDES.length}`} hint={pct ? `${pct}% through` : 'Start anywhere'} icon={<Check size={15} />} tone={pct === 100 ? 'success' : 'default'} />
        <Metric label="Left to read" value={minutes ? `${minutes} min` : 'Nothing'} hint="Across the guides you have not marked done" icon={<Clock size={15} />} />
        <Metric label="Guides" value={GUIDES.length} hint="Registration through to visibility" icon={<BookOpen size={15} />} />
      </MetricStrip>

      {done.length > 0 && done.length < GUIDES.length && (
        <ProgressBar value={pct} className="mb-6" label="Your progress" />
      )}

      <div className="grid gap-4">
        {GUIDES.map((g) => {
          const isOpen = open === g.id;
          const isDone = done.includes(g.id);
          return (
            <Card key={g.id} padding="none" className={cx('overflow-hidden', isDone && 'border-p1-success-border')}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? '' : g.id)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-p1-subtle/50"
              >
                <span
                  aria-hidden
                  className={cx(
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    isDone ? 'bg-p1-success text-white' : 'bg-p1-primary-soft text-p1-primary dark:text-p1-text',
                  )}
                >
                  {isDone ? <Check size={17} strokeWidth={3} /> : <BookOpen size={17} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-p1display text-[16.5px] font-bold text-p1-text">{g.title}</span>
                    <Pill tone="neutral">{g.minutes} min</Pill>
                    {isDone && <Pill tone="success">Done</Pill>}
                  </span>
                  <span className="mt-1 block text-[13.5px] leading-5 text-p1-text-2">{g.summary}</span>
                </span>
                <ChevronDown
                  size={18}
                  aria-hidden
                  className={cx('mt-1 shrink-0 text-p1-text-3 transition-transform', isOpen && 'rotate-180')}
                />
              </button>

              {isOpen && (
                <div className="border-t border-p1-border px-5 py-5">
                  <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-p1-subtle/70 px-4 py-3">
                    <Target size={15} className="mt-0.5 shrink-0 text-p1-primary dark:text-p1-info" aria-hidden />
                    <p className="text-[13.5px] leading-5 text-p1-text-2">
                      <strong className="text-p1-text">Afterwards:</strong> {g.outcome}
                    </p>
                  </div>

                  <ol className="grid gap-4">
                    {g.steps.map((s, i) => (
                      <li key={s.title} className="flex gap-4">
                        <span
                          aria-hidden
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-p1-border bg-p1-surface text-[12.5px] font-bold tabular-nums text-p1-text-2"
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[14.5px] font-semibold text-p1-text">{s.title}</div>
                          <p className="mt-1 max-w-[68ch] text-[13.5px] leading-6 text-p1-text-2">{s.body}</p>
                          {s.href && (
                            <LinkButton href={s.href} size="sm" variant="outline" className="mt-2.5" rightIcon={<ArrowRight size={14} />}>
                              {s.linkLabel ?? 'Open it'}
                            </LinkButton>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-p1-border pt-4">
                    <Button
                      variant={isDone ? 'outline' : 'primary'}
                      leftIcon={isDone ? undefined : <Check size={16} />}
                      onClick={() => toggleDone(g.id)}
                    >
                      {isDone ? 'Mark as not done' : 'Mark this guide done'}
                    </Button>
                    <span className="text-[12.5px] text-p1-text-3">Marked by you, not guessed from what you have clicked.</span>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <SectionCard title="Still stuck?" icon={<LifeBuoy size={16} />} className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-[60ch] text-[13.5px] leading-6 text-p1-text-2">
            A guide tells you the sequence. When the product itself is in the way — an upload that will not take, a
            verification that will not clear — that is a support matter and a person should look at it.
          </p>
          <LinkButton href="/phase1/support" variant="primary">Reach a person</LinkButton>
        </div>
      </SectionCard>
    </>
  );
}
