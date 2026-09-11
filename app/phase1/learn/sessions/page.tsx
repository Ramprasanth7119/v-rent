"use client";

/**
 * Product sessions.
 *
 * Recorded walkthroughs. The thing that makes a library of recordings usable
 * rather than decorative is the chapter list: nobody watches twenty-four
 * minutes to find the ninety seconds about the publish gate, so every session
 * is indexed and the index is what the screen shows.
 */

import { useState } from 'react';
import { Video, Clock, Play, Check, ListTree, BookOpen, LifeBuoy } from 'lucide-react';
import {
  Button, Card, SectionCard, PageHeader, Callout, MetricStrip, Metric, LinkButton, cx,
} from '../../../../components/phase1/kit';
import { Pill } from '../../../../components/phase1/status';
import { useDemo } from '../../../../lib/phase1/DemoContext';
import { SESSIONS } from '../../../../lib/phase1/learn';

export default function SessionsPage() {
  const { state, setTools } = useDemo();
  const watched = state.tools.sessionsWatched;
  const [selected, setSelected] = useState(SESSIONS[0].id);

  const session = SESSIONS.find((s) => s.id === selected)!;
  const isWatched = watched.includes(session.id);

  const toggle = (id: string) =>
    setTools({ sessionsWatched: watched.includes(id) ? watched.filter((s) => s !== id) : [...watched, id] });

  const totalMinutes = SESSIONS.reduce((n, s) => n + s.minutes, 0);

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Learn', href: '/phase1/learn' }, { label: 'Product sessions' }]}
        eyebrow="Learn and get help"
        title="Product sessions"
        description="Recorded walkthroughs of each part of the workspace, indexed by chapter so you can go straight to the ninety seconds you need."
        actions={
          <>
            <LinkButton href="/phase1/learn" variant="outline" leftIcon={<BookOpen size={16} />}>Written guides</LinkButton>
            <LinkButton href="/phase1/support" variant="outline" leftIcon={<LifeBuoy size={16} />}>Get help</LinkButton>
          </>
        }
      />

      <MetricStrip className="mb-6" cols={3}>
        <Metric label="Sessions" value={SESSIONS.length} hint={`${totalMinutes} minutes in total`} icon={<Video size={15} />} />
        <Metric label="Watched" value={`${watched.length} of ${SESSIONS.length}`} hint={watched.length ? 'Marked by you' : 'None yet'} icon={<Check size={15} />} tone={watched.length === SESSIONS.length ? 'success' : 'default'} />
        <Metric label="Chapters" value={SESSIONS.reduce((n, s) => n + s.chapters.length, 0)} hint="Every one is a jump point" icon={<ListTree size={15} />} />
      </MetricStrip>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <SectionCard title="Library" icon={<Video size={16} />} padding="none" className="self-start">
          <ul className="divide-y divide-p1-border">
            {SESSIONS.map((s) => {
              const active = s.id === selected;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(s.id)}
                    className={cx(
                      'w-full cursor-pointer px-4 py-3.5 text-left transition-colors',
                      active ? 'bg-p1-primary-soft/60' : 'hover:bg-p1-subtle/60',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 text-[14px] font-semibold text-p1-text">{s.title}</span>
                      {watched.includes(s.id) && <Check size={15} className="mt-0.5 shrink-0 text-p1-success" aria-hidden />}
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-p1-text-3">
                      {s.minutes} min · {s.chapters.length} chapters
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        <div className="grid min-w-0 gap-5 [&>*]:min-w-0">
          <Card padding="none" className="overflow-hidden">
            {/* The player frame. The recordings themselves are produced during
                the build, so this states what will sit here rather than
                pretending a video is loading. */}
            <div className="relative flex aspect-video w-full items-center justify-center bg-p1-sidebar">
              <div className="text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-p1-accent" aria-hidden>
                  <Play size={26} className="ml-1" />
                </span>
                <div className="mt-4 font-p1display text-[18px] font-bold text-white">{session.title}</div>
                <div className="mt-1 text-[13px] text-white/60">
                  {session.minutes} minutes · {session.presenter}
                </div>
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-p1display text-[18px] font-bold text-p1-text">{session.title}</h2>
                  <p className="mt-1 max-w-[64ch] text-[13.5px] leading-6 text-p1-text-2">{session.summary}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Pill tone="neutral">
                      Recorded {new Date(session.recorded).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Pill>
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-p1-text-3">
                      <Clock size={13} aria-hidden />
                      {session.minutes} minutes
                    </span>
                  </div>
                </div>
                <Button
                  variant={isWatched ? 'outline' : 'primary'}
                  leftIcon={isWatched ? undefined : <Check size={16} />}
                  onClick={() => toggle(session.id)}
                >
                  {isWatched ? 'Mark unwatched' : 'Mark watched'}
                </Button>
              </div>
            </div>
          </Card>

          <SectionCard title="Chapters" description="Jump straight to the part you need." icon={<ListTree size={16} />} padding="none">
            <ol className="divide-y divide-p1-border">
              {session.chapters.map((c) => (
                <li key={c.at} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-[54px] shrink-0 font-mono text-[13px] tabular-nums text-p1-primary dark:text-p1-info">{c.at}</span>
                  <span className="min-w-0 flex-1 text-[14px] text-p1-text">{c.title}</span>
                  <Play size={14} className="shrink-0 text-p1-text-3" aria-hidden />
                </li>
              ))}
            </ol>
          </SectionCard>

          <Callout tone="info" title="What is real here">
            The library, the chapter index and your progress are working and stored against your workspace. The
            recordings are produced during the build — a walkthrough of a product that is still being assembled would
            be out of date before anyone watched it.
          </Callout>
        </div>
      </div>
    </>
  );
}
