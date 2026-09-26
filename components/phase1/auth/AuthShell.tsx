"use client";

/**
 * The frame for signing in, creating an account and recovering one.
 *
 * It opens on the same night sky and drawn skyline as the public landing page,
 * so moving from "List with V-RENT" to this screen feels like the same product,
 * not a login template bolted on. On a desktop the sky is a sticky panel beside
 * the form; below `lg` it folds into a short band with the form in a sheet over
 * it, because on a phone the form is the page.
 *
 * The form column is top-aligned rather than centred. The steps are different
 * heights, and a centred column would move the whole form on every step.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, BadgeCheck, ShieldCheck } from 'lucide-react';
import { Skyline } from '../landing/Skyline';
import { cx } from '../kit';

/** What the credential card shows once the register has answered. */
export interface Credential {
  name: string;
  agency: string;
  registrationNo: string;
  agencyLicenceNo: string;
}

export type AuthScene = 'signin' | 'signup' | 'recover';

const HEADLINE: Record<AuthScene, string> = {
  signin: 'The workspace for Singapore’s registered agents.',
  signup: 'Every listing carries proof you’re registered to sell it.',
  recover: 'The workspace for Singapore’s registered agents.',
};

function Mark({ onDark = false }: { onDark?: boolean }) {
  return (
    <Link href="/phase1" className="group inline-flex items-center gap-2.5 rounded-lg" aria-label="V-RENT home">
      <span
        className={cx(
          'flex h-9 w-9 items-center justify-center rounded-lg text-[17px] font-bold transition-transform duration-200 group-hover:-rotate-3',
          onDark ? 'bg-white text-[#0B1220]' : 'bg-p1-primary text-p1-primary-on',
        )}
        aria-hidden
      >
        V
      </span>
      <span className={cx('font-p1display text-[16px] font-bold tracking-[-0.02em]', onDark ? 'text-white' : 'text-p1-text')}>V-RENT</span>
    </Link>
  );
}

/**
 * A listing as the public will see it, reduced to the part the account is for:
 * the agent strip. Before the register has answered it shows what goes there,
 * not an invented agent; after, it shows the applicant's own record.
 */
function ListingCredential({ credential }: { credential?: Credential | null }) {
  const initials = credential
    ? credential.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '';
  return (
    <figure className="w-full max-w-[400px]">
      <div className="overflow-hidden rounded-2xl bg-white text-[#0B1220] shadow-[0_32px_64px_-24px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
        <div className="relative aspect-[16/9] bg-[#1C2E52]">
          {/* An existing demo photograph (Unsplash licence, see public/demo/properties/CREDITS.txt).
              Lazy: the panel is not drawn below `lg`, so a phone never fetches it. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- pre-cropped static file with its own 560/1400 srcset */}
          <img
            src="/demo/properties/lst-1-thumb.jpg"
            srcSet="/demo/properties/lst-1-thumb.jpg 560w, /demo/properties/lst-1.jpg 1400w"
            sizes="400px"
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold text-[#0B1220] shadow-sm">
            <ShieldCheck size={13} className="text-[#059669]" aria-hidden />
            Listed by a CEA-registered agent
          </span>
        </div>

        <div className="flex items-center gap-3 px-4 py-3.5">
          <span
            className={cx(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold',
              credential ? 'p1-auth-pop bg-[#2563EB] text-white' : 'border border-dashed border-[#D0D5DD] text-[#98A2B3]',
            )}
            aria-hidden
          >
            {credential ? initials : ''}
          </span>
          <span key={credential?.registrationNo ?? 'blank'} className={cx('min-w-0 flex-1', credential && 'p1-auth-in')}>
            <span className={cx('block truncate text-[14px] font-semibold', credential ? 'text-[#0B1220]' : 'text-[#98A2B3]')}>
              {credential?.name ?? 'Your name'}
            </span>
            <span className={cx('block truncate text-[12.5px]', credential ? 'text-[#475467]' : 'text-[#98A2B3]')}>
              {credential?.agency ?? 'Your agency'}
            </span>
          </span>
          {credential && (
            <span className="p1-auth-pop inline-flex shrink-0 items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-1 text-[11.5px] font-semibold text-[#047857]">
              <BadgeCheck size={13} aria-hidden /> Verified
            </span>
          )}
        </div>
        <dl className="grid grid-cols-2 border-t border-[#EAECF0] text-[12px]">
          <div className="px-4 py-2.5">
            <dt className="text-[#667085]">CEA reg. no.</dt>
            <dd className={cx('mt-0.5 font-mono font-medium', credential ? 'text-[#0B1220]' : 'text-[#98A2B3]')}>
              {credential?.registrationNo ?? 'R·······'}
            </dd>
          </div>
          <div className="border-l border-[#EAECF0] px-4 py-2.5">
            <dt className="text-[#667085]">Agency licence</dt>
            <dd className={cx('mt-0.5 font-mono font-medium', credential ? 'text-[#0B1220]' : 'text-[#98A2B3]')}>
              {credential?.agencyLicenceNo ?? 'L·······'}
            </dd>
          </div>
        </dl>
      </div>
      <figcaption className="mt-4 max-w-[400px] text-[13.5px] leading-6 text-white/65">
        {credential
          ? 'This is you on the public register. It goes on every listing and client PDF you share.'
          : 'Your name, CEA number and agency licence go on every listing and client PDF you share, as Singapore’s advertising rules require.'}
      </figcaption>
    </figure>
  );
}

export function AuthShell({
  scene,
  credential,
  aside,
  children,
}: {
  scene: AuthScene;
  /** The applicant's register record, once found. Fills the card beside the form. */
  credential?: Credential | null;
  /** A line at the top right of the form column: usually the way to the other form. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="p1-auth relative flex min-h-dvh flex-col bg-p1-surface lg:flex-row">
      {/* ------------------------------------------------------------ the sky */}
      <aside className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#0B1220_0%,#0F1D3A_62%,#16295A_100%)] text-white lg:sticky lg:top-0 lg:h-dvh lg:w-[46%] lg:min-w-[440px] lg:shrink-0 lg:border-r lg:border-white/5">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_85%_0%,rgba(96,165,250,0.24),transparent_70%)]" />
        <Skyline className="p1-auth-in pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[104px] w-full sm:h-[120px] lg:h-[210px]" />

        <div className="px-5 pb-14 pt-5 sm:px-8 sm:pb-20 lg:mx-auto lg:flex lg:h-full lg:w-full lg:max-w-[calc(600px_+_2*clamp(40px,5vw,88px))] lg:flex-col lg:px-[clamp(40px,5vw,88px)] lg:py-10">
          <div className="flex items-center justify-between gap-3">
            <Mark onDark />
            <span className="hidden rounded-full border border-white/15 px-2.5 py-1 text-[12px] font-medium text-white/70 lg:inline">
              Agent workspace
            </span>
            <Link
              href="/phase1/homes"
              className="-mr-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13.5px] font-medium text-white/75 hover:text-white lg:hidden"
            >
              Browse homes <ArrowUpRight size={15} aria-hidden />
            </Link>
          </div>
          {/* On a phone the case is one line, not a panel. */}
          <p className="p1-auth-in mt-4 max-w-[360px] font-p1display text-[16px] font-semibold leading-snug tracking-[-0.01em] text-white/90 text-balance sm:text-[18px] lg:hidden">
            {HEADLINE[scene]}
          </p>

          <div className="p1-auth-stagger hidden flex-1 flex-col justify-center gap-8 pb-[150px] pt-10 lg:flex">
            <p className="max-w-[460px] font-p1display text-[clamp(30px,2.6vw,40px)] font-bold leading-[1.1] tracking-[-0.03em] text-white text-balance">
              {HEADLINE[scene]}
            </p>
            <ListingCredential credential={credential} />
          </div>
        </div>
      </aside>

      {/* ----------------------------------------------------------- the form */}
      <main className="relative -mt-6 flex flex-1 flex-col rounded-t-[24px] bg-p1-surface lg:mt-0 lg:rounded-none">
        <div className="flex min-h-[56px] items-center justify-end gap-4 px-5 pt-4 text-[13.5px] text-p1-text-2 sm:px-8 lg:px-10 lg:pt-6">
          {aside}
        </div>

        <div className="mx-auto w-full max-w-[440px] flex-1 px-5 pb-10 pt-4 sm:px-0 sm:pt-8 lg:pt-[clamp(24px,11vh,120px)]">
          {children}
        </div>

        <footer className="mx-auto flex w-full max-w-[440px] flex-col gap-1.5 border-t border-p1-border px-5 py-5 text-[12.5px] leading-5 text-p1-text-3 sm:px-0 lg:mb-4">
          <p>
            Looking for a home? You don’t need an account —{' '}
            <Link href="/phase1/homes" className="font-medium text-p1-text-2 underline-offset-4 hover:text-p1-text hover:underline">
              browse homes
            </Link>
            .
          </p>
          <p>Proof of concept by V-One Automation. Registration details come from the public CEA register on data.gov.sg.</p>
        </footer>
      </main>
    </div>
  );
}
