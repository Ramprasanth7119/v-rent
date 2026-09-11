/**
 * The public page behind a share link.
 *
 * An agent sends this to a client before the tenant site exists, so it renders
 * for anybody — no session, no account. What it will not do is leak anything
 * the agent has not published: the store returns only published and paused
 * listings, and everything else is a plain not-found rather than a hint that
 * something is there.
 *
 * The URL carries the owning account because listing references are only unique
 * within a workspace. Production would issue a short per-listing token instead,
 * which is also what lets an agent revoke a link they have already sent.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShieldCheck, Pause, Mail, Phone } from 'lucide-react';
import { PublicPreview } from '../../../../../components/phase1/listing/PublicPreview';
import { EnquiryForm } from '../../../../../components/phase1/listing/EnquiryForm';
import { findPublicListing } from '../../../../../lib/phase1/workspace-store';
import { preferredName } from '../../../../../lib/phase1/workspace';
import { listingPhotos } from '../../../../../lib/phase1/photos';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ owner: string; id: string }> }) {
  const { owner, id } = await params;
  const found = await findPublicListing(owner, id);
  if (!found) return { title: 'Listing not available — V-RENT' };
  const { listing } = found;
  const deal = listing.dealType === 'sale' ? 'for sale' : 'for rent';
  const price = listing.dealType === 'sale'
    ? `S$${(listing.salePriceSgd ?? 0).toLocaleString('en-SG')}`
    : `S$${listing.monthlyRent.toLocaleString('en-SG')} per month`;

  // The card WhatsApp draws when the link is pasted. Without an image it is a
  // line of grey text, and the scope calls the WhatsApp preview the reason this
  // page is worth having on day one.
  const cover = (listing.photos ?? [])[0];
  const image = cover
    ? `/api/phase1/photos/${owner}/${id}/${cover}`
    : listing.lat !== undefined && listing.lng !== undefined
      ? `/api/phase1/map?lat=${listing.lat}&lng=${listing.lng}&w=512&h=268`
      : undefined;

  const title = `${listing.bedrooms} bedroom ${listing.propertyType} ${deal} in ${listing.project}`;
  const description = `${listing.unitNo} ${listing.address}, Singapore ${listing.postalCode}. ${price}.`;

  return {
    title: `${title} — V-RENT`,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'V-RENT',
      images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SharedListingPage({ params }: { params: Promise<{ owner: string; id: string }> }) {
  const { owner, id } = await params;
  const found = await findPublicListing(owner, id);
  if (!found) notFound();

  const { listing, agent } = found;
  const paused = listing.status === 'paused';

  return (
    <div className="p1 min-h-screen bg-p1-bg font-p1sans">
      <header className="sticky top-0 z-10 border-b border-p1-border bg-p1-surface/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1040px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/phase1" className="flex items-center gap-2.5" aria-label="V-RENT">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-p1-primary font-p1display text-[19px] font-semibold text-white">V</span>
            <span className="font-p1display text-[16px] font-bold tracking-[-0.02em] text-p1-text">V-RENT</span>
          </Link>
          <span className="text-[12.5px] text-p1-text-3">Shared by a CEA-registered agent</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1040px] px-4 py-6 sm:px-6 sm:py-8">
        {paused && (
          <div role="status" className="mb-5 flex items-start gap-3 rounded-lg border border-p1-warning-border bg-p1-warning-soft px-4 py-3">
            <Pause size={17} className="mt-0.5 shrink-0 text-p1-warning" aria-hidden />
            <div className="text-p1-text">
              <div className="text-[14px] font-semibold leading-5">This unit is off the market for now</div>
              <div className="mt-0.5 text-[13.5px] leading-5 text-p1-text-2">
                The agent has paused it. The details below are the last published version — ask them whether it is
                coming back.
              </div>
            </div>
          </div>
        )}

        <PublicPreview listing={listing} agent={agent} chrome={false} photos={listingPhotos(owner, listing)} />

        {!paused && (
          <EnquiryForm
            className="mt-5"
            ownerId={owner}
            listingId={listing.id}
            agentName={preferredName(agent.fullName) || 'the agent'}
          />
        )}

        {/* The compliance block Singapore advertising rules require. */}
        <section className="mt-5 rounded-2xl bg-p1-surface p-6 shadow-p1-sm ring-1 ring-p1-border">
          <h2 className="flex items-center gap-2 font-p1display text-[17px] font-bold tracking-[-0.012em] text-p1-text">
            <ShieldCheck size={17} className="text-p1-success" aria-hidden />
            Who is advertising this
          </h2>
          <p className="mt-2.5 text-[14.5px] leading-6 text-p1-text">
            {agent.fullName || preferredName(agent.fullName)} · {agent.ceaNumber} · {agent.agency}
            {agent.agencyLicence && ` (${agent.agencyLicence})`}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-p1-text-2">
            {agent.mobile && <span className="inline-flex items-center gap-2"><Phone size={14} className="text-p1-text-3" aria-hidden />{agent.mobile}</span>}
            {agent.email && <span className="inline-flex items-center gap-2 break-all"><Mail size={14} className="text-p1-text-3" aria-hidden />{agent.email}</span>}
          </div>
          <p className="mt-3 text-[13px] leading-5 text-p1-text-3">
            Registration checked against the Council for Estate Agencies public register. Verify it yourself at
            cea.gov.sg using the registration number above.
          </p>
        </section>

        <p className="mt-6 text-center text-[12.5px] leading-5 text-p1-text-3">
          Listing {listing.reference} on V-RENT. Are you an agent?{' '}
          <Link href="/phase1" className="font-medium text-p1-primary hover:underline underline-offset-4 dark:text-p1-info">See what V-RENT does</Link>.
        </p>
      </main>
    </div>
  );
}
