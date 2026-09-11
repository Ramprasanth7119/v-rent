"use client";

/**
 * Hub tool card and its detail panel.
 *
 * Every tool in the catalogue opens a working screen, so the card's job is to
 * get you there in one click. The second question — what does this actually do,
 * and what does it depend on — is answered by a panel behind a small button in
 * the corner rather than by making the whole card a detour.
 *
 * The link is stretched over the card with a pseudo-element rather than the
 * card being a `<Link>`, because a button inside an anchor is invalid markup
 * and browsers disagree about which one a click belongs to.
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
        <div className="flex items-center gap-1.5">
          {tool.badge && <Pill tone={live ? 'accent' : 'neutral'} className="mt-0.5">{tool.badge}</Pill>}
          {/* Above the stretched link, so this button wins the click. */}
          <button
            type="button"
            onClick={() => onOpenDetail(tool)}
            aria-label={`What ${tool.name} does`}
            className="relative z-10 -mr-1 -mt-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-p1-text-3 transition-colors hover:bg-p1-subtle hover:text-p1-text"
          >
            <Info size={15} />
          </button>
        </div>
      </div>
      <div className="mt-3.5 font-p1display text-[15.5px] font-bold leading-5 tracking-[-0.01em] text-p1-text">{tool.name}</div>
      <p className="mt-1 text-[13.5px] leading-5 text-p1-text-2">{tool.blurb}</p>
    </>
  );

  if (live && tool.href) {
    return (
      <div className={cx(CARD_BASE, 'shadow-p1-sm ring-1 ring-p1-border transition-transform hover:-translate-y-1 hover:shadow-p1-md hover:ring-p1-primary/30')}>
        {body}
        <Link
          href={tool.href}
          className="mt-auto flex items-center gap-1.5 pt-4 text-[13px] font-medium text-p1-primary after:absolute after:inset-0 after:content-[''] focus-visible:outline-none dark:text-p1-info"
        >
          Open
          <ArrowRight size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className={cx(CARD_BASE, 'border border-dashed border-p1-border bg-p1-surface/50')}>
      {body}
      <button
        type="button"
        onClick={() => onOpenDetail(tool)}
        className="mt-auto flex cursor-pointer items-center gap-1.5 pt-4 text-[13px] font-medium text-p1-text-3 after:absolute after:inset-0 after:content-['']"
      >
        <Info size={13} aria-hidden />
        What this will do
      </button>
    </div>
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
          <>
            <Button variant="outline" onClick={onClose}>Close</Button>
            <LinkButton href={tool.href} rightIcon={<ArrowUpRight size={16} />}>Open it</LinkButton>
          </>
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

          {tool.needs && (
            <div className="rounded-lg border border-p1-border bg-p1-subtle/60 px-4 py-3.5">
              <div className="flex items-center gap-2 text-[13.5px] font-semibold text-p1-text">
                <Clock size={14} aria-hidden />
                {live ? 'What it depends on' : 'Not in this prototype'}
              </div>
              <p className="mt-1 text-[13.5px] leading-6 text-p1-text-2">{tool.needs}</p>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
