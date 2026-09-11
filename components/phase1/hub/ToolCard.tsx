"use client";

/**
 * Hub tool card and its detail panel.
 *
 * A card is one of two things and looks like it: a working tool, which opens,
 * or a tool scheduled for the production build, which explains itself instead
 * of dead-ending. The difference is carried by the footer text and a border,
 * never by colour alone.
 */

import Link from 'next/link';
import { ArrowRight, Check, Clock, Info, ArrowUpRight } from 'lucide-react';
import { HubTool } from '../../../lib/phase1/hub';
import { Drawer } from '../overlays';
import { LinkButton, Button, cx } from '../kit';
import { Pill } from '../status';

function IconTile({ tool, size = 'md' }: { tool: HubTool; size?: 'md' | 'lg' }) {
  const Icon = tool.icon;
  const live = tool.status === 'live';
  return (
    <span
      aria-hidden
      className={cx(
        'flex shrink-0 items-center justify-center rounded-xl transition-colors duration-150',
        size === 'lg' ? 'h-12 w-12' : 'h-11 w-11',
        live
          ? 'bg-p1-primary-soft text-p1-primary group-hover:bg-p1-primary group-hover:text-white dark:text-p1-text'
          : 'bg-p1-subtle text-p1-text-3',
      )}
    >
      <Icon size={size === 'lg' ? 22 : 19} />
    </span>
  );
}

const CARD_BASE =
  'group relative flex h-full flex-col overflow-hidden rounded-xl bg-p1-surface p-4 text-left transition-[box-shadow,transform,background-color] duration-200';

export function ToolCard({ tool, onOpenDetail }: { tool: HubTool; onOpenDetail: (t: HubTool) => void }) {
  const live = tool.status === 'live';

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <IconTile tool={tool} />
        {tool.badge && (
          <Pill tone={live ? 'accent' : 'neutral'} className="mt-0.5">
            {tool.badge}
          </Pill>
        )}
      </div>
      <div className="mt-3.5 font-p1display text-[15.5px] font-bold leading-5 tracking-[-0.01em] text-p1-text">{tool.name}</div>
      <p className="mt-1 text-[13.5px] leading-5 text-p1-text-2">{tool.blurb}</p>
      <span
        className={cx(
          'mt-auto flex items-center gap-1.5 pt-4 text-[13px] font-medium',
          live ? 'text-p1-primary dark:text-p1-info' : 'text-p1-text-3',
        )}
      >
        {live ? (
          <>
            Open
            <ArrowRight size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
          </>
        ) : (
          <>
            <Info size={13} aria-hidden />
            What this will do
          </>
        )}
      </span>
    </>
  );

  if (live && tool.href) {
    return (
      <Link
        href={tool.href}
        className={cx(CARD_BASE, 'shadow-p1-sm ring-1 ring-p1-border hover:-translate-y-1 hover:shadow-p1-md hover:ring-p1-primary/30')}
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenDetail(tool)}
      className={cx(CARD_BASE, 'cursor-pointer border border-dashed border-p1-border bg-p1-surface/50 hover:-translate-y-0.5 hover:border-p1-border-strong hover:bg-p1-surface')}
    >
      {body}
    </button>
  );
}

export function ToolDetail({ tool, onClose }: { tool: HubTool | null; onClose: () => void }) {
  const live = tool?.status === 'live';
  return (
    <Drawer
      open={Boolean(tool)}
      onClose={onClose}
      title={tool?.name ?? ''}
      description={tool?.blurb}
      width="md"
      footer={
        tool && live && tool.href ? (
          <LinkButton href={tool.href} rightIcon={<ArrowUpRight size={16} />}>Open it</LinkButton>
        ) : (
          <Button variant="outline" onClick={onClose}>Close</Button>
        )
      }
    >
      {tool && (
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <IconTile tool={tool} size="lg" />
            <p className="text-[14.5px] leading-6 text-p1-text-2">{tool.detail}</p>
          </div>

          <div>
            <h3 className="text-[13px] font-semibold text-p1-text-3">What it does</h3>
            <ul className="mt-2.5 space-y-2">
              {tool.points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[14px] leading-6 text-p1-text">
                  <Check size={15} className="mt-1 shrink-0 text-p1-success" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {!live && (
            <div className="rounded-lg border border-p1-border bg-p1-subtle/60 px-4 py-3.5">
              <div className="flex items-center gap-2 text-[13.5px] font-semibold text-p1-text">
                <Clock size={14} aria-hidden />
                Not in this prototype
              </div>
              <p className="mt-1 text-[13.5px] leading-6 text-p1-text-2">
                The screen is designed but not wired up here. It is part of the production implementation and is
                costed in the build estimate.
              </p>
              {tool.needs && <p className="mt-2 text-[13.5px] leading-6 text-p1-text-3">{tool.needs}</p>}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
