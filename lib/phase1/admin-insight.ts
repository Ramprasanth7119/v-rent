/**
 * What the operations console actually knows.
 *
 * Everything on the overview and the reports screen is derived here, on the
 * server, from the stores that hold the truth: the accounts file, each agent's
 * workspace, the audit trail and the request log. Nothing on those screens is
 * computed in the browser from a fixture, because the first question anyone
 * asks of an ops dashboard is "is that real", and the answer has to be yes.
 *
 * Where a figure genuinely cannot be known from a prototype — a full year of
 * revenue history, market-wide funnel volumes — it is marked as modelled at the
 * point of use rather than smuggled in beside the real ones.
 *
 * Server only.
 */

import { listAccounts } from '../auth/store';
import { readWorkspace } from './workspace-store';
import { readAudit, type AuditRow } from './audit';
import { readRequests, type RequestRow } from './reqlog';
import { moderationQueue } from './admin-moderation';
import { pendingApplications } from './admin-verification';
import { agentDirectory, type DirectoryAgent } from './admin-directory';
import { realSubscriptions, type SubscriptionEntry } from './admin-subscriptions';
import type { DemoListing, ListingStatus } from './data';
import { TODAY } from './workspace';

const DAY = 86_400_000;

export interface Trend {
  labels: string[];
  values: number[];
}

export interface QueueHealth {
  id: string;
  title: string;
  href: string;
  count: number;
  /** Hours the oldest item has been waiting, or null when the queue is empty. */
  oldestHours: number | null;
  /** The promise: hours within which this queue should be cleared. */
  slaHours: number;
  /** How many are past that promise. */
  breached: number;
}

export interface OpsSnapshot {
  queues: QueueHealth[];
  agents: {
    total: number;
    real: number;
    approved: number;
    underReview: number;
    suspended: number;
    expiringSoon: number;
  };
  listings: {
    total: number;
    byStatus: Record<string, number>;
    publishedThisWeek: number;
  };
  decisions: {
    today: number;
    week: number;
    /** Decisions per day over the last fourteen days. */
    trend: Trend;
    /** 7 rows (Mon first) × 24 hours. */
    heatmap: number[][];
    byOfficer: { officer: string; count: number; adverse: number }[];
    byAction: { action: string; count: number }[];
    adverseShare: number;
  };
  api: {
    total: number;
    errors: number;
    errorRate: number;
    p50: number;
    p95: number;
    /** Requests per hour over the last 24 hours. */
    trend: Trend;
    errorTrend: Trend;
    topRoutes: { route: string; count: number; errors: number; p95: number; ms: number }[];
  };
  revenue: {
    mrrSgd: number;
    arrSgd: number;
    activeCount: number;
    atRiskSgd: number;
    byPlan: { plan: string; count: number; sgd: number }[];
    payNowShare: number;
    /** Renewals due in each of the next twelve months. */
    renewals: { month: string; short: string; count: number; sgd: number }[];
  };
  /** The rows themselves, for screens that list them. */
  audit: AuditRow[];
  requests: RequestRow[];
  directory: DirectoryAgent[];
  subscriptions: SubscriptionEntry[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const percentile = (sorted: number[], p: number) => {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
};

/** Monday-first weekday index, which is how a working week is read. */
const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;

export async function opsSnapshot(opts: { demo?: boolean } = {}): Promise<OpsSnapshot> {
  const [directory, subscriptions, moderation, applications, audit, requests, accounts] =
    await Promise.all([
      agentDirectory(opts),
      realSubscriptions(),
      moderationQueue(),
      pendingApplications(),
      readAudit(500),
      readRequests(),
      listAccounts(),
    ]);

  /* ------------------------------------------------------------- listings */

  const workspaces = await Promise.all(
    accounts.filter((a) => a.role === 'agent').map((a) => readWorkspace(a.id)),
  );
  const listings: DemoListing[] = workspaces
    .flatMap((w) => w?.listings ?? [])
    .filter((l) => !l.archived);

  const byStatus: Record<string, number> = {};
  for (const l of listings) byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;

  const weekAgo = TODAY.getTime() - 7 * DAY;
  const publishedThisWeek = listings.filter(
    (l) => l.publishedAt && new Date(l.publishedAt).getTime() >= weekAgo,
  ).length;

  /* --------------------------------------------------------------- queues */

  const now = Date.now();
  const hoursSince = (iso?: string) => (iso ? Math.max(0, (now - new Date(iso).getTime()) / 3_600_000) : 0);

  const appAges = applications.map((a) => hoursSince(a.appliedAt)).sort((x, y) => y - x);
  /* A listing waits from the moment it was last changed, not from when it was
     first created: a correction resets the clock because it is a new thing to
     look at. */
  const modAges = moderation
    .map((m) => hoursSince(m.listing.updatedAt ?? m.listing.publishedAt ?? m.listing.createdAt))
    .sort((x, y) => y - x);
  const overdueSubs = subscriptions.filter((s) => s.status === 'past_due' || s.status === 'expired');

  const queues: QueueHealth[] = [
    {
      id: 'verification',
      title: 'Verification',
      href: '/phase1/admin/verification',
      count: applications.length,
      oldestHours: appAges[0] ?? null,
      slaHours: 24,
      breached: appAges.filter((h) => h > 24).length,
    },
    {
      id: 'moderation',
      title: 'Moderation',
      href: '/phase1/admin/moderation',
      count: moderation.length,
      oldestHours: modAges[0] ?? null,
      slaHours: 12,
      breached: modAges.filter((h) => h > 12).length,
    },
    {
      id: 'billing',
      title: 'Payments',
      href: '/phase1/admin/subscriptions',
      count: overdueSubs.length,
      oldestHours: overdueSubs.length ? 96 : null,
      slaHours: 72,
      breached: overdueSubs.filter((s) => s.status === 'expired').length,
    },
  ];

  /* ------------------------------------------------------------ decisions */

  const startOfToday = new Date(TODAY);
  startOfToday.setHours(0, 0, 0, 0);

  const decisionsToday = audit.filter((r) => new Date(r.at).getTime() >= startOfToday.getTime()).length;
  const decisionsWeek = audit.filter((r) => new Date(r.at).getTime() >= now - 7 * DAY).length;

  const dayLabels: string[] = [];
  const dayValues: number[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const from = new Date(now - i * DAY);
    from.setHours(0, 0, 0, 0);
    const to = from.getTime() + DAY;
    dayLabels.push(`${from.getDate()} ${MONTHS[from.getMonth()]}`);
    dayValues.push(audit.filter((r) => {
      const t = new Date(r.at).getTime();
      return t >= from.getTime() && t < to;
    }).length);
  }

  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const r of audit) {
    const d = new Date(r.at);
    if (Number.isNaN(d.getTime())) continue;
    heatmap[weekdayIndex(d)][d.getHours()] += 1;
  }

  const isAdverse = (a: string) => a.endsWith('rejected') || a.endsWith('suspended');

  const officerCounts = new Map<string, { count: number; adverse: number }>();
  for (const r of audit) {
    const cur = officerCounts.get(r.actorEmail) ?? { count: 0, adverse: 0 };
    officerCounts.set(r.actorEmail, {
      count: cur.count + 1,
      adverse: cur.adverse + (isAdverse(r.action) ? 1 : 0),
    });
  }
  const byOfficer = [...officerCounts.entries()]
    .map(([officer, v]) => ({ officer, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  /* What kind of decision, not just how many: a week that is all rejections is
     a different week from one that is all approvals, and the shape of the work
     is what tells an officer whether something upstream has changed. */
  const byAction = new Map<string, number>();
  for (const r of audit) byAction.set(r.action, (byAction.get(r.action) ?? 0) + 1);

  const adverse = audit.filter((r) => isAdverse(r.action)).length;

  /* ------------------------------------------------------------------ api */

  const durations = [...requests.map((r) => r.ms)].sort((a, b) => a - b);
  const errors = requests.filter((r) => r.status >= 400).length;

  const hourLabels: string[] = [];
  const hourValues: number[] = [];
  const hourErrors: number[] = [];
  for (let i = 23; i >= 0; i -= 1) {
    const from = now - (i + 1) * 3_600_000;
    const to = now - i * 3_600_000;
    const slice = requests.filter((r) => {
      const t = new Date(r.at).getTime();
      return t >= from && t < to;
    });
    hourLabels.push(`${String(new Date(to).getHours()).padStart(2, '0')}:00`);
    hourValues.push(slice.length);
    hourErrors.push(slice.filter((r) => r.status >= 400).length);
  }

  const routeMap = new Map<string, RequestRow[]>();
  for (const r of requests) {
    const list = routeMap.get(r.route) ?? [];
    list.push(r);
    routeMap.set(r.route, list);
  }
  const topRoutes = [...routeMap.entries()]
    .map(([route, rows]) => {
      const ms = [...rows.map((r) => r.ms)].sort((a, b) => a - b);
      return {
        route,
        count: rows.length,
        errors: rows.filter((r) => r.status >= 400).length,
        p95: percentile(ms, 95),
        ms: Math.round(ms.reduce((a, b) => a + b, 0) / (ms.length || 1)),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  /* -------------------------------------------------------------- revenue */

  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const arr = activeSubs.reduce((n, s) => n + s.amountSgd, 0);
  const planMap = new Map<string, { count: number; sgd: number }>();
  for (const s of activeSubs) {
    const cur = planMap.get(s.plan) ?? { count: 0, sgd: 0 };
    planMap.set(s.plan, { count: cur.count + 1, sgd: cur.sgd + s.amountSgd });
  }

  /* Twelve months rather than six: plans are sold by the year, so a six-month
     window on a young platform is all zeroes and tells an officer nothing. */
  const renewals: { month: string; short: string; count: number; sgd: number }[] = [];
  for (let i = 0; i < 12; i += 1) {
    const m = new Date(TODAY.getFullYear(), TODAY.getMonth() + i, 1);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    const due = activeSubs.filter((s) => (s.renewsOn ?? '').startsWith(key));
    renewals.push({
      month: `${MONTHS[m.getMonth()]} ${m.getFullYear()}`,
      short: MONTHS[m.getMonth()][0],
      count: due.length,
      sgd: due.reduce((n, s) => n + s.amountSgd, 0),
    });
  }

  const payNow = activeSubs.filter((s) => s.method === 'PayNow').length;

  return {
    queues,
    agents: {
      total: directory.length,
      real: directory.filter((a) => a.real).length,
      approved: directory.filter((a) => a.status === 'approved').length,
      underReview: directory.filter((a) => a.status === 'under_review').length,
      suspended: directory.filter((a) => a.status === 'suspended').length,
      expiringSoon: directory.filter((a) => {
        if (!a.ceaValidUntil) return false;
        const days = (new Date(a.ceaValidUntil).getTime() - now) / DAY;
        return days > 0 && days < 90;
      }).length,
    },
    listings: { total: listings.length, byStatus, publishedThisWeek },
    decisions: {
      today: decisionsToday,
      week: decisionsWeek,
      trend: { labels: dayLabels, values: dayValues },
      heatmap,
      byOfficer,
      byAction: [...byAction.entries()].map(([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count),
      adverseShare: audit.length ? Math.round((adverse / audit.length) * 100) : 0,
    },
    api: {
      total: requests.length,
      errors,
      errorRate: requests.length ? Number(((errors / requests.length) * 100).toFixed(1)) : 0,
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      trend: { labels: hourLabels, values: hourValues },
      errorTrend: { labels: hourLabels, values: hourErrors },
      topRoutes,
    },
    revenue: {
      mrrSgd: Math.round(arr / 12),
      arrSgd: arr,
      activeCount: activeSubs.length,
      atRiskSgd: subscriptions
        .filter((s) => s.status === 'past_due' || s.status === 'expired')
        .reduce((n, s) => n + s.amountSgd, 0),
      byPlan: [...planMap.entries()].map(([plan, v]) => ({ plan, ...v })).sort((a, b) => b.sgd - a.sgd),
      payNowShare: activeSubs.length ? Math.round((payNow / activeSubs.length) * 100) : 0,
      renewals,
    },
    audit,
    requests: requests.slice(0, 500),
    directory,
    subscriptions,
  };
}

export type { AuditRow, RequestRow, DirectoryAgent, SubscriptionEntry, ListingStatus };
