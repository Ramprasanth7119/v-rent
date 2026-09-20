"use client";

/**
 * The property directory.
 *
 * Two things an agent cannot do anywhere else in the product: see what every
 * other agent has live, and ask what is near a place rather than near a
 * listing. The second is the reason this screen is worth having — "what is
 * advertised around Tiong Bahru" is the question asked before a valuation
 * call, and answering it by scrolling a list sorted by date does not work.
 *
 * So the search box geocodes what is typed, through the same OneMap proxy the
 * listing wizard uses, and the results become a ring around that point. What
 * to do with that ring is then the agent's: nearest, newest, cheapest,
 * dearest or largest.
 *
 * The whole query lives in the URL. It has to, because the printed version of
 * this list is a separate page that must produce exactly what is on screen —
 * see `lib/phase1/directory-filter.ts`, which both of them run.
 *
 * Editing is deliberately absent for everything but the agent's own listings.
 * They can open anybody's as a tenant would; the pencil only appears on their
 * own, and the button it leads to is the same wizard, so there is one edit
 * path in the product rather than two.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Building2, Eye, FileDown, MapPin, Pencil, Search, SlidersHorizontal, X } from 'lucide-react';
import {
  Button, EmptyState, LinkButton, PageHeader, Pagination, SearchInput, SelectMenu, Spinner, TextInput, cx, usePagination,
} from '../../../components/phase1/kit';
import { PropertyImage } from '../../../components/phase1/PropertyImage';
import type { MarketListing } from '../../../lib/phase1/marketplace';
import { DISTRICTS, districtCode } from '../../../lib/phase1/districts';
import { FLOOR_BANDS, floorLabel, type FloorBand } from '../../../lib/phase1/floor';
import { priceLabel } from '../../../lib/phase1/pricing';
import { formatDistance } from '../../../lib/phase1/nearby';
import { sgDate } from '../../../lib/phase1/format';
import {
  EMPTY_QUERY, RADII, SORTS, applyDirectory, describeQuery, priceSortable,
  queryFromParams, queryToParams, type Centre, type DirectoryQuery, type Sort,
} from '../../../lib/phase1/directory-filter';

const TYPES = ['Condominium', 'HDB', 'Apartment', 'Executive Condominium', 'Landed'];

export default function DirectoryView({
  items, viewerId, viewCounts,
}: {
  items: MarketListing[];
  viewerId: string | null;
  /** How many agents have opened each of the viewer's own listings. */
  viewCounts: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  /* The URL is the state. Typing updates it, and everything below reads it
     back, so a link always reproduces the screen it came from. */
  const { query, centre: centreFromUrl } = useMemo(() => queryFromParams(new URLSearchParams(params.toString())), [params]);

  const [typed, setTyped] = useState(query.q);
  const [centre, setCentre] = useState<Centre | null>(centreFromUrl);
  const [looking, setLooking] = useState(false);
  const [more, setMore] = useState(false);

  const write = useCallback((next: DirectoryQuery, nextCentre: Centre | null) => {
    const p = queryToParams(next, nextCentre);
    router.replace(p.toString() ? `${pathname}?${p}` : pathname, { scroll: false });
  }, [pathname, router]);

  const setQuery = (patch: Partial<DirectoryQuery>) => write({ ...query, ...patch }, centre);

  /**
   * Geocode what was typed, a beat after typing stops.
   *
   * A term that matches nothing on the map is not an error — it is probably a
   * project name, which the text filter handles — so a failed lookup clears
   * the centre quietly rather than showing a warning.
   */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const term = typed.trim();
    if (timer.current) clearTimeout(timer.current);

    /* Everything, including clearing a short term, happens on the timer: a
       state change in the body of an effect cascades a second render. */
    timer.current = setTimeout(async () => {
      if (term === query.q && term.length < 3) return;
      if (term.length < 3) {
        setCentre(null);
        write({ ...query, q: term }, null);
        return;
      }
      setLooking(true);
      try {
        const res = await fetch(`/api/phase1/address?q=${encodeURIComponent(term)}`);
        const data = await res.json().catch(() => ({}));
        const first = res.ok ? (data.matches ?? data.results ?? [])[0] : null;
        const found: Centre | null = first?.lat !== undefined && first?.lng !== undefined
          ? { label: first.project || first.label || term, lat: first.lat, lng: first.lng }
          : null;
        setCentre(found);
        /* A place found is almost always an ask for what is around it. */
        write({ ...query, q: term, sort: found ? 'nearest' : query.sort }, found);
      } catch {
        setCentre(null);
        write({ ...query, q: term }, null);
      } finally {
        setLooking(false);
      }
    }, term.length < 3 ? 0 : 450);

    return () => { if (timer.current) clearTimeout(timer.current); };
    /* `query` and `write` are stable per URL; re-running on them would refire
       the lookup on every filter change. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed]);

  const results = useMemo(
    () => applyDirectory(items, query, centre, viewerId),
    [items, query, centre, viewerId],
  );

  const page = usePagination(results, 24);
  const chips = describeQuery(query, centre);
  const mineCount = items.filter((m) => m.ownerId === viewerId).length;
  const priced = priceSortable(query);

  const clearAll = () => {
    setTyped('');
    setCentre(null);
    write(EMPTY_QUERY, null);
  };

  /* The printed list is the same query, so it is the same parameters. */
  const exportHref = `/phase1/directory/export?${queryToParams(query, centre)}`;

  return (
    <>
      <PageHeader
        title="Property directory"
        description={`Every listing live on V-RENT — ${items.length} from ${new Set(items.map((m) => m.ownerId)).size} agents. Yours are marked.`}
        actions={
          <LinkButton
            variant="outline"
            size="sm"
            href={exportHref}
            leftIcon={<FileDown size={15} />}
          >
            Download PDF
          </LinkButton>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <SearchInput
            value={typed}
            onChange={setTyped}
            label="Search by place, project or agent"
            placeholder="Tiong Bahru, Normanton Park, 098765…"
            size="sm"
          />
          {looking && <span className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner size={14} /></span>}
        </div>

        {centre && (
          <SelectMenu
            variant="button"
            label="Within"
            value={String(query.radius)}
            onChange={(v) => setQuery({ radius: Number(v) })}
            options={RADII.map((r) => ({ value: String(r), label: `Within ${formatDistance(r)}` }))}
          />
        )}

        <SelectMenu
          variant="button"
          label="Sort"
          value={query.sort}
          onChange={(v) => setQuery({ sort: v as Sort })}
          options={SORTS.map((s) => ({
            value: s.value,
            label: s.label,
            /* Said rather than hidden: a disabled control with no reason is
               read as a bug. */
            hint: s.value === 'nearest' && !centre
              ? 'Search a place first'
              : (s.value.startsWith('price') && !priced ? 'Choose rent or sale first' : undefined),
          }))}
        />

        <Button
          variant={query.mine ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setQuery({ mine: !query.mine })}
          leftIcon={<Building2 size={15} />}
        >
          Mine ({mineCount})
        </Button>

        <Button variant="outline" size="sm" onClick={() => setMore((v) => !v)} leftIcon={<SlidersHorizontal size={15} />}>
          Filters
        </Button>
      </div>

      {more && (
        <div className="mb-4 rounded-xl border border-p1-border bg-p1-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SelectMenu variant="button" label="Deal" value={query.deal} onChange={(v) => setQuery({ deal: v as DirectoryQuery['deal'] })}
              options={[{ value: 'any', label: 'Rent or sale' }, { value: 'rent', label: 'To rent' }, { value: 'sale', label: 'For sale' }]} />
            <SelectMenu variant="button" label="Property type" value={query.type} onChange={(v) => setQuery({ type: v })}
              options={[{ value: '', label: 'Any type' }, ...TYPES.map((t) => ({ value: t, label: t }))]} />
            <SelectMenu variant="button" label="District" value={query.district} onChange={(v) => setQuery({ district: v })}
              options={[{ value: '', label: 'Any district' }, ...Object.entries(DISTRICTS).map(([d, v]) => ({ value: d, label: `${districtCode(Number(d))} · ${v.name}`, hint: v.areas }))]} />
            <SelectMenu variant="button" label="Bedrooms" value={query.beds} onChange={(v) => setQuery({ beds: v })}
              options={[{ value: 'any', label: 'Any' }, ...['1', '2', '3', '4+'].map((b) => ({ value: b, label: b }))]} />
            <SelectMenu variant="button" label="Floor" value={query.floor} onChange={(v) => setQuery({ floor: v as FloorBand })}
              options={[{ value: 'any', label: 'Any floor' }, ...(Object.keys(FLOOR_BANDS) as Exclude<FloorBand, 'any'>[]).map((k) => ({ value: k, label: FLOOR_BANDS[k].label }))]} />
          </div>

          <div className="mt-3 grid gap-3 border-t border-p1-border pt-3 sm:grid-cols-3">
            <TextInput
              label="Floor area from" inputMode="numeric" rightSlot="sqft"
              value={query.sizeMin} onChange={(e) => setQuery({ sizeMin: e.target.value.replace(/\D/g, '') })}
              placeholder="700"
            />
            <TextInput
              label={query.deal === 'sale' ? 'Price from' : 'Rent from'} inputMode="numeric" leftIcon="S$"
              value={query.priceMin} onChange={(e) => setQuery({ priceMin: e.target.value.replace(/\D/g, '') })}
              disabled={!priced}
              hint={priced ? undefined : 'Choose rent or sale first — the two are not priced in the same units.'}
            />
            <TextInput
              label={query.deal === 'sale' ? 'Price up to' : 'Rent up to'} inputMode="numeric" leftIcon="S$"
              value={query.priceMax} onChange={(e) => setQuery({ priceMax: e.target.value.replace(/\D/g, '') })}
              disabled={!priced}
            />
          </div>
        </div>
      )}

      {chips.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-p1-border bg-p1-surface px-2.5 text-[12.5px] font-medium text-p1-text"
            >
              {c}
            </span>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="p1-in inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-p1-border bg-p1-surface pl-2.5 pr-1.5 text-[12.5px] font-medium text-p1-text-2 hover:border-p1-border-strong hover:text-p1-text"
          >
            Clear all<X size={13} className="text-p1-text-3" aria-hidden />
          </button>
        </div>
      )}

      <p className="mb-3 text-[13.5px] text-p1-text-2" aria-live="polite">
        {results.length} {results.length === 1 ? 'property' : 'properties'}
        {centre && <> near <span className="font-medium text-p1-text">{centre.label}</span></>}
      </p>

      {results.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title="Nothing matches that"
          description={centre
            ? 'No live listings inside that distance. Widen it, or clear the place to search by words instead.'
            : 'Try a place name, a development, a postal code or an agent.'}
          action={<Button variant="outline" onClick={clearAll}>Clear everything</Button>}
        />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {page.slice.map(({ m, metres }) => {
              const l = m.listing;
              const own = m.ownerId === viewerId;
              const price = priceLabel(l);
              const seen = own ? viewCounts[l.id] ?? 0 : 0;
              return (
                <li key={`${m.ownerId}/${l.id}`} className={cx('overflow-hidden rounded-xl border bg-p1-surface', own ? 'border-p1-primary/45' : 'border-p1-border')}>
                  <Link href={`/phase1/homes/${m.ownerId}/${l.id}`} className="block">
                    <div className="relative aspect-[16/10] bg-p1-subtle">
                      <PropertyImage seed={l.id} src={m.thumbs[0] ?? m.photos[0]} alt={l.project} className="h-full w-full object-cover" />
                      {own && (
                        <span className="absolute left-2 top-2 rounded-md bg-p1-primary px-2 py-1 text-[11.5px] font-semibold text-p1-primary-on">Yours</span>
                      )}
                      {metres !== null && (
                        <span className="absolute right-2 top-2 rounded-md bg-black/65 px-2 py-1 text-[11.5px] font-medium tabular-nums text-white">
                          {formatDistance(metres)}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="p-3.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link href={`/phase1/homes/${m.ownerId}/${l.id}`} className="truncate text-[14.5px] font-semibold text-p1-text hover:text-p1-primary">
                        {l.project}
                      </Link>
                      <span className="shrink-0 text-[14px] font-semibold tabular-nums text-p1-primary">
                        {price.amount}<span className="text-[11.5px] font-normal text-p1-text-3">{price.suffix}</span>
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[12.5px] text-p1-text-3">
                      <MapPin size={12} aria-hidden />
                      {districtCode(l.district)} · {l.bedrooms} bed · {l.sizeSqft.toLocaleString('en-SG')} sqft
                      {floorLabel(l) && <> · {floorLabel(l)}</>}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-p1-border pt-2.5">
                      <span className="min-w-0 truncate text-[12.5px] text-p1-text-2">
                        {own ? 'You' : m.agent.name}
                        <span className="text-p1-text-3"> · live since {sgDate(l.publishedAt ?? l.createdAt)}</span>
                      </span>
                      {own ? (
                        <span className="flex shrink-0 items-center gap-1.5">
                          {/* Your own listing tells you who has been looking at
                              it. See `lib/phase1/views.ts`. */}
                          {seen > 0 && (
                            <Link
                              href={`/phase1/listings/${l.id}?tab=views`}
                              title={`${seen} ${seen === 1 ? 'agent has' : 'agents have'} viewed this`}
                              className="p1-press inline-flex h-7 items-center gap-1 rounded-lg bg-p1-primary-soft px-2 text-[12.5px] font-semibold tabular-nums text-p1-primary"
                            >
                              <Eye size={12} aria-hidden /> {seen}
                            </Link>
                          )}
                          <Link
                            href={`/phase1/listings/new?edit=${l.id}`}
                            className="p1-press inline-flex h-7 items-center gap-1 rounded-lg border border-p1-border-strong px-2 text-[12.5px] font-medium text-p1-text hover:bg-p1-subtle"
                          >
                            <Pencil size={12} aria-hidden /> Edit
                          </Link>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-5">
            <Pagination page={page.page} pages={page.pages} onChange={page.setPage} from={page.from} to={page.to} total={page.total} noun="properties" />
          </div>
        </>
      )}

      <p className="mt-6 flex items-start gap-2 text-[12.5px] leading-5 text-p1-text-3">
        <Eye size={13} className="mt-0.5 shrink-0" aria-hidden />
        Opening another agent&rsquo;s listing is counted on theirs, as yours is on yours. Only agents are counted,
        never tenants. Unit numbers are never shown here or anywhere else.
      </p>
    </>
  );
}
