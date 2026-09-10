"use client";

/**
 * The full filter set, in a panel.
 *
 * Four or five filters belong on the toolbar; fourteen do not. So the common
 * ones stay outside and everything else lives here, with a count on the button
 * so a narrowed list never looks like an empty one. Sections follow the two
 * sides of the market — what a tenant asks and what a buyer asks are not the
 * same questions.
 */

import { Drawer } from '../overlays';
import { Button, SelectInput, TextInput, Segmented } from '../kit';
import {
  AVAILABILITY, EMPTY_FILTERS, FLOOR_BANDS, FURNISHINGS, ListingFilters, TENURES, activeCount,
} from './filters';
import { districtName } from '../../../lib/phase1/performance';

const any = (label: string) => ({ value: 'any', label });

export function FilterPanel({
  open,
  onClose,
  filters,
  onChange,
  districts,
  types,
  stations,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  filters: ListingFilters;
  onChange: (patch: Partial<ListingFilters>) => void;
  districts: number[];
  types: string[];
  stations: string[];
  resultCount: number;
}) {
  const showRentOnly = filters.deal !== 'sale';
  const showSaleOnly = filters.deal !== 'rent';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Filters"
      description="Narrow the list the way you would on a portal."
      width="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onChange(EMPTY_FILTERS)} disabled={activeCount(filters) === 0}>
            Clear all
          </Button>
          <Button onClick={onClose}>
            Show {resultCount} {resultCount === 1 ? 'listing' : 'listings'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <Segmented
          label="Sale or rent"
          value={filters.deal}
          onChange={(deal) => onChange({ deal })}
          options={[{ key: 'any', label: 'Both' }, { key: 'rent', label: 'For rent' }, { key: 'sale', label: 'For sale' }]}
        />

        <Section title="Property">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectInput
              label="Property type"
              value={filters.type}
              onChange={(e) => onChange({ type: e.target.value })}
              options={[any('Any type'), ...types.map((t) => ({ value: t, label: t }))]}
            />
            <SelectInput
              label="District"
              value={filters.district}
              onChange={(e) => onChange({ district: e.target.value })}
              options={[any('Any district'), ...districts.map((d) => ({ value: String(d), label: `D${String(d).padStart(2, '0')} ${districtName(d)}` }))]}
            />
            <SelectInput
              label="Bedrooms"
              value={filters.beds}
              onChange={(e) => onChange({ beds: e.target.value })}
              options={[any('Any'), ...['1', '2', '3', '4', '5+'].map((b) => ({ value: b, label: b === '5+' ? '5 or more' : b }))]}
            />
            <SelectInput
              label="Bathrooms"
              value={filters.baths}
              onChange={(e) => onChange({ baths: e.target.value })}
              options={[any('Any'), ...['1', '2', '3', '4+'].map((b) => ({ value: b, label: b === '4+' ? '4 or more' : b }))]}
            />
          </div>
        </Section>

        <Section title={filters.deal === 'sale' ? 'Asking price' : 'Price'} hint={filters.deal === 'any' ? 'Compared within each kind of listing.' : undefined}>
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Minimum"
              inputMode="numeric"
              value={filters.priceMin}
              onChange={(e) => onChange({ priceMin: e.target.value.replace(/\D/g, '') })}
              leftIcon={<span className="text-[14px] font-semibold">S$</span>}
              placeholder="Any"
            />
            <TextInput
              label="Maximum"
              inputMode="numeric"
              value={filters.priceMax}
              onChange={(e) => onChange({ priceMax: e.target.value.replace(/\D/g, '') })}
              leftIcon={<span className="text-[14px] font-semibold">S$</span>}
              placeholder="Any"
            />
          </div>
        </Section>

        <Section title="Size and floor">
          <div className="grid grid-cols-2 gap-4">
            <TextInput label="Floor area from" inputMode="numeric" value={filters.areaMin}
              onChange={(e) => onChange({ areaMin: e.target.value.replace(/\D/g, '') })} placeholder="Any" hint="sqft" />
            <TextInput label="Floor area to" inputMode="numeric" value={filters.areaMax}
              onChange={(e) => onChange({ areaMax: e.target.value.replace(/\D/g, '') })} placeholder="Any" hint="sqft" />
          </div>
          <SelectInput
            className="mt-4"
            label="Floor level"
            value={filters.floor}
            onChange={(e) => onChange({ floor: e.target.value as ListingFilters['floor'] })}
            options={[any('Any floor'), ...Object.entries(FLOOR_BANDS).map(([key, b]) => ({ value: key, label: b.label }))]}
            hint="Taken from the unit number."
          />
        </Section>

        <Section title="Location">
          <SelectInput
            label="Nearest MRT"
            value={filters.mrt}
            onChange={(e) => onChange({ mrt: e.target.value })}
            options={[any('Any station'), ...stations.map((m) => ({ value: m, label: m }))]}
          />
        </Section>

        {showRentOnly && (
          <Section title="Rental" hint="Only applies to listings for rent.">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectInput
                label="Furnishing"
                value={filters.furnishing}
                onChange={(e) => onChange({ furnishing: e.target.value })}
                options={[any('Any'), ...FURNISHINGS.map((f) => ({ value: f, label: f }))]}
              />
              <SelectInput
                label="Available"
                value={filters.available}
                onChange={(e) => onChange({ available: e.target.value })}
                options={[any('Any time'), ...AVAILABILITY.map((a) => ({ value: a.key, label: a.label }))]}
              />
            </div>
          </Section>
        )}

        {showSaleOnly && (
          <Section title="Ownership" hint="Mostly asked of listings for sale.">
            <SelectInput
              label="Tenure"
              value={filters.tenure}
              onChange={(e) => onChange({ tenure: e.target.value })}
              options={[any('Any tenure'), ...TENURES.map((t) => ({ value: t, label: t }))]}
            />
          </Section>
        )}
      </div>
    </Drawer>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[13px] font-semibold text-p1-text-3">{title}</h3>
      {hint && <p className="mt-0.5 text-[12.5px] text-p1-text-3">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}
