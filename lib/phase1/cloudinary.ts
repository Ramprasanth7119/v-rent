/**
 * The Cloudinary account, and the three things this product asks of it.
 *
 * Sign an upload, confirm what landed, and delete it again. That is the whole
 * surface, so it is written against the HTTP API directly rather than pulling
 * in the SDK — a dependency, a bundle and a release cadence for three requests
 * would be a poor trade.
 *
 * The signature is the point of the design. The browser sends the file to
 * Cloudinary, not to us, so nothing large passes through our hosting; but the
 * parameters it sends are fixed here and signed here, which means the browser
 * chooses the bytes and this server chooses everything else — where they land,
 * what they may be, and how big they may get. Altering any of it invalidates
 * the signature, and Cloudinary refuses the upload.
 *
 * Unconfigured is a normal state. Until somebody puts the credentials in the
 * environment there is no video upload, and every screen that offers one says
 * so rather than failing when it is used.
 */

import { createHash } from 'node:crypto';
import { MAX_VIDEO_BYTES } from './video';

export interface CloudinaryAccount {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * The credentials, or null.
 *
 * Read on every call rather than at import, so a key added to the environment
 * takes effect on the next restart without this module having an opinion about
 * when it was loaded.
 */
export function cloudinaryAccount(): CloudinaryAccount | null {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME ?? '').trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY ?? '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET ?? '').trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

/** Whether a video may be offered at all. Every screen asks before drawing one. */
export const videoIsConfigured = () => cloudinaryAccount() !== null;

/**
 * Cloudinary's signature: the parameters sorted by name, joined as a query
 * string, with the secret appended and the lot hashed. `file`, `api_key`,
 * `resource_type` and `cloud_name` are excluded by their rules, so they are
 * never passed in here.
 */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return createHash('sha1').update(canonical + apiSecret).digest('hex');
}

/**
 * Everything the browser needs to upload one file, and nothing it can usefully
 * change.
 *
 * `public_id` puts the file under this agent and this listing. `overwrite`
 * with a stable id means a replacement takes the place of the old one rather
 * than leaving an orphan behind to be paid for. The size ceiling is repeated
 * here because the browser's own check is a courtesy, not a control.
 */
export function signedVideoUpload(publicId: string, account: CloudinaryAccount) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    public_id: publicId,
    overwrite: 'true',
    invalidate: 'true',
    timestamp,
  };
  return {
    endpoint: `https://api.cloudinary.com/v1_1/${account.cloudName}/video/upload`,
    apiKey: account.apiKey,
    fields: { ...params, signature: signParams(params, account.apiSecret) },
    maxBytes: MAX_VIDEO_BYTES,
  };
}

/** How a stored video is addressed for playing and for its poster frame. */
export function videoUrls(publicId: string, account: CloudinaryAccount) {
  const base = `https://res.cloudinary.com/${account.cloudName}`;
  return {
    /* Cloudinary picks the codec and the bitrate for whatever asked for it,
       which is the reason for using it rather than serving the original. */
    url: `${base}/video/upload/q_auto/${publicId}.mp4`,
    /* Two seconds in — the first frame of a walkthrough is usually a door. */
    posterUrl: `${base}/video/upload/so_2,w_960,c_fill,q_auto,f_jpg/${publicId}.jpg`,
  };
}

export interface CloudinaryResource {
  bytes: number;
  format: string;
  durationSec?: number;
}

const authHeader = (a: CloudinaryAccount) =>
  'Basic ' + Buffer.from(`${a.apiKey}:${a.apiSecret}`).toString('base64');

/**
 * What Cloudinary holds under that id, asked of Cloudinary rather than of the
 * browser.
 *
 * The browser reports its own upload, and a browser's account of what it just
 * did is not evidence. Reading the asset back is what makes the size and the
 * length on the listing true — and it is also how an id that was never
 * uploaded is caught, because there is nothing there to read.
 */
export async function readVideoResource(
  publicId: string,
  account: CloudinaryAccount,
): Promise<CloudinaryResource | null> {
  const url = `https://api.cloudinary.com/v1_1/${account.cloudName}/resources/video/upload/${encodeURIComponent(publicId)}`;
  const res = await fetch(url, { headers: { authorization: authHeader(account) }, cache: 'no-store' })
    .catch(() => null);
  if (!res?.ok) return null;

  const body = await res.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.bytes !== 'number') return null;

  return {
    bytes: body.bytes,
    format: typeof body.format === 'string' ? body.format : 'mp4',
    durationSec: typeof body.duration === 'number' ? Math.round(body.duration) : undefined,
  };
}

/**
 * Remove it from Cloudinary as well as from the listing.
 *
 * Storage is billed, so a video deleted here has to be deleted there too. A
 * failure is reported rather than swallowed: the caller decides whether to
 * keep the listing's record, and keeping it is better than a listing that
 * claims to have no video while the account is still paying for one.
 */
export async function destroyVideo(publicId: string, account: CloudinaryAccount): Promise<boolean> {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: publicId, invalidate: 'true', timestamp };
  const body = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    api_key: account.apiKey,
    signature: signParams(params, account.apiSecret),
  });

  const res = await fetch(`https://api.cloudinary.com/v1_1/${account.cloudName}/video/destroy`, {
    method: 'POST',
    body,
  }).catch(() => null);
  if (!res?.ok) return false;

  const out = await res.json().catch(() => null) as { result?: string } | null;
  /* "not found" is the desired end state as much as "ok" is. */
  return out?.result === 'ok' || out?.result === 'not found';
}
