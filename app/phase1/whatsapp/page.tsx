"use client";

/**
 * WhatsApp handover.
 *
 * Singapore tenants move to WhatsApp within one message, and the enquiry record
 * is usually lost at that moment — the agent replies from their phone and the
 * platform never hears about it again. The fix is not to fight the move but to
 * carry the record across it: compose the first message here, open WhatsApp
 * with it already written, and mark the enquiry replied on the way out.
 *
 * The templates carry the listing facts and the agent's CEA registration,
 * because an advertisement sent by an agent has to identify them either way.
 *
 * The records come from the workspace the Demo Data switch selects (`useDemo`).
 * With the switch OFF they are the agent's own and the handover is real: a
 * wa.me link to the tenant's number, and the enquiry marked replied through the
 * workspace, which saves it. With the switch ON they are the demo account's,
 * whose numbers are masked, and the handover is a preview: no link is built,
 * WhatsApp is not opened, and the status change stays in this tab — the
 * provider keeps demo edits in memory and the workspace route refuses demo
 * records besides.
 */

import { useMemo, useState } from 'react';
import {
  Phone, MessageSquare, Copy, Check, Send, Info, ExternalLink, Eye, CheckCheck, ShieldCheck,
} from 'lucide-react';
import {
  Button, Card, SectionCard, PageHeader, Callout, MetricStrip, Metric,
  EmptyState, TextArea, LinkButton, FilterChips, cx,
} from '../../../components/phase1/kit';
import { DemoBadge } from '../../../components/phase1/DemoDataSwitch';
import { PropertyImage } from '../../../components/phase1/PropertyImage';
import { Channel, NextAction, StagePill } from '../../../components/phase1/enquiries/parts';
import { useToast } from '../../../components/phase1/Toast';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { useSession } from '../../../lib/phase1/SessionContext';
import { sgd } from '../../../lib/phase1/data';
import { districtName } from '../../../lib/phase1/performance';
import type { Enquiry } from '../../../lib/phase1/workspace';
import { sgDateLong, sgRelative } from '../../../lib/phase1/format';
import { enquiryTime, isMaskedPhone, isSeededSample, readStage } from '../../../lib/phase1/enquiries';
import { coverPhoto } from '../../../lib/phase1/photos';
import { DEMO_NOTICE, isDemoId } from '../../../lib/phase1/report-data';

type TemplateId = 'reply' | 'viewing' | 'details' | 'gone';

const TEMPLATES: { id: TemplateId; label: string; hint: string }[] = [
  { id: 'reply', label: 'First reply', hint: 'Answer fast, confirm the unit is there, ask one question.' },
  { id: 'viewing', label: 'Offer a viewing', hint: 'Two concrete times beat "when are you free".' },
  { id: 'details', label: 'Send the facts', hint: 'Rent, size, furnishing, availability, in one block.' },
  { id: 'gone', label: 'Unit taken', hint: 'Say so, and offer the nearest thing you have.' },
];

/** WhatsApp wants a bare international number: no plus, no spaces. */
const waNumber = (contact: string) => {
  const digits = contact.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('65') ? digits : `65${digits.slice(-8)}`;
};

const looksLikePhone = (contact: string) => /\d{8}/.test(contact.replace(/\D/g, ''));

export default function WhatsAppPage() {
  const { state, setEnquiryStatus, demo, openedAt } = useDemo();
  const { user } = useSession();
  const { push } = useToast();
  const [selectedId, setSelectedId] = useState<string>('');
  const [template, setTemplate] = useState<TemplateId>('reply');
  const [body, setBody] = useState('');
  const [edited, setEdited] = useState(false);
  const [copied, setCopied] = useState(false);
  /** Enquiries handed over in the demo preview this visit. */
  const [previewed, setPreviewed] = useState<string[]>([]);

  const byId = useMemo(() => new Map(state.listings.map((l) => [l.id, l])), [state.listings]);

  /* Only enquiries you can actually reach on WhatsApp. An email address in the
     contact field is not a handover this screen can perform, and offering the
     button anyway would produce a dead link. The demo account's numbers are
     masked, so there the test is the mask — and only the demo account's own
     records qualify. */
  const reachable = useMemo(
    () => state.enquiries
      .filter((e) => e.status !== 'closed' && (demo ? isDemoId(e.id) && isMaskedPhone(e.contact) : looksLikePhone(e.contact)))
      .sort((a, b) => enquiryTime(b) - enquiryTime(a)),
    [state.enquiries, demo],
  );

  const selected = reachable.find((e) => e.id === selectedId) ?? reachable[0] ?? null;
  const listing = selected ? byId.get(selected.listingId) ?? null : null;
  const stage = selected ? readStage(selected, openedAt) : null;

  const compose = (t: TemplateId, e: Enquiry | null): string => {
    if (!e) return '';
    const l = byId.get(e.listingId);
    const who = state.profile.fullName.replace(/\s*\(.*\)\s*$/, '') || 'your agent';
    const sig = `\n\n${who}\n${state.profile.agency}\nCEA ${state.profile.ceaNumber}`;
    const unit = l ? `${l.project}` : 'the unit';
    const first = e.name.split(' ')[0] || 'there';

    switch (t) {
      case 'viewing':
        return `Hi ${first}, ${who} here from ${state.profile.agency} about ${unit}.\n\nI can show you the unit tomorrow at 6pm or Saturday at 11am — which suits you better? Viewings run about twenty minutes.${sig}`;
      case 'details':
        return l
          ? `Hi ${first}, here are the full details for ${unit}:\n\n` +
            `Rent: ${sgd(l.monthlyRent)} a month\n` +
            `Size: ${l.sizeSqft.toLocaleString('en-SG')} sqft, ${l.bedrooms} bed ${l.bathrooms} bath\n` +
            `Furnishing: ${l.furnishing}\n` +
            `Available: ${sgDateLong(l.availableFrom)}\n` +
            `Minimum lease: ${l.minLeaseMonths} months\n` +
            `District: D${String(l.district).padStart(2, '0')} ${districtName(l.district)}` +
            `${l.nearestMrt ? `\nNearest MRT: ${l.nearestMrt}` : ''}\n\nHappy to arrange a viewing.${sig}`
          : `Hi ${first}, here are the details you asked for.${sig}`;
      case 'gone':
        return `Hi ${first}, thank you for asking about ${unit} — it has just been taken.\n\nI have similar units in the same area at around the same rent. Would you like me to send two or three?${sig}`;
      default:
        return `Hi ${first}, thank you for your enquiry about ${unit} on V-RENT.\n\nYes, it is still available. When are you looking to move in, and would you like to see it this week?${sig}`;
    }
  };

  const text = edited ? body : compose(template, selected);

  const pick = (t: TemplateId) => {
    setTemplate(t);
    setEdited(false);
    setBody('');
  };

  const selectEnquiry = (id: string) => {
    setSelectedId(id);
    setEdited(false);
    setBody('');
  };

  /* Built only for a real record. A demo record never gets a wa.me address,
     so there is nothing that could reach a real number; nor does a sample an
     older version seeded into this workspace, whose made-up number may be
     somebody's. */
  const seeded = Boolean(selected && isSeededSample(selected.id));
  const waLink = selected && !demo && !seeded ? `https://wa.me/${waNumber(selected.contact)}?text=${encodeURIComponent(text)}` : '';

  const handover = () => {
    if (!selected) return;
    /* The point of the screen: the enquiry does not go quiet because the
       conversation moved. */
    if (selected.status === 'new') setEnquiryStatus(selected.id, 'replied');
  };

  const previewHandover = () => {
    if (!selected || !demo) return;
    handover();
    setPreviewed((p) => (p.includes(selected.id) ? p : [...p, selected.id]));
    push({
      tone: 'info',
      title: 'Handover previewed',
      body: selected.status === 'new'
        ? `${selected.name} is marked contacted in this tab. WhatsApp was not opened and nothing was sent.`
        : 'WhatsApp was not opened and nothing was sent.',
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const open = state.enquiries.filter((e) => e.status === 'new').length;
  const wasPreviewed = selected ? previewed.includes(selected.id) : false;

  return (
    <>
      <PageHeader
        eyebrow="Enquiries and viewings"
        title="WhatsApp handover"
        description="Move the conversation to WhatsApp without losing the enquiry. Compose here, open WhatsApp with the message already written, and the record stays against the listing."
        meta={demo ? <DemoBadge title={DEMO_NOTICE} /> : undefined}
        actions={<LinkButton href="/phase1/enquiries" variant="outline">Enquiry inbox</LinkButton>}
      />

      <MetricStrip className="mb-6" cols={3}>
        <Metric label="Reachable on WhatsApp" value={reachable.length} hint="Enquiries that left a mobile number" icon={<Phone size={15} />} iconTone="primary" />
        <Metric label="Waiting on a reply" value={open} hint={open ? 'Answer the oldest first' : 'Nothing outstanding'} icon={<MessageSquare size={15} />} iconTone="success" tone={open ? 'warning' : 'success'} />
        <Metric label="Templates" value={TEMPLATES.length} hint="Each carries your CEA registration" icon={<Send size={15} />} iconTone="primary" />
      </MetricStrip>

      {reachable.length === 0 ? (
        <SectionCard title="Nothing to hand over" icon={<MessageSquare size={16} />}>
          <EmptyState
            icon={<MessageSquare size={22} />}
            title="No open enquiry with a mobile number"
            description="A handover needs a number to hand over to. Enquiries that left an email address are answered from the inbox instead."
            action={<LinkButton href="/phase1/enquiries" size="sm">Open the enquiry inbox</LinkButton>}
          />
        </SectionCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <SectionCard title="Open enquiries" description="Newest first." icon={<MessageSquare size={16} />} padding="none" className="self-start">
            <ul className="max-h-[320px] divide-y divide-p1-border overflow-y-auto lg:max-h-[640px]">
              {reachable.map((e) => {
                const l = byId.get(e.listingId);
                const active = selected?.id === e.id;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => selectEnquiry(e.id)}
                      aria-current={active ? 'true' : undefined}
                      className={cx(
                        'w-full cursor-pointer px-4 py-3.5 text-left transition-colors',
                        active ? 'bg-p1-primary-soft/60' : 'hover:bg-p1-subtle/60',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[14px] font-semibold text-p1-text">{e.name}</span>
                        <StagePill r={readStage(e, openedAt)} />
                      </div>
                      <div className="mt-0.5 truncate text-[12.5px] text-p1-text-3">
                        {l ? `${l.project}` : 'Listing removed'} · <span className="tabular-nums">{e.contact}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-p1-text-2">{e.message}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </SectionCard>

          <div className="grid min-w-0 gap-6 [&>*]:min-w-0">
            {/* ------------------------------------------------ who and what */}
            {selected && stage && (
              <Card padding="none" as="section" aria-labelledby="handover-h">
                <div className="grid gap-px overflow-hidden rounded-xl bg-p1-border sm:grid-cols-2">
                  <div className="bg-p1-surface p-5">
                    <div className="text-[12.5px] font-medium text-p1-text-3">Recipient</div>
                    <h2 id="handover-h" className="mt-1 truncate text-[17px] font-semibold text-p1-text">{selected.name}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-p1-text-2">
                      <span className="inline-flex items-center gap-1.5 tabular-nums"><Phone size={13} aria-hidden className="text-p1-text-3" />{selected.contact}</span>
                      <span aria-hidden className="text-p1-text-3">·</span>
                      <Channel channel={selected.channel} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StagePill r={stage} />
                      <NextAction r={stage} small />
                    </div>
                    <p className="mt-2 text-[12.5px] leading-5 text-p1-text-3">
                      {selected.status === 'new'
                        ? demo ? 'Previewing the handover marks it contacted in this tab only.' : 'Opening WhatsApp marks it contacted.'
                        : 'Already moved along — handing over does not change its stage.'}
                      {' '}Received <span suppressHydrationWarning>{sgRelative(new Date(enquiryTime(selected)), openedAt)}</span>.
                    </p>
                  </div>

                  <div className="bg-p1-surface p-5">
                    <div className="text-[12.5px] font-medium text-p1-text-3">About</div>
                    {listing ? (
                      <div className="mt-2 flex items-start gap-3">
                        <PropertyImage
                          seed={listing.reference + listing.project}
                          src={coverPhoto(user?.id, listing, 'thumb')}
                          alt=""
                          rounded="rounded-lg"
                          className="h-16 w-20 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-[15px] font-semibold text-p1-text">{listing.project}</div>
                          <div className="mt-0.5 text-[13px] text-p1-text-2">
                            {sgd(listing.monthlyRent)}/mo · {listing.bedrooms} bed · {listing.sizeSqft.toLocaleString('en-SG')} sqft
                          </div>
                          <div className="mt-0.5 truncate text-[12.5px] text-p1-text-3">
                            D{String(listing.district).padStart(2, '0')} {districtName(listing.district)} · {listing.address}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-[13px] text-p1-text-3">This listing is no longer in your workspace.</p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* ------------------------------------------------------ compose */}
            <SectionCard
              title="Compose"
              description={selected ? `To ${selected.name} at ${selected.contact}` : undefined}
              icon={<Send size={16} />}
              actions={
                <FilterChips
                  size="sm"
                  label="Template"
                  value={template}
                  onChange={pick}
                  options={TEMPLATES.map((t) => ({ key: t.id, label: t.label }))}
                />
              }
            >
              <p className="mb-3 text-[13px] text-p1-text-3">
                {TEMPLATES.find((t) => t.id === template)?.hint}
              </p>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
                <TextArea
                  label="Message"
                  rows={12}
                  value={text}
                  onChange={(e) => { setEdited(true); setBody(e.target.value); }}
                  hint={`${text.length} characters. Edit it — the template is a starting point, not a script.`}
                />

                {/* What the tenant will see. */}
                <div>
                  <div className="mb-1.5 text-[13.5px] font-medium text-p1-text">Preview</div>
                  <div className="rounded-xl border border-p1-border bg-[#E9E4DC] p-3 dark:bg-[#0E1A17]" aria-label="Message preview">
                    <div className="ml-auto max-w-[92%] rounded-lg rounded-tr-sm bg-[#D9FDD3] px-3 py-2 text-[13px] leading-5 text-[#111B21] shadow-sm dark:bg-[#1F4B3E] dark:text-[#E9EDEF]">
                      <p className="whitespace-pre-wrap break-words">{text}</p>
                      <div className="mt-1 flex items-center justify-end gap-1 text-[10.5px] text-[#667781] dark:text-[#9BB0A8]">
                        {demo ? 'not sent' : 'draft'}
                        {wasPreviewed && <CheckCheck size={13} aria-hidden />}
                      </div>
                    </div>
                  </div>
                  {demo && (
                    <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-5 text-p1-text-3">
                      <ShieldCheck size={13} aria-hidden className="mt-0.5 shrink-0 text-p1-success" />
                      Sample enquiry with a masked number. This preview cannot open WhatsApp or reach anyone.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                {demo ? (
                  <Button onClick={previewHandover} leftIcon={<Eye size={16} />} className="rounded-full">
                    {wasPreviewed ? 'Handover previewed' : 'Preview the handover'}
                  </Button>
                ) : seeded ? (
                  <Button disabled leftIcon={<ExternalLink size={16} />} className="rounded-full" title="Sample enquiry — WhatsApp is not opened">
                    Open in WhatsApp
                  </Button>
                ) : (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noreferrer"
                    onClick={handover}
                    className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-p1-primary px-5 text-[14.5px] font-semibold text-p1-primary-on transition-colors hover:bg-p1-primary-hover"
                  >
                    <ExternalLink size={16} aria-hidden />
                    Open in WhatsApp
                  </a>
                )}
                <Button variant="outline" onClick={copy} leftIcon={copied ? <Check size={16} /> : <Copy size={16} />}>
                  {copied ? 'Copied' : 'Copy the message'}
                </Button>
                {selected && selected.status === 'new' && (
                  <Button variant="ghost" onClick={() => setEnquiryStatus(selected.id, 'replied')}>
                    Mark replied without sending
                  </Button>
                )}
              </div>
              {seeded && (
                <Callout tone="warning" compact className="mt-4" title="Sample enquiry">
                  An earlier version of V-RENT added this enquiry to your workspace as an example. Its number was made
                  up and may belong to someone real, so WhatsApp is not opened for it.
                </Callout>
              )}
            </SectionCard>

            {demo ? (
              <Callout tone="info" title="Demo handover" icon={<Info size={17} />}>
                These are the demo account&apos;s enquiries. Numbers are masked, no WhatsApp link is built, and a status
                you change here lasts only until you reload. Turn Demo Data off to hand over your own enquiries.
              </Callout>
            ) : (
              <Callout tone="info" title="What is real here" icon={<Info size={17} />}>
                The templates, the composed message and the WhatsApp link are working — the link opens WhatsApp with the
                text already in it. Reading replies back into the enquiry needs the WhatsApp Business API, which is part
                of the production build.
              </Callout>
            )}
          </div>
        </div>
      )}
    </>
  );
}
