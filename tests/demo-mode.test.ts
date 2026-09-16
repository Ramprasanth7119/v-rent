/**
 * The global Demo Data switch.
 *
 * ON must mean the demo account everywhere, OFF must mean the agent's own
 * records everywhere, and the two must never mix or leak: demo records are
 * refused by the store, real screens never show generated figures, and there
 * is exactly one switch.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  DEMO_DATA_COOKIE, demoDataProvider, demoWorkspace, isDemoId, originalDataProvider, providerFor,
} from '../lib/phase1/report-data';
import { SEED_LISTINGS } from '../lib/phase1/data';
import { DEFAULT_NOTIFICATIONS, sanitisePatch } from '../lib/phase1/workspace';
import { isMeasured, listingStats, totals, viewsSeries } from '../lib/phase1/performance';

const NOW = new Date('2026-09-16T10:00:00+08:00');
const ROOT = path.join(__dirname, '..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

const identity = {
  profile: {
    fullName: 'Tan Wei Ming', email: 'agent@example.test', mobile: '', ceaNumber: 'R123456A',
    agency: 'Example Realty', agencyLicence: 'L3000000A', bio: '', experienceYears: '',
  },
  notifications: { ...DEFAULT_NOTIFICATIONS },
  emailVerified: true,
};

describe('choosing a provider', () => {
  it('ON selects the demo provider and OFF the original one', () => {
    expect(providerFor(true)).toBe(demoDataProvider);
    expect(providerFor(false)).toBe(originalDataProvider);
    expect(providerFor(true).mode).toBe('demo');
    expect(providerFor(false).mode).toBe('original');
  });
});

describe('the demo account', () => {
  const w = demoWorkspace(identity, NOW);

  it('is one coherent data set: every reference points at a record in it', () => {
    const ids = new Set(w.listings.map((l) => l.id));
    expect(w.listings.length).toBeGreaterThan(5);
    expect(w.enquiries.length).toBeGreaterThan(5);
    for (const e of w.enquiries) expect(ids.has(e.listingId)).toBe(true);
    for (const s of w.tools.slots) if (s.listingId !== 'any') expect(ids.has(s.listingId)).toBe(true);
    for (const s of w.tools.shortlists) for (const id of s.listingIds) expect(ids.has(id)).toBe(true);
    for (const r of w.tools.refresh) expect(ids.has(r.listingId)).toBe(true);
    for (const a of w.alerts) {
      const m = a.href?.match(/listings\/([^/?]+)/);
      if (m) expect(ids.has(m[1])).toBe(true);
    }
  });

  it('marks every record it makes as demo', () => {
    const all = [...w.listings, ...w.enquiries, ...w.alerts, ...w.tools.slots, ...w.tools.shortlists, ...w.tools.tickets];
    for (const r of all) expect(isDemoId(r.id)).toBe(true);
  });

  it('books a viewing slot for every enquiry that has a viewing', () => {
    const booked = new Set(w.tools.slots.filter((s) => s.booking).map((s) => s.booking?.name));
    for (const e of w.enquiries.filter((x) => x.viewingAt)) expect(booked.has(e.name)).toBe(true);
  });

  it('keeps the signed-in identity and is the same on every render', () => {
    expect(w.profile.fullName).toBe('Tan Wei Ming');
    expect(w.profile.ceaNumber).toBe('R123456A');
    expect(demoWorkspace(identity, NOW)).toEqual(w);
  });

  it('uses no placeholder people or unmasked numbers', () => {
    const text = JSON.stringify(w);
    expect(text).not.toMatch(/John Doe|Lorem|test@test|12345678/i);
    for (const e of w.enquiries) expect(e.contact).toContain('•');
  });

  it('has traffic figures, and none before a listing went live', () => {
    const live = w.listings.filter((l) => l.status === 'published');
    expect(totals(live).measured).toBe(true);
    expect(totals(live).views7d).toBeGreaterThan(0);
    for (const l of live) {
      const since = Math.floor((NOW.getTime() - new Date(l.publishedAt as string).getTime()) / 86_400_000);
      const series = viewsSeries(l, 365);
      if (since < 300) expect(series.slice(0, 365 - since - 2).every((v) => v === 0)).toBe(true);
    }
  });
});

describe('the agent\'s own data', () => {
  const real = SEED_LISTINGS.map((l) => ({ ...l, status: 'published' as const }));

  it('never shows generated traffic', () => {
    for (const l of real) {
      expect(isMeasured(l)).toBe(false);
      const s = listingStats(l);
      expect(s.measured).toBe(false);
      expect(s.views30d + s.saves + s.enquiries30d).toBe(0);
    }
    expect(totals(real).measured).toBe(false);
  });

  it('uses the stored enquiries as they are, with nothing added', () => {
    const set = originalDataProvider.enquiries({ listings: real, enquiries: [] }, NOW);
    expect(set.enquiries).toEqual([]);
  });
});

describe('demo records cannot be saved', () => {
  it('drops demo listings, enquiries and alerts from a workspace write', () => {
    const w = demoWorkspace(identity, NOW);
    const patch = sanitisePatch({ listings: w.listings, enquiries: w.enquiries, alerts: w.alerts });
    expect(patch.listings).toEqual([]);
    expect(patch.enquiries).toEqual([]);
    expect(patch.alerts).toEqual([]);
  });

  it('keeps real records in the same write', () => {
    const w = demoWorkspace(identity, NOW);
    const own = { ...SEED_LISTINGS[0] };
    const patch = sanitisePatch({ listings: [...w.listings, own] });
    expect(patch.listings?.map((l) => l.id)).toEqual([own.id]);
  });

  it('never sends the workspace to the server while the demo account is on screen', () => {
    const src = read('lib/phase1/DemoContext.tsx');
    // The demo branch of `apply` returns before `schedule()` is reached.
    const apply = src.slice(src.indexOf('const apply = '), src.indexOf('const set = '));
    const demoBranch = apply.slice(apply.indexOf('if (demoOn)'), apply.indexOf('return;') + 7);
    expect(demoBranch).not.toMatch(/schedule|fetch/);
    // Polling stops while it is on.
    expect(src).toMatch(/if \(!persists \|\| demoOn\) return;/);
    // The save buffer holds the agent's own workspace, never the demo one.
    expect(src).toMatch(/const latest = useRef\(own\)/);
  });
});

describe('one switch', () => {
  const files = (dir: string): string[] => readdirSync(path.join(ROOT, dir)).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(path.join(ROOT, p)).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });

  it('is rendered in exactly one place, the application header', () => {
    const users = [...files('app'), ...files('components')].filter((f) => /<DemoDataSwitch\b/.test(read(f)));
    expect(users.map((f) => f.replace(/\\/g, '/'))).toEqual(['components/phase1/Shell.tsx']);
  });

  it('is turned only through setDemoDataOn, by the switch itself', () => {
    const callers = [...files('app'), ...files('components'), ...files('lib')]
      .filter((f) => /setDemoDataOn\(/.test(read(f)))
      .map((f) => f.replace(/\\/g, '/'))
      .sort();
    expect(callers).toEqual(['components/phase1/DemoDataSwitch.tsx', 'lib/phase1/report-data/switch.ts']);
  });

  it('is read by the server from the same cookie the browser writes', () => {
    expect(read('app/phase1/layout.tsx')).toMatch(/DEMO_DATA_COOKIE/);
    expect(read('lib/phase1/report-data/server.ts')).toMatch(/DEMO_DATA_COOKIE/);
    expect(read('lib/phase1/report-data/switch.ts')).toMatch(/DEMO_DATA_COOKIE/);
    expect(DEMO_DATA_COOKIE).toBe('vrent_demo_data');
  });

  it('is an accessible switch', () => {
    const src = read('components/phase1/DemoDataSwitch.tsx');
    expect(src).toMatch(/role="switch"/);
    expect(src).toMatch(/aria-checked=\{on\}/);
    expect(src).toMatch(/aria-label="Demo Data"/);
  });
});

describe('the switch in the browser', () => {
  let cookie = '';
  let search = '';

  beforeEach(() => {
    cookie = '';
    search = '';
    vi.resetModules();
    vi.stubGlobal('document', {
      get cookie() { return cookie; },
      set cookie(v: string) {
        const [pair, ...attrs] = v.split(';');
        cookie = attrs.some((a) => a.trim() === 'max-age=0') ? '' : pair.trim();
      },
    });
    vi.stubGlobal('window', {
      get location() { return { search, href: `http://localhost/phase1/dashboard${search}` }; },
      history: { state: null, replaceState: () => undefined },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('persists across navigation in the session cookie', async () => {
    const sw = await import('../lib/phase1/report-data/switch');
    sw.setDemoDataOn(true);
    expect(cookie).toBe('vrent_demo_data=on');
    // A new page load reads it back.
    vi.resetModules();
    const again = await import('../lib/phase1/report-data/switch');
    again.resetDemoDataForTests();
    const { renderToString } = await import('react-dom/server');
    const { createElement } = await import('react');
    function Probe() { return createElement('span', null, String(again.useDemoDataOn())); }
    // The server render uses the value the layout read from the cookie.
    expect(renderToString(createElement(again.DemoDataModeProvider, { initial: true, children: createElement(Probe) }))).toContain('true');
    sw.setDemoDataOn(false);
    expect(cookie).toBe('');
  });

  it('renders the server value on first paint whatever the address says, then remembers the choice', async () => {
    search = '?demo=on';
    const sw = await import('../lib/phase1/report-data/switch');
    const { renderToString } = await import('react-dom/server');
    const { createElement } = await import('react');
    function Probe() { return createElement('span', null, String(sw.useDemoDataOn())); }
    renderToString(createElement(sw.DemoDataModeProvider, { initial: false, children: createElement(Probe) }));
    expect(cookie).toBe('');
    sw.setDemoDataOn(true, { keepAddress: true });
    expect(cookie).toBe('vrent_demo_data=on');
  });
});

describe('the operations console', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'vrent-demo-'));
    process.env.VRENT_DATA_DIR = dir;
    delete process.env.MONGODB_URI;
    vi.resetModules();
  });

  afterEach(async () => {
    delete process.env.VRENT_DATA_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  it('lists only real accounts with the switch OFF, and adds the marked sample roster with it ON', async () => {
    const { agentDirectory, agentDetail } = await import('../lib/phase1/admin-directory');
    const off = await agentDirectory({ demo: false });
    expect(off.every((a) => a.real)).toBe(true);
    const on = await agentDirectory({ demo: true });
    const samples = on.filter((a) => !a.real);
    expect(samples.length).toBeGreaterThan(0);
    expect(await agentDetail(samples[0].id, { demo: false })).toBeNull();
    expect((await agentDetail(samples[0].id, { demo: true }))?.agent.real).toBe(false);
  });
});
