"use client";

/**
 * The frame for signing in and creating an account.
 *
 * Portals put these on their own page rather than inside the application
 * chrome: there is no navigation to offer someone who is not signed in, and the
 * left panel is where the product makes its case. One column below `lg`.
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
    body: 'Share a listing to WhatsApp, export a client shortlist as a branded PDF, and keep your whole portfolio in one place.',
  },
];

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-p1-surface lg:grid lg:grid-cols-[minmax(0,44%)_minmax(0,56%)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-p1-sidebar px-10 py-12 text-white lg:flex lg:flex-col xl:px-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 12%, rgba(255,255,255,.5) 0, transparent 42%), radial-gradient(circle at 88% 78%, rgba(212,175,55,.55) 0, transparent 46%)',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-p1-accent font-p1display text-[19px] text-[#0E2350]">V</span>
          <span>
            <span className="block text-[15px] font-semibold leading-5 tracking-tight">V-RENT</span>
            <span className="block text-[11.5px] text-white/60">Singapore rental platform for agents</span>
          </span>
        </div>

        <div className="relative mt-auto max-w-md pt-16">
          <h2 className="font-p1display text-[30px] leading-[1.18] text-white xl:text-[34px]">
            Every listing you publish carries proof that you are registered to sell it.
          </h2>
          <ul className="mt-9 space-y-6">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-p1-accent" aria-hidden>
                  <p.icon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-white">{p.title}</span>
                  <span className="mt-0.5 block text-[13.5px] leading-6 text-white/65">{p.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-auto pt-14 text-[12px] text-white/45">
          Proof of concept · V-One Automation · Data shown for registered salespersons comes from the public CEA register.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-screen flex-col px-5 py-8 sm:px-10 lg:px-14 lg:py-12">
        <div className="flex items-center justify-between lg:hidden">
          <Link href="/phase1" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-p1-primary font-p1display text-[17px] text-white">V</span>
            <span className="text-[15px] font-semibold tracking-tight text-p1-text">V-RENT</span>
          </Link>
        </div>

        <div className={`mx-auto flex w-full flex-1 flex-col justify-center py-8 ${wide ? 'max-w-[540px]' : 'max-w-[420px]'}`}>
          <h1 className="font-p1display text-[26px] leading-tight text-p1-text sm:text-[30px]">{title}</h1>
          {subtitle && <p className="mt-2 text-[14.5px] leading-6 text-p1-text-2">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>

        {footer && (
          <div className={`mx-auto w-full pt-6 text-[13.5px] text-p1-text-2 ${wide ? 'max-w-[540px]' : 'max-w-[420px]'}`}>
            {footer}
          </div>
        )}
      </main>
    </div>
  );
}
