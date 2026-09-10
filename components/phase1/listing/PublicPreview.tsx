"use client";

/**
 * The tenant-facing listing, rendered from the same record the agent edits.
 * Used by the detail page, the wizard's preview step, and moderation.
 */

import React from 'react';
import { Bed, Bath, Maximize, Sofa, CalendarDays, TrainFront, ShieldCheck, MessageSquare, Phone, Bookmark, Share2, MapPin, Clock } from 'lucide-react';
import { DemoListing, sgd } from '../../../lib/phase1/data';
import { DEAL_LABEL, dealOf, priceLabel, psf } from '../../../lib/phase1/pricing';
import { AgentProfile, preferredName } from '../../../lib/phase1/DemoContext';
import { districtName } from '../../../lib/phase1/performance';
import { Gallery, PropertyImage } from '../PropertyImage';
import { PropertyMap } from './PropertyMap';
import { Avatar, Button, cx } from '../kit';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });

export function PublicPreview({
  listing, agent, compact = false, className = '', chrome = true, photos = [],
}: {
  listing: DemoListing; agent: AgentProfile; compact?: boolean; className?: string;
  /** The "preview" strip. On the real public page there is nothing to preview. */
  chrome?: boolean;
  /** The listing's own photographs. Generated artwork stands in when empty. */
  photos?: string[];
}) {
  const l = listing;
  const deal = dealOf(l);
  const title = `${l.bedrooms} bedroom ${l.propertyType === 'HDB' ? 'HDB flat' : l.propertyType.toLowerCase()} ${deal === 'sale' ? 'for sale' : 'for rent'} in ${l.project}`;
  const facts = [
    { icon: Bed, v: `${l.bedrooms} bed` }, { icon: Bath, v: `${l.bathrooms} bath` }, { icon: Maximize, v: `${l.sizeSqft.toLocaleString()} sqft` },
    { icon: Sofa, v: l.furnishing }, { icon: CalendarDays, v: `From ${fmtDate(l.availableFrom)}` },
    ...(l.nearestMrt ? [{ icon: TrainFront, v: l.nearestMrt }] : []),
  ];
  const seed = l.reference + l.project;

  return (
    <div className={cx('overflow-hidden rounded-xl border border-p1-border bg-p1-surface text-p1-text', className)}>
      {/* Marketplace chrome, so the agent reads this as "what the tenant sees" */}
      {chrome && (
        <div className="flex items-center justify-between border-b border-p1-border bg-p1-subtle/60 px-4 py-2 text-[12px] text-p1-text-3">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-p1-success" aria-hidden /> Public listing preview</span>
          <span className="tabular-nums">Listing {l.reference}</span>
        </div>
      )}

      <div className="p-4 sm:p-5">
        {compact ? (
          <PropertyImage seed={seed} variant={0} rounded="rounded-lg" className="aspect-[16/9] w-full" src={photos[0]} alt="" />
        ) : (
          <Gallery seed={seed} count={Math.max(1, l.images)} srcs={photos} />
        )}

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={cx('font-p1display font-medium leading-tight text-p1-text text-balance', compact ? 'text-[18px]' : 'text-[22px]')}>{title}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-[13.5px] text-p1-text-2"><MapPin size={14} className="shrink-0 text-p1-text-3" aria-hidden />{l.address}, Singapore {l.postalCode} · D{String(l.district).padStart(2, '0')} {districtName(l.district)}</p>
          </div>
          <div className="text-right">
            <div className={cx('font-semibold tabular-nums text-p1-text', compact ? 'text-[20px]' : 'text-[26px]')}>{priceLabel(l).amount}<span className="text-[13px] font-normal text-p1-text-3">{priceLabel(l).suffix && ` ${priceLabel(l).suffix}`}</span></div>
            <div className="text-[12.5px] text-p1-text-3">{psf(l)}{deal === 'rent' && ` · min ${l.minLeaseMonths} months`}</div>
          </div>
        </div>

        <PropertyMap className="mt-4" lat={l.lat} lng={l.lng} label={l.address} height={compact ? 150 : 220} />


        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13.5px] text-p1-text">
          {facts.map((f) => <li key={f.v} className="inline-flex items-center gap-1.5"><f.icon size={14} className="text-p1-text-3" aria-hidden />{f.v}</li>)}
        </ul>

        {!compact && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" leftIcon={<Bookmark size={14} />}>Save</Button>
            <Button variant="ghost" size="sm" leftIcon={<Share2 size={14} />}>Share</Button>
          </div>
        )}

        <div className={cx('mt-5 grid gap-5', !compact && 'lg:grid-cols-[minmax(0,1fr)_280px]')}>
          <div className="min-w-0">
            <h4 className="text-[14px] font-semibold text-p1-text">About this property</h4>
            <p className="mt-1.5 whitespace-pre-line text-[14.5px] leading-7 text-p1-text">{l.description || <span className="text-p1-text-3">No description yet.</span>}</p>

            {(l.amenities?.length ?? 0) > 0 && (
              <>
                <h4 className="mt-5 text-[14px] font-semibold text-p1-text">Amenities</h4>
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13.5px] text-p1-text-2 sm:grid-cols-3">
                  {l.amenities!.map((a) => <li key={a} className="flex items-start gap-1.5"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-p1-primary dark:bg-p1-info" aria-hidden />{a}</li>)}
                </ul>
              </>
            )}

            <h4 className="mt-5 text-[14px] font-semibold text-p1-text">Details</h4>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-[13.5px] sm:grid-cols-3">
              {[
                ['Property type', l.propertyType], ['Unit', l.unitNo], ['Floor area', `${l.sizeSqft.toLocaleString()} sqft`],
                ['Furnishing', l.furnishing], ['Minimum lease', `${l.minLeaseMonths} months`], ['Deposit', typeof l.depositMonths === 'number' ? `${l.depositMonths} month${l.depositMonths === 1 ? '' : 's'}` : 'On request'],
              ].map(([k, v]) => <div key={k}><dt className="text-p1-text-3">{k}</dt><dd className="font-medium text-p1-text">{v}</dd></div>)}
            </dl>
          </div>

          <aside className="h-fit rounded-xl border border-p1-border bg-p1-bg p-4">
            <div className="flex items-center gap-3">
              <Avatar name={preferredName(agent.fullName) || 'Agent'} size="lg" />
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold text-p1-text">{preferredName(agent.fullName)}</div>
                <div className="truncate text-[12.5px] text-p1-text-2">{agent.agency}</div>
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-p1-success-soft px-2 py-0.5 text-[11.5px] font-semibold text-p1-success"><ShieldCheck size={11} aria-hidden /> CEA verified</div>
              </div>
            </div>
            <dl className="mt-3 space-y-1 text-[12px] text-p1-text-3">
              <div className="flex justify-between gap-2"><dt>CEA reg. no.</dt><dd className="font-mono text-p1-text-2">{agent.ceaNumber}</dd></div>
              <div className="flex justify-between gap-2"><dt>Agency licence</dt><dd className="font-mono text-p1-text-2">{agent.agencyLicence}</dd></div>
              <div className="flex items-center gap-1"><Clock size={11} aria-hidden /> Usually replies within 2 hours</div>
            </dl>
            <div className="mt-4 grid gap-2">
              <Button variant="primary" block leftIcon={<MessageSquare size={15} />}>Enquire</Button>
              <Button variant="outline" block leftIcon={<Phone size={15} />}>Call agent</Button>
            </div>
            <p className="mt-3 text-[11.5px] leading-4 text-p1-text-3">Enquiries go through V-RENT. Your number is shared only when you choose.</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
