/**
 * Where this deployment answers from, for the things that need an absolute
 * address: the sitemap, the robots file, canonical links and structured data.
 *
 * Read from `VRENT_PUBLIC_ORIGIN` when it is set, because that is the only
 * value that survives a proxy rewriting the host, a preview deployment and a
 * custom domain all at once. Without it the request's own headers are used —
 * the forwarded protocol and host a proxy puts there, falling back to `host` —
 * which is right on a laptop and right on most deployments, and wrong only
 * where somebody has put something unusual in front of it. That is exactly the
 * case the environment variable exists for.
 *
 * Server only.
 */

import { headers } from 'next/headers';

const clean = (value: string) => value.trim().replace(/\/+$/, '');

export async function publicOrigin(): Promise<string> {
  const declared = process.env.VRENT_PUBLIC_ORIGIN;
  if (declared && /^https?:\/\//.test(declared.trim())) return clean(declared);

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return 'http://localhost:3000';

  /* A forwarded protocol can carry the whole chain; the first hop is the one
     the visitor used. Anything that is not plainly http is treated as https,
     which errs towards the secure address rather than advertising a plain one. */
  const proto = (h.get('x-forwarded-proto') ?? '').split(',')[0].trim();
  const scheme = proto === 'http' || host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
  return clean(`${scheme}://${host}`);
}

/** An absolute address for a path on this deployment. */
export const absolute = (origin: string, path: string) => `${origin}${path.startsWith('/') ? path : `/${path}`}`;
