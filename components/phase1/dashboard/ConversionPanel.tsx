"use client";

/**
 * How interest converts.
 *
 * This began as a funnel and stopped being one, because a funnel drawn to
 * scale says the wrong thing: nine in ten people who look at a flat online do
 * not save it, which is ordinary, and a chart that paints that fall in red
 * tells an agent to fix something that is not broken. What is worth knowing is
 * the step-through — of the people who looked, how many kept it, and of those,
 * how many wrote — so those two rates are the chart and the counts sit above
 * them as context.
 *
 * Viewings are counted from the diary rather than modelled, so they are kept
 * out of the rates and stated separately as the real number they are.
 */

import React from 'react';
import { Bookmark, CalendarCheck, Eye, Info, MessageSquare } from 'lucide-react';
import { Card, Tooltip, cx } from '../kit';
import { CardHead, IconTile, TileTone } from './parts';

function Count({ icon, tone, label, value }: { icon: React.ReactNode; tone: TileTone; label: string; value: number }) {
  return (
    <div className="bg-p1-surface px-4 py-3.5">
      <IconTile tone={tone} size="sm">{icon}</IconTile>
      <div className="mt-2.5 font-p1display text-[22px] font-bold leading-none tabular-nums text-p1-text">
        {Math.round(value).toLocaleString('en-SG')}
      </div>
      <div className="mt-1.5 text-[12px] text-p1-text-3">{label}</div>
    </div>
  );
}

function Rate({ label, of, pct, tone }: { label: string; of: string; pct: number; tone: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-p1-text-2">{label}</span>
        <span className="font-p1display text-[15px] font-bold tabular-nums text-p1-text">{pct.toFixed(1)}%</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-p1-subtle">
        <div className={cx('vr-grow h-full rounded-full', tone)} style={{ width: `${Math.min(100, Math.max(1.5, pct))}%` }} />
      </div>
      <p className="mt-1 text-[11.5px] text-p1-text-3">{of}</p>
    </div>
  );
}

export function ConversionPanel({
  views, saves, enquiries, viewings, hasSlots,
}: {
  views: number; saves: number; enquiries: number; viewings: number;
  /** Whether the agent publishes viewing slots at all. */
  hasSlots: boolean;
}) {
  const saveRate = views ? (saves / views) * 100 : 0;
  const enquiryRate = saves ? (enquiries / saves) * 100 : 0;

  return (
    <Card padding="none" as="section" aria-labelledby="conv-h" className="overflow-hidden">
      <div className="p-5 pb-4">
        <CardHead id="conv-h" title="How interest converts" sub="Last 30 days, across the portfolio">
          <Tooltip content="Views, saves and enquiries are modelled from each listing until the tenant site has recorded its own traffic.">
            <span tabIndex={0} className="inline-flex items-center gap-1 rounded-md bg-p1-subtle px-1.5 py-0.5 text-[11px] font-medium text-p1-text-3">
              <Info size={10.5} aria-hidden /> Modelled
            </span>
          </Tooltip>
        </CardHead>
      </div>

      <div className="grid grid-cols-3 gap-px border-y border-p1-border bg-p1-border">
        <Count icon={<Eye size={14} />} tone="primary" label="Views" value={views} />
        <Count icon={<Bookmark size={14} />} tone="accent" label="Saves" value={saves} />
        <Count icon={<MessageSquare size={14} />} tone="success" label="Enquiries" value={enquiries} />
      </div>

      <div className="space-y-4 p-5">
        <Rate
          label="Views that became a save"
          of={`${Math.round(saves).toLocaleString('en-SG')} of ${Math.round(views).toLocaleString('en-SG')} views`}
          pct={saveRate}
          tone="bg-p1-accent"
        />
        <Rate
          label="Saves that became an enquiry"
          of={`${Math.round(enquiries).toLocaleString('en-SG')} of ${Math.round(saves).toLocaleString('en-SG')} saves`}
          pct={enquiryRate}
          tone="bg-p1-success"
        />
      </div>

      <div className="flex items-start gap-2.5 border-t border-p1-border bg-p1-subtle/40 px-5 py-3.5">
        <IconTile tone={viewings ? 'success' : 'neutral'} size="sm"><CalendarCheck size={14} /></IconTile>
        <p className="text-[12.5px] leading-[1.45] text-p1-text-2">
          <span className="font-semibold text-p1-text">
            {viewings === 0 ? 'No viewings' : viewings === 1 ? '1 viewing' : `${viewings} viewings`}
          </span>
          {' '}booked in the same 30 days.{' '}
          <span className="text-p1-text-3">
            {hasSlots ? 'Counted from your diary, not modelled.' : 'You have not published any viewing slots yet, so nothing can be booked.'}
          </span>
        </p>
      </div>
    </Card>
  );
}
