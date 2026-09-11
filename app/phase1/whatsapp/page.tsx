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
 */

import { useMemo, useState } from 'react';
import { Phone, MessageSquare, Copy, Check, Send, Info, ExternalLink } from 'lucide-react';
import {
  Button, Card, SectionCard, PageHeader, Callout, MetricStrip, Metric,
  EmptyState, TextArea, LinkButton, FilterChips, cx,
} from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { sgd } from '../../../lib/phase1/data';
import { districtName, ENQUIRY_STATUS } from '../../../lib/phase1/performance';
import type { Enquiry } from '../../../lib/phase1/workspace';
import { sgDateLong } from '../../../lib/phase1/format';

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
  const { state, setEnquiryStatus } = useDemo();
  const [selectedId, setSelectedId] = useState<string>('');
  const [template, setTemplate] = useState<TemplateId>('reply');
  const [body, setBody] = useState('');
  const [edited, setEdited] = useState(false);
  const [copied, setCopied] = useState(false);

  const byId = useMemo(() => new Map(state.listings.map((l) => [l.id, l])), [state.listings]);

  /* Only enquiries you can actually reach on WhatsApp. An email address in the
     contact field is not a handover this screen can perform, and offering the
     button anyway would produce a dead link. */
  const reachable = useMemo(
    () => state.enquiries
      .filter((e) => e.status !== 'closed' && looksLikePhone(e.contact))
      .sort((a, b) => b.at.localeCompare(a.at)),
    [state.enquiries],
  );

  const selected = reachable.find((e) => e.id === selectedId) ?? reachable[0] ?? null;
  const listing = selected ? byId.get(selected.listingId) ?? null : null;

  const compose = (t: TemplateId, e: Enquiry | null): string => {
    if (!e) return '';
    const l = byId.get(e.listingId);
    const who = state.profile.fullName.replace(/\s*\(.*\)\s*$/, '') || 'your agent';
    const sig = `\n\n${who}\n${state.profile.agency}\nCEA ${state.profile.ceaNumber}`;
    const unit = l ? `${l.project} ${l.unitNo}` : 'the unit';
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

  const waLink = selected ? `https://wa.me/${waNumber(selected.contact)}?text=${encodeURIComponent(text)}` : '';

  const handover = () => {
    if (!selected) return;
    /* The point of the screen: the enquiry does not go quiet because the
       conversation moved. */
    if (selected.status === 'new') setEnquiryStatus(selected.id, 'replied');
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

  return (
    <>
      <PageHeader
        eyebrow="Enquiries and viewings"
        title="WhatsApp handover"
        description="Move the conversation to WhatsApp without losing the enquiry. Compose here, open WhatsApp with the message already written, and the record stays against the listing."
        actions={<LinkButton href="/phase1/performance" variant="outline">Enquiry inbox</LinkButton>}
      />

      <MetricStrip className="mb-6" cols={3}>
        <Metric label="Reachable on WhatsApp" value={reachable.length} hint="Enquiries that left a mobile number" icon={<Phone size={15} />} />
        <Metric label="Waiting on a reply" value={open} hint={open ? 'Answer the oldest first' : 'Nothing outstanding'} icon={<MessageSquare size={15} />} tone={open ? 'warning' : 'success'} />
        <Metric label="Templates" value={TEMPLATES.length} hint="Each carries your CEA registration" icon={<Send size={15} />} />
      </MetricStrip>

      {reachable.length === 0 ? (
        <SectionCard title="Nothing to hand over" icon={<MessageSquare size={16} />}>
          <EmptyState
            icon={<MessageSquare size={22} />}
            title="No open enquiry with a mobile number"
            description="A handover needs a number to hand over to. Enquiries that left an email address are answered from the inbox instead."
            action={<LinkButton href="/phase1/performance" size="sm">Open the enquiry inbox</LinkButton>}
          />
        </SectionCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <SectionCard title="Open enquiries" description="Newest first." icon={<MessageSquare size={16} />} padding="none" className="self-start">
            <ul className="max-h-[560px] divide-y divide-p1-border overflow-y-auto">
              {reachable.map((e) => {
                const l = byId.get(e.listingId);
                const active = selected?.id === e.id;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => selectEnquiry(e.id)}
                      className={cx(
                        'w-full cursor-pointer px-4 py-3.5 text-left transition-colors',
                        active ? 'bg-p1-primary-soft/60' : 'hover:bg-p1-subtle/60',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[14px] font-semibold text-p1-text">{e.name}</span>
                        <Pill tone={ENQUIRY_STATUS[e.status].tone}>{ENQUIRY_STATUS[e.status].label}</Pill>
                      </div>
                      <div className="mt-0.5 truncate text-[12.5px] text-p1-text-3">
                        {l ? `${l.project} ${l.unitNo}` : 'Listing removed'} · {e.contact}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-p1-text-2">{e.message}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </SectionCard>

          <div className="grid min-w-0 gap-6 [&>*]:min-w-0">
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
              <TextArea
                label="Message"
                rows={12}
                value={text}
                onChange={(e) => { setEdited(true); setBody(e.target.value); }}
                hint={`${text.length} characters. Edit it — the template is a starting point, not a script.`}
              />
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handover}
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-p1-primary px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-p1-primary-hover"
                >
                  <ExternalLink size={16} aria-hidden />
                  Open in WhatsApp
                </a>
                <Button variant="outline" onClick={copy} leftIcon={copied ? <Check size={16} /> : <Copy size={16} />}>
                  {copied ? 'Copied' : 'Copy the message'}
                </Button>
                {selected && selected.status === 'new' && (
                  <Button variant="ghost" onClick={() => setEnquiryStatus(selected.id, 'replied')}>
                    Mark replied without sending
                  </Button>
                )}
              </div>
            </SectionCard>

            {listing && (
              <Card padding="md">
                <div className="text-[13px] font-semibold text-p1-text-3">The listing this is about</div>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-p1display text-[17px] font-bold text-p1-text">{listing.project} {listing.unitNo}</span>
                  <span className="text-[14px] text-p1-text-2">
                    {sgd(listing.monthlyRent)}/mo · {listing.bedrooms} bed · {listing.sizeSqft.toLocaleString('en-SG')} sqft
                  </span>
                </div>
                <div className="mt-1 text-[13px] text-p1-text-3">
                  D{String(listing.district).padStart(2, '0')} {districtName(listing.district)} · {listing.address}
                </div>
              </Card>
            )}

            <Callout tone="info" title="What is real here" icon={<Info size={17} />}>
              The templates, the composed message and the WhatsApp link are working — the link opens WhatsApp with the
              text already in it. Reading replies back into the enquiry needs the WhatsApp Business API, which is part
              of the production build.
            </Callout>
          </div>
        </div>
      )}
    </>
  );
}
