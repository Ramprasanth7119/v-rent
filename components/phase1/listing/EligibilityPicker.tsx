"use client";

/**
 * Who an HDB flat is open to, under the block's ethnic quota.
 *
 * Phrased throughout as an opening rather than a closing. The agent ticks the
 * groups the quota still has room for, and the control shows them the sentence
 * a tenant will read, so they can see it says "open to Malay households" and
 * not anything resembling the exclusion they might otherwise have typed into
 * the description.
 *
 * Shown only for HDB. Everywhere else there is no quota, and a field like this
 * would be a tool for doing the thing the product refuses.
 */

import { Check, Info, Users } from 'lucide-react';
import { cx } from '../kit';
import {
  CITIZENSHIP_GROUPS, EIP_EXPLAINER, ETHNIC_GROUPS, eligibilitySentence,
  type CitizenshipGroup, type EipEligibility, type EthnicGroup,
} from '../../../lib/phase1/eip';

function Box({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      className={cx(
        'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-[13.5px]',
        on ? 'border-p1-primary bg-p1-primary-soft font-medium text-p1-primary' : 'border-p1-border-strong bg-p1-surface text-p1-text hover:border-p1-text-3/60',
      )}
    >
      <span
        aria-hidden
        className={cx(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
          on ? 'border-p1-primary bg-p1-primary text-p1-primary-on' : 'border-p1-border-strong',
        )}
      >
        {on && <Check size={11} strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}

export function EligibilityPicker({
  value,
  onChange,
}: {
  value: EipEligibility;
  onChange: (next: EipEligibility) => void;
}) {
  const toggleEthnic = (key: EthnicGroup) => onChange({
    ...value,
    ethnic: value.ethnic.includes(key) ? value.ethnic.filter((k) => k !== key) : [...value.ethnic, key],
  });

  const toggleCitizenship = (key: CitizenshipGroup) => onChange({
    ...value,
    citizenship: value.citizenship.includes(key) ? value.citizenship.filter((k) => k !== key) : [...value.citizenship, key],
  });

  const preview = eligibilitySentence(value);

  return (
    <section className="rounded-xl border border-p1-border bg-p1-surface">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-p1-border px-4 py-3">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-p1-text">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-p1-subtle text-p1-text-2" aria-hidden><Users size={15} /></span>
          Who this flat is open to
        </h3>
        <span className="rounded-full bg-p1-subtle px-2 py-0.5 text-[11px] font-medium text-p1-text-3">HDB only</span>
      </div>

      <div className="p-4">
      <p className="flex items-start gap-1.5 text-[12.5px] leading-5 text-p1-text-3">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
        {EIP_EXPLAINER}
      </p>

      <fieldset className="mt-3.5">
        <legend className="mb-2 text-[12.5px] font-semibold text-p1-text-2">Ethnic group</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ETHNIC_GROUPS.map((g) => (
            <Box key={g.key} on={value.ethnic.includes(g.key)} label={g.label} onClick={() => toggleEthnic(g.key)} />
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-3.5">
        <legend className="mb-2 text-[12.5px] font-semibold text-p1-text-2">Citizenship</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CITIZENSHIP_GROUPS.map((g) => (
            <Box key={g.key} on={value.citizenship.includes(g.key)} label={g.label} onClick={() => toggleCitizenship(g.key)} />
          ))}
        </div>
      </fieldset>

      {/* The agent sees the tenant's sentence, not their own ticks. */}
      <div className="mt-3.5 rounded-lg bg-p1-subtle px-3 py-2.5">
        <div className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-p1-text-3">Tenants will read</div>
        <p className="mt-1 text-[13.5px] leading-5 text-p1-text">
          {preview ?? <span className="text-p1-text-3">Nothing yet — tick the groups the block still has room for.</span>}
        </p>
      </div>
      </div>
    </section>
  );
}
