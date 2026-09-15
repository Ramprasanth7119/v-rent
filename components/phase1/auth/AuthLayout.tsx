"use client";

/**
 * The frame for signing in and creating an account.
 *
 * Portals put these on their own page rather than inside the application
 * chrome: there is no navigation to offer someone who is not signed in, and the
 * panel beside the form is where the product makes its case.
 *
 * The form sits in a raised card on a pale sky rather than floating in a white
 * half of the screen. A form with nothing around it reads as unfinished at any
 * window size above a laptop, because the eye has nothing to fix the column
 * against; a card gives it an edge, and centring the card means the layout is
 * the same at 1280 and at 2560. Below `lg` the navy panel folds away to a
 * single header strip, because on a phone the case has already been made.
 */

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, FileCheck2, Share2 } from 'lucide-react';

const POINTS = [
  {
    icon: ShieldCheck,
    title: 'Checked against the CEA register',
    body: 'Your registration number is verified against the public Council for Estate Agencies register the moment you enter it.',
  },
  {
    icon: FileCheck2,
    title: 'Compliant advertising by default',
    body: 'Your name, registration number and agency licence are carried onto every listing and every exported document.',
  },
  {
    icon: Share2,
    title: 'Built for how Singapore agents work',
    body: 'Share a listing to WhatsApp, export a client shortlist as a branded PDF, and keep your portfolio in one place.',
  },
];

/**
 * The same drawn skyline the agent hub opens on, at the foot of the page.
 * It costs no request, survives both themes, and is what stops this reading as
 * a sign-in form that could belong to any product.
 */
function Skyline() {
  return (
    <svg
      viewBox="0 0 1200 200"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[16vh] w-full text-p1-text-3 opacity-[0.06] dark:opacity-[0.12]"
    >
      <path
        fill="currentColor"
        d="M0 200 V150 h46 V118 h38 V150 h30 V96 h54 V64 h6 V30 h6 V64 h6 V96 h40 V132 h44 V88 h58 V128 h34 V150 h52 V104 h48 V70 h5 V36 h5 V70 h5 V104 h42 V140 h60 V112 h44 V146 h38 V84 h56 V120 h48 V150 h40 V98 h50 V58 h6 V26 h6 V58 h6 V98 h46 V134 h56 V110 h42 V144 h52 V92 h48 V126 h38 V152 h44 V116 h40 V200 Z"
      />
    </svg>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  wide = false,
  pitch = true,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Widens the form column for the multi-step account form. */
  wide?: boolean;
  /**
   * Whether the panel argues the case for an account.
   *
   * True where that argument is still open — creating an account, resetting a
   * password before a first sign-in. False on sign-in, where the reader has
   * already decided and the three claims are just more to read past.
   */
  pitch?: boolean;
}) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-p1-bg px-4 py-6 sm:px-6 sm:py-10">
      <Skyline />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[1120px] flex-col sm:min-h-[calc(100vh-5rem)]">
        <div className="my-auto w-full">
          {/* The mark, outside the card, so the page is identifiable before the
              form is read and there is something to click back to. */}
          <Link href="/phase1" className="mb-5 inline-flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-p1-primary text-[17px] font-bold text-p1-primary-on">V</span>
            <span className="font-p1display text-[16px] font-bold tracking-[-0.02em] text-p1-text">V-RENT</span>
          </Link>

          <div
            className={`grid w-full overflow-hidden rounded-2xl bg-p1-surface shadow-p1-lg ring-1 ring-p1-border ${
              wide ? 'lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]'
            }`}
          >
            {/* ------------------------------------------------------ the case */}
            <aside className="relative hidden overflow-hidden bg-p1-sidebar px-9 py-10 text-white lg:flex lg:flex-col xl:px-11">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.18]"
                aria-hidden
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 12% 0%, rgba(96,165,250,.35) 0, transparent 50%)',
                }}
              />

              <Link href="/phase1" className="relative flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[17px] font-bold text-[#0B1220]">V</span>
                <span>
                  <span className="block font-p1display text-[15.5px] font-bold leading-5 tracking-[-0.02em]">V-RENT</span>
                  <span className="block text-[11.5px] text-white/55">For CEA-registered agents</span>
                </span>
              </Link>

              <div className="relative mt-10 xl:mt-12">
                <h2 className="text-[26px] font-semibold leading-[1.18] tracking-[-0.022em] text-white text-balance xl:text-[28px]">
                  Every listing you publish carries proof that you are registered to sell it.
                </h2>
                {pitch && (
                  <ul className="mt-8 space-y-5">
                    {POINTS.map((p) => (
                      <li key={p.title} className="flex gap-3.5">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white" aria-hidden>
                          <p.icon size={16} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold text-white">{p.title}</span>
                          <span className="mt-0.5 block text-[13px] leading-[1.55] text-white/60">{p.body}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="relative mt-auto pt-10 text-[11.5px] leading-5 text-white/45">
                Proof of concept · V-One Automation · Registration details come from the public CEA register on
                data.gov.sg.
              </p>
            </aside>

            {/* ------------------------------------------------------ the form */}
            <main className="flex flex-col justify-center px-5 py-8 sm:px-9 sm:py-11 lg:px-11">
              <div className={`mx-auto w-full ${wide ? 'max-w-[560px]' : 'max-w-[400px]'}`}>
                <h1 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.022em] text-p1-text text-balance sm:text-[28px]">
                  {title}
                </h1>
                {subtitle && <p className="mt-2.5 text-[14.5px] leading-6 text-p1-text-2">{subtitle}</p>}
                <div className="mt-7">{children}</div>
                {footer && <div className="mt-8 text-[13.5px] text-p1-text-2">{footer}</div>}
              </div>
            </main>
        </div>
        </div>
      </div>
    </div>
  );
}
