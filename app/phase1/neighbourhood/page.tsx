"use client";

/**
 * Neighbourhood detail.
 *
 * "What is around it" is the second question a tenant asks and the one agents
 * answer worst, because the honest answer is a list of specific places at
 * specific distances and the usual answer is "very convenient". This screen
 * produces the specific version from OneMap's theme service — hawker centres
 * from the Food Agency, parks from NParks, hospitals from MOH — around a
 * listing the agent already has, or any address they search for.
 *
 * Walking minutes are stated rather than metres alone because that is the unit
 * the conversation happens in. Eighty metres a minute is the figure LTA uses.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Trees, MapPin, Loader2, Info, UtensilsCrossed, Stethoscope,
  BookOpen, Users, Dumbbell, Building2, GraduationCap, Hospital, Copy, Check,
} from 'lucide-react';
import {
  Button, Card, SectionCard, PageHeader, Callout, EmptyState, SelectInput,
  SearchInput, LinkButton, cx,
} from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { PropertyMap } from '../../../components/phase1/listing/PropertyMap';
import { useDemo } from '../../../lib/phase1/DemoContext';
import { districtName } from '../../../lib/phase1/performance';
import type { AmenityLookup, AmenityGroup } from '../../../lib/phase1/amenities';
import type { AddressMatch } from '../../../lib/phase1/onemap';

const ICONS: Record<string, typeof Trees> = {
  hawker: UtensilsCrossed,
  parks: Trees,
  sport: Dumbbell,
  clinics: Stethoscope,
  hospitals: Hospital,
  libraries: BookOpen,
  community: Users,
  schools: GraduationCap,
};

const walk = (metres: number) => Math.max(1, Math.round(metres / 80));

export default function NeighbourhoodPage() {
  const { state } = useDemo();

  const placed = useMemo(
    () => state.listings.filter((l) => !l.archived && l.lat && l.lng),
    [state.listings],
  );

  const [listingId, setListingId] = useState(() => placed[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<AddressMatch[]>([]);
  const [point, setPoint] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [radius, setRadius] = useState('1000');
  const [result, setResult] = useState<AmenityLookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const listing = placed.find((l) => l.id === listingId) ?? null;
  const active = point ?? (listing && listing.lat && listing.lng
    ? { lat: listing.lat, lng: listing.lng, label: `${listing.project} ${listing.unitNo}` }
    : null);

  /* One lookup per point, not per keystroke: eight government requests behind
     each one is not something to fire while somebody types. */
  const lookup = useCallback(async (lat: number, lng: number, metres: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/phase1/neighbourhood?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}&radius=${metres}`);
      setResult((await res.json()) as AmenityLookup);
    } catch {
      setResult({ status: 'failed', reason: 'Could not reach the amenities service.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    // A fetch that shows a spinner: setting state is the whole point of it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void lookup(active.lat, active.lng, radius);
  }, [active?.lat, active?.lng, radius, lookup]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(async () => {
      if (q.length < 3) { setMatches([]); return; }
      setSearching(true);
      try {
        const res = await fetch(`/api/phase1/address?q=${encodeURIComponent(q)}`);
        const body = (await res.json()) as { results?: AddressMatch[] };
        setMatches((body.results ?? []).slice(0, 5));
      } catch {
        setMatches([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const groups: AmenityGroup[] = result?.status === 'ok' ? result.groups : [];
  const found = groups.reduce((n, g) => n + g.items.length, 0);
  /* A category the theme service did not answer for in time. Saying which is
     missing is honest; quietly showing seven of eight is not. */
  const missing = result?.status === 'ok' ? result.missing : [];

  const summary = useMemo(() => {
    if (!groups.length) return '';
    const nearest = groups
      .filter((g) => g.items.length)
      .map((g) => `${g.items[0].name} (${g.label.toLowerCase()}, ${walk(g.items[0].metres)} min walk)`)
      .slice(0, 4);
    return nearest.length
      ? `Within ${Number(radius) / 1000}km: ${nearest.join('; ')}.`
      : '';
  }, [groups, radius]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Market data"
        title="Neighbourhood detail"
        description="What actually sits around an address, with the walk from the door — from the Singapore Land Authority's own datasets rather than from memory."
        actions={<LinkButton href="/phase1/properties" variant="outline">Property map</LinkButton>}
      />

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-4 [&>*]:min-w-0">
          <SectionCard title="Where" icon={<MapPin size={16} />} padding="sm">
            <div className="grid gap-4">
              {placed.length > 0 && (
                <SelectInput
                  label="One of your listings"
                  value={listingId}
                  onChange={(e) => { setListingId(e.target.value); setPoint(null); setQuery(''); }}
                  options={placed.map((l) => ({
                    value: l.id,
                    label: `${l.project} ${l.unitNo} — D${String(l.district).padStart(2, '0')}`,
                  }))}
                />
              )}

              <div>
                <SearchInput
                  size="sm"
                  label="Or any address"
                  value={query}
                  onChange={setQuery}
                  placeholder="Postal code or road"
                />
                {searching && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-p1-text-3">
                    <Loader2 size={12} className="animate-spin" aria-hidden /> Searching OneMap…
                  </p>
                )}
                {matches.length > 0 && (
                  <ul className="mt-2 overflow-hidden rounded-lg ring-1 ring-p1-border">
                    {matches.map((m) => (
                      <li key={m.postal}>
                        <button
                          type="button"
                          disabled={m.lat === undefined || m.lng === undefined}
                          onClick={() => {
                            if (m.lat === undefined || m.lng === undefined) return;
                            setPoint({ lat: m.lat, lng: m.lng, label: m.project || m.label });
                            setMatches([]);
                            setQuery(m.label);
                          }}
                          className="w-full cursor-pointer border-b border-p1-border bg-p1-surface px-3.5 py-2.5 text-left last:border-b-0 hover:bg-p1-subtle disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="block truncate text-[13.5px] font-medium text-p1-text">{m.project || m.street}</span>
                          <span className="block truncate text-[12px] text-p1-text-3">Singapore {m.postal}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <SelectInput
                label="How far"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                hint="A kilometre is about a twelve-minute walk."
                options={[
                  { value: '500', label: '500 m' },
                  { value: '1000', label: '1 km' },
                  { value: '1500', label: '1.5 km' },
                  { value: '2000', label: '2 km' },
                ]}
              />
            </div>
          </SectionCard>

          {active && (
            <Card padding="none" className="overflow-hidden">
              <PropertyMap lat={active.lat} lng={active.lng} label={active.label} height={220} />
              <div className="px-4 py-3">
                <div className="truncate font-p1display text-[15px] font-bold text-p1-text">{active.label}</div>
                {listing && !point && (
                  <div className="mt-0.5 text-[12.5px] text-p1-text-3">
                    D{String(listing.district).padStart(2, '0')} {districtName(listing.district)} · {listing.address}
                  </div>
                )}
              </div>
            </Card>
          )}

          {summary && (
            <Card padding="md">
              <div className="text-[13px] font-semibold text-p1-text">For the listing description</div>
              <p className="mt-1.5 text-[13px] leading-5 text-p1-text-2">{summary}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={copySummary} leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}>
                {copied ? 'Copied' : 'Copy this'}
              </Button>
            </Card>
          )}

          <Callout tone="info" title="Where this comes from" icon={<Info size={17} />}>
            OneMap&rsquo;s theme service, which publishes each agency&rsquo;s own register — hawker centres from the
            Food Agency, parks from NParks, hospitals from the Ministry of Health. Each group names its source.
          </Callout>
        </div>

        <div className="min-w-0">
          {!active ? (
            <SectionCard title="Nothing chosen" icon={<Trees size={16} />}>
              <EmptyState
                icon={<MapPin size={22} />}
                title="Choose a listing or search an address"
                description={placed.length === 0
                  ? 'None of your listings has been matched to a point on the map yet. Search an address instead.'
                  : 'Pick one on the left and the area around it is looked up straight away.'}
              />
            </SectionCard>
          ) : loading ? (
            <SectionCard title="Looking up the area" icon={<Loader2 size={16} className="animate-spin" />}>
              <p className="text-[14px] text-p1-text-2">Querying eight datasets around {active.label}…</p>
            </SectionCard>
          ) : result?.status === 'no_token' ? (
            <Callout tone="warning" title="The theme service is not configured">
              {result.reason} The map, the address search and everything else on this screen still work.
            </Callout>
          ) : result?.status === 'failed' ? (
            <Callout tone="danger" title="That lookup did not come back">{result.reason}</Callout>
          ) : found === 0 ? (
            <SectionCard title="Nothing within range" icon={<Trees size={16} />}>
              <EmptyState
                compact
                title={`Nothing in those datasets within ${Number(radius) / 1000}km`}
                description="Widen the radius. Parts of the island genuinely have very little inside 500 metres."
              />
            </SectionCard>
          ) : (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-p1display text-[18px] font-bold text-p1-text">
                  {found} places within {Number(radius) / 1000}km of {active.label}
                </h2>
                <span className="text-[12.5px] text-p1-text-3">Nearest first, with the walk</span>
              </div>

              {missing.length > 0 && (
                <p className="rounded-p1 border border-dashed border-p1-line bg-p1-surface-2 px-3 py-2 text-[12.5px] text-p1-text-3">
                  {missing.join(' and ')} did not respond in time, so {missing.length > 1 ? 'those categories are' : 'that category is'} not
                  counted above. Search again to retry.
                </p>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {groups.filter((g) => g.items.length > 0).map((g) => {
                  const Icon = ICONS[g.key] ?? Building2;
                  return (
                    <SectionCard
                      key={g.key}
                      title={g.label}
                      description={g.source}
                      icon={<Icon size={16} />}
                      padding="none"
                      actions={<Pill tone="neutral">{g.items.length}</Pill>}
                    >
                      <ul className="divide-y divide-p1-border">
                        {g.items.slice(0, 6).map((a) => (
                          <li key={`${a.name}-${a.lat}`} className="flex items-start justify-between gap-3 px-4 py-2.5">
                            <div className="min-w-0">
                              <div className="truncate text-[13.5px] font-medium text-p1-text">{a.name}</div>
                              {a.address && <div className="truncate text-[12px] text-p1-text-3">{a.address}</div>}
                            </div>
                            <div className="shrink-0 text-right">
                              <div className={cx(
                                'text-[13px] font-semibold tabular-nums',
                                a.metres <= 400 ? 'text-p1-success' : 'text-p1-text-2',
                              )}>
                                {walk(a.metres)} min
                              </div>
                              <div className="text-[11.5px] tabular-nums text-p1-text-3">{a.metres} m</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </SectionCard>
                  );
                })}
              </div>

              {groups.some((g) => g.items.length === 0) && (
                <p className="text-[12.5px] leading-5 text-p1-text-3">
                  Nothing within range in: {groups.filter((g) => !g.items.length).map((g) => g.label.toLowerCase()).join(', ')}.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
