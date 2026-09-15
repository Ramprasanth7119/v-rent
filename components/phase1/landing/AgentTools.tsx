"use client";

/**
 * What an agent gets, by the part of their week it serves.
 *
 * Six tiles rather than twenty-seven cards: the categories are the argument,
 * and the individual tools are one click away in a drawer for the agent who
 * wants to check that a particular one exists.
 */

import { useState } from 'react';
import { ArrowRight, Check, Clock } from 'lucide-react';
import { HUB_CATEGORIES, type HubCategory } from '../../../lib/phase1/hub';
import { Drawer } from '../overlays';
import { Button, LinkButton, cx } from '../kit';

export function AgentTools() {
  const [open, setOpen] = useState<HubCategory | null>(null);

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {HUB_CATEGORIES.map((c) => {
          const live = c.tools.filter((t) => t.status === 'live').length;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setOpen(c)}
                className="group flex h-full w-full cursor-pointer items-start gap-4 rounded-xl border border-p1-border bg-p1-surface p-4 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-p1-border-strong hover:shadow-p1-md"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-p1-primary-soft text-p1-primary transition-colors duration-200 group-hover:bg-p1-primary group-hover:text-p1-primary-on" aria-hidden>
                  <c.icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[15px] font-semibold text-p1-text">{c.title}</span>
                    <span className="shrink-0 text-[12px] tabular-nums text-p1-text-3">{live} {live === 1 ? 'tool' : 'tools'}</span>
                  </span>
                  <span className="mt-1 block text-[13px] leading-5 text-p1-text-3">{c.tagline}</span>
                  <span className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-medium text-p1-primary">
                    See what is included <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.title ?? ''}
        description={open?.tagline}
        footer={<>
          <Button variant="outline" onClick={() => setOpen(null)}>Close</Button>
          <LinkButton href="/phase1/signup" rightIcon={<ArrowRight size={16} />}>Create an agent account</LinkButton>
        </>}
      >
        {open && (
          <ul className="divide-y divide-p1-border">
            {open.tools.map((t) => {
              const live = t.status === 'live';
              return (
                <li key={t.id} className="flex items-start gap-3 py-3.5">
                  <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', live ? 'bg-p1-primary-soft text-p1-primary' : 'bg-p1-subtle text-p1-text-3')} aria-hidden>
                    <t.icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[14.5px] font-semibold text-p1-text">{t.name}</span>
                      {live
                        ? <span className="inline-flex items-center gap-1 text-[12px] font-medium text-p1-success"><Check size={12} aria-hidden /> Available</span>
                        : <span className="inline-flex items-center gap-1 text-[12px] font-medium text-p1-text-3"><Clock size={12} aria-hidden /> Planned</span>}
                    </span>
                    <span className="mt-0.5 block text-[13.5px] leading-5 text-p1-text-2">{t.blurb}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Drawer>
    </>
  );
}
