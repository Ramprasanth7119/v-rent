"use client";

/**
 * Which agents have opened this listing, and who they were.
 *
 * The screen has one job: make the count mean something. A number on its own
 * is a vanity metric, so every row states what it actually is — an agency, a
 * date, and how many separate occasions — and offers the name behind it.
 *
 * The price is on the button before it is pressed. An agent should never find
 * out what something cost by being charged for it, and the first name on every
 * listing says "Free" because it is.
 *
 * Nothing here decides anything. Whether a name may be revealed and what it
 * costs are the server's answers (`lib/phase1/views.ts`); this asks and draws.
 */

import { useEffect, useState } from 'react';
import { BadgeCheck, Building2, Eye, Lock, Mail, Phone, Sparkles, UserRound } from 'lucide-react';
import { Button, Callout, EmptyState, LinkButton, Spinner, cx } from '../kit';
import { useToast } from '../Toast';
import { sgDate } from '../../../lib/phase1/format';
import { priceLabel, viewsSentence } from '../../../lib/phase1/views';

interface ViewerCard {
  id: string;
  name: string;
  agency: string;
  mobile: string;
  email: string;
  ceaNumber: string;
  bio: string;
  experienceYears: string;
  liveListings: number;
  registrationCurrent: boolean;
}

interface ViewerRow {
  /* Opaque, and different for the same agent on a different listing. The real
     account id is never sent for a viewer who has not been paid for. */
  token: string;
  first: string;
  last: string;
  count: number;
  revealed: boolean;
  card?: ViewerCard;
  masked: string;
}

interface Payload {
  viewers: ViewerRow[];
  nextCostCents: number;
  remaining: number;
  credits: number;
}

function RevealedCard({ card }: { card: ViewerCard }) {
  return (
    <div className="mt-3 rounded-lg border border-p1-border bg-p1-bg p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[14.5px] font-semibold text-p1-text">
            {card.name}
            {card.registrationCurrent && (
              <span title="CEA registration current" className="text-p1-success"><BadgeCheck size={14} aria-hidden /></span>
            )}
          </div>
          <div className="text-[12.5px] text-p1-text-2">
            {card.agency || 'Agency not stated'}
            {card.ceaNumber && <span className="text-p1-text-3"> · {card.ceaNumber}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {card.mobile && (
            <a
              href={`tel:${card.mobile.replace(/\s/g, '')}`}
              className="p1-press inline-flex h-8 items-center gap-1.5 rounded-lg bg-p1-primary px-3 text-[12.5px] font-medium text-p1-primary-on"
            >
              <Phone size={13} aria-hidden /> {card.mobile}
            </a>
          )}
          {card.email && (
            <a
              href={`mailto:${card.email}`}
              aria-label={`Email ${card.name}`}
              className="p1-press inline-flex h-8 w-8 items-center justify-center rounded-lg border border-p1-border-strong text-p1-text-2 hover:bg-p1-subtle"
            >
              <Mail size={14} aria-hidden />
            </a>
          )}
        </div>
      </div>

      <dl className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-p1-text-3">
        <div className="flex gap-1.5"><dt>Live listings</dt><dd className="font-medium text-p1-text-2">{card.liveListings}</dd></div>
        {card.experienceYears && (
          <div className="flex gap-1.5"><dt>Experience</dt><dd className="font-medium text-p1-text-2">{card.experienceYears}</dd></div>
        )}
      </dl>

      {card.bio && <p className="mt-2 line-clamp-3 text-[12.5px] leading-5 text-p1-text-2">{card.bio}</p>}
    </div>
  );
}

export function ViewersPanel({ listingId }: { listingId: string }) {
  const { push } = useToast();
  const [data, setData] = useState<Payload | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  /* Bumped after a reveal, which is the only thing that changes the answer. */
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let live = true;
    fetch(`/api/phase1/views?listing=${encodeURIComponent(listingId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((d: Payload) => { if (live) { setData(d); setFailed(false); } })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [listingId, reloads]);

  const reveal = async (token: string) => {
    setBusy(token);
    try {
      const res = await fetch('/api/phase1/views/reveal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listingId, token }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? 'That did not go through.');

      push({
        tone: 'success',
        title: `Revealed ${body.card?.name ?? 'the agent'}`,
        body: body.costCents ? `${priceLabel(body.costCents)} charged. ${priceLabel(body.credits)} left.` : 'This one was included.',
      });
      setReloads((n) => n + 1);
    } catch (err) {
      push({ tone: 'error', title: 'Not revealed', body: err instanceof Error ? err.message : 'Try again in a moment.' });
    } finally {
      setBusy(null);
    }
  };

  if (failed) {
    return <Callout tone="warning" title="Viewers could not be loaded">Refresh the page to try again.</Callout>;
  }
  if (!data) {
    return <div className="flex justify-center py-10"><Spinner size={18} /></div>;
  }

  if (data.viewers.length === 0) {
    return (
      <EmptyState
        icon={<Eye size={22} />}
        title="No agents have opened this yet"
        description="When another agent opens this property in the directory, they appear here and you are notified. Nobody sees that you looked at theirs any differently."
      />
    );
  }

  const free = data.nextCostCents === 0;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-p1-border bg-p1-subtle/50 px-4 py-3">
        <div>
          <div className="text-[15px] font-semibold text-p1-text">
            {viewsSentence(data.viewers.length)} viewed this property
          </div>
          <div className="text-[12.5px] text-p1-text-3">
            {data.remaining === 0
              ? 'You have revealed all of them.'
              : free
                ? `The first name is included. ${data.remaining} to reveal.`
                : `${priceLabel(data.nextCostCents)} a name · ${data.remaining} left to reveal`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[12px] text-p1-text-3">Balance</div>
          <div className="text-[15px] font-semibold tabular-nums text-p1-text">{priceLabel(data.credits)}</div>
        </div>
      </div>

      <ul className="space-y-3">
        {data.viewers.map((v) => (
          <li
            key={v.token}
            className={cx('rounded-xl border p-3.5', v.revealed ? 'border-p1-primary/40 bg-p1-surface' : 'border-p1-border bg-p1-surface')}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[14px] font-medium text-p1-text">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-p1-subtle text-p1-text-3" aria-hidden>
                    {v.revealed ? <UserRound size={15} /> : <Building2 size={15} />}
                  </span>
                  {v.revealed ? (v.card?.name ?? 'Account closed') : v.masked}
                </div>
                <div className="mt-1 pl-10 text-[12.5px] text-p1-text-3">
                  {v.count > 1 ? `${v.count} visits · last ` : 'Viewed '}{sgDate(v.last)}
                </div>
              </div>

              {!v.revealed && (
                <Button
                  size="sm"
                  variant={free ? 'primary' : 'outline'}
                  loading={busy === v.token}
                  disabled={busy !== null}
                  leftIcon={free ? <Sparkles size={14} /> : <Lock size={14} />}
                  onClick={() => void reveal(v.token)}
                >
                  {free ? 'Reveal — free' : `Reveal · ${priceLabel(data.nextCostCents)}`}
                </Button>
              )}
            </div>

            {v.revealed && v.card && <RevealedCard card={v.card} />}
            {v.revealed && !v.card && (
              <p className="mt-2 pl-10 text-[12.5px] text-p1-text-3">
                This agent has since closed their account. You were not charged again.
              </p>
            )}
          </li>
        ))}
      </ul>

      {data.credits < 100 && data.remaining > 0 && (
        <Callout
          tone="info"
          className="mt-4"
          title="Balance is low"
          action={<LinkButton size="sm" variant="outline" href="/phase1/checkout">Top up</LinkButton>}
        >
          Each further name is {priceLabel(100)}. Your balance is {priceLabel(data.credits)}.
        </Callout>
      )}

      <p className="mt-4 text-[12px] leading-5 text-p1-text-3">
        Only agents are counted, never tenants, and never you. An agent is counted once however many times they
        return — the number of visits is shown beside them.
      </p>
    </>
  );
}
