"use client";

/**
 * The Demo Data switch, the line shown under the header while it is ON, and
 * the badge beside anything drawn from demo data.
 *
 * There is one switch, in the application header. ON shows the demo account;
 * OFF shows the agent's live data. The wording comes from `report-data`, so no
 * two places can describe the switch differently.
 *
 * Demo data is a presentation mode the agent chose, not a fault, so it has its
 * own quiet colour (`p1-demo`) rather than the warning ramp: a small dot, a
 * tinted track, and one slim line of text — nothing that pulses or shouts.
 */

import { usePathname, useRouter } from 'next/navigation';
import { Tooltip, cx } from './kit';
import { DEMO_DATA_TOOLTIP_ON, demoDataTooltipOff } from '../../lib/phase1/report-data';
import { setDemoDataOn, useDemoDataOn } from '../../lib/phase1/report-data/switch';

/** Turn the switch, and re-read screens whose data was read on the server. */
function useTurnDemoData() {
  const router = useRouter();
  const pathname = usePathname();
  return (on: boolean) => {
    setDemoDataOn(on);
    // The operations console reads its data on the server; re-read it in the new mode. Agent screens switch in place.
    if (pathname.startsWith('/phase1/admin')) router.refresh();
  };
}

/** The small status dot used by every demo indicator. Static: it marks a state, it does not ask for attention. */
function DemoDot({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden className={cx('relative flex h-2 w-2 shrink-0 items-center justify-center self-center', className)}>
      <span className="absolute inset-0 rounded-full bg-p1-demo opacity-25" style={{ transform: 'scale(1.9)' }} />
      <span className="relative block h-2 w-2 rounded-full bg-p1-demo" />
    </span>
  );
}

export function DemoDataSwitch({
  backend = 'mongodb', className = '',
}: { backend?: 'mongodb' | 'files'; className?: string }) {
  const on = useDemoDataOn();
  const turn = useTurnDemoData();
  const explain = on ? DEMO_DATA_TOOLTIP_ON : demoDataTooltipOff(backend);
  return (
    <Tooltip content={explain} side="bottom">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Demo Data"
        aria-describedby="p1-demo-data-state"
        onClick={() => turn(!on)}
        className={cx(
          'group inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border pl-2.5 pr-1.5 text-[13px] font-medium',
          'transition-[background-color,border-color,color] duration-200 ease-[var(--p1-ease)] motion-reduce:transition-none',
          'focus-visible:shadow-[0_0_0_3px_var(--p1-ring)] focus-visible:outline-none',
          on
            ? 'border-p1-demo-border bg-p1-demo-soft text-p1-text'
            : 'border-p1-border bg-p1-surface text-p1-text-2 hover:border-p1-border-strong hover:text-p1-text',
          className,
        )}
      >
        {/* The dot is the at-a-glance cue; off, it stays a neutral outline so the pill keeps its shape. */}
        <span aria-hidden className="relative inline-flex h-2 w-2 shrink-0">
          <span className={cx('absolute inset-0 rounded-full border transition-opacity duration-200', on ? 'opacity-0' : 'border-p1-border-strong opacity-100')} />
          <span className={cx('absolute inset-0 flex transition-opacity duration-200', on ? 'opacity-100' : 'opacity-0')}><DemoDot /></span>
        </span>
        {/* The word is dropped on the narrowest phones. The header row is the
            menu button, the mark and this cluster, and spelling the switch out
            needs 370px of it — at 320 that pushed the avatar 34px past the
            right edge and the whole page scrolled sideways to reach it. 375px
            is the narrowest phone that still fits the word, so that is where it
            comes back. Below it the dot and the track still say which way the
            switch is set, and aria-label still names the control. */}
        <span className="hidden whitespace-nowrap min-[375px]:inline">Demo Data</span>
        <span
          id="p1-demo-data-state"
          className={cx('hidden min-w-[1.75rem] text-left text-[11.5px] font-semibold tracking-wide sm:inline', on ? 'text-p1-demo' : 'text-p1-text-3')}
        >
          <span className="sr-only">{explain} </span>
          <span aria-hidden>{on ? 'ON' : 'OFF'}</span>
        </span>
        <span
          aria-hidden
          className={cx(
            'relative h-[18px] w-8 shrink-0 rounded-full transition-colors duration-200 motion-reduce:transition-none',
            on ? 'bg-p1-demo' : 'bg-p1-border-strong',
          )}
        >
          <span
            className={cx(
              'absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-p1-sm transition-transform duration-200 ease-[var(--p1-ease)] motion-reduce:transition-none',
              on ? 'translate-x-3.5' : 'translate-x-0',
            )}
          />
        </span>
      </button>
    </Tooltip>
  );
}

/**
 * The slim line under the header while Demo Data is ON. It says the two things
 * that matter — this is sample data, and nothing done here is kept — and points
 * at the one switch rather than being a second one.
 */
export function DemoDataStrip() {
  const on = useDemoDataOn();
  if (!on) return null;
  return (
    <div
      role="status"
      className="vr-fade flex min-h-8 items-center justify-center gap-2.5 border-t border-p1-demo-border bg-p1-demo-soft px-4 py-1 text-center text-[12.5px] leading-5 text-p1-text-2"
    >
      <DemoDot />
      <span>
        <span className="font-medium text-p1-text">Demo data is being shown</span>
        <span className="hidden sm:inline"> · Changes you make here are not saved</span>
        <span className="sm:hidden"> · changes not saved</span>
        <span className="hidden text-p1-text-3 md:inline"> · Turn Demo Data off above to see live data</span>
      </span>
    </div>
  );
}

/** Beside anything drawn from demo data. `title` carries the provider's notice. */
export function DemoBadge({ title, className = '' }: { title?: string | null; className?: string }) {
  return (
    <span
      title={title ?? undefined}
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-p1-demo-border bg-p1-demo-soft px-2 py-0.5 text-[12px] font-medium text-p1-text-2',
        className,
      )}
    >
      <DemoDot className="scale-75" />
      Demo data
    </span>
  );
}
