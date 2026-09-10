/**
 * What happens to a photograph between the agent's phone and the listing.
 *
 * Three things, all of which the scope asks for and none of which an agent
 * should have to think about:
 *
 *   Resizing. A phone photograph is 4 MB and 4000 pixels wide. Nobody needs
 *   that on a listing page, and a client opening a shortlist on mobile data
 *   certainly does not. Two derivatives are kept — one for the page, one for
 *   the thumbnail — and the original is not.
 *
 *   Orientation and metadata. Phones record rotation in EXIF rather than in
 *   the pixels, so an unrotated photograph appears sideways. The same EXIF
 *   block carries the GPS coordinates of where it was taken, which is
 *   somebody's home, so it is stripped rather than published.
 *
 *   Quality. Dark, blurry and duplicate photographs are the most common reason
 *   a listing is rejected, and finding out at moderation wastes a day. They are
 *   flagged at upload instead.
 */

import sharp, { type Sharp } from 'sharp';

/** Wide enough for a full-bleed gallery on a large screen, and no wider. */
const MAIN_WIDTH = 1600;
const THUMB_WIDTH = 480;

export interface PhotoQuality {
  /** Mean luminance, 0–255. */
  brightness: number;
  /** How much fine detail survives a high-pass — low means soft or out of focus. */
  detail: number;
  dark: boolean;
  blurry: boolean;
  /** Perceptual hash, for spotting the same photograph uploaded twice. */
  hash: string;
}

export interface ProcessedPhoto {
  main: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  quality: PhotoQuality;
}

/**
 * Thresholds, chosen against real listing photographs rather than theory.
 * They are deliberately forgiving: a warning an agent disagrees with twice is
 * a warning they stop reading.
 */
const DARK_BELOW = 62;
const DETAIL_BELOW = 7;

/** A 64-bit average hash. Same picture, different compression, same hash. */
async function perceptualHash(image: Sharp): Promise<string> {
  const { data } = await image
    .clone()
    .greyscale()
    .resize(8, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const mean = data.reduce((sum: number, v: number) => sum + v, 0) / data.length;
  let bits = '';
  for (const v of data) bits += v >= mean ? '1' : '0';
  // 64 bits as 16 hex characters.
  return (bits.match(/.{8}/g) ?? []).map((byte) => parseInt(byte, 2).toString(16).padStart(2, '0')).join('');
}

/** How many bits differ. Under about 6 is the same photograph. */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i += 2) {
    let x = parseInt(a.slice(i, i + 2), 16) ^ parseInt(b.slice(i, i + 2), 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

export const DUPLICATE_WITHIN = 6;

/**
 * Decode, correct, resize and measure. Returns null when the bytes are not an
 * image the library can read — which is the real test of whether a file is a
 * photograph, rather than trusting the name or the declared type.
 */
export async function processPhoto(input: Buffer): Promise<ProcessedPhoto | null> {
  try {
    // `rotate()` with no argument applies the EXIF orientation; the metadata is
    // dropped on write, so the rotation has to be baked into the pixels first.
    const base = sharp(input, { failOn: 'error' }).rotate();
    const meta = await base.metadata();
    if (!meta.width || !meta.height) return null;

    const [main, thumb, quality] = await Promise.all([
      base.clone()
        .resize({ width: MAIN_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer(),
      base.clone()
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 74, mozjpeg: true })
        .toBuffer(),
      measure(base),
    ]);

    return {
      main,
      thumb,
      width: Math.min(meta.width, MAIN_WIDTH),
      height: Math.round(Math.min(meta.width, MAIN_WIDTH) * (meta.height / meta.width)),
      quality,
    };
  } catch {
    return null;
  }
}

async function measure(image: Sharp): Promise<PhotoQuality> {
  const grey = image.clone().greyscale().resize({ width: 320, withoutEnlargement: true });

  const [stats, edges, hash] = await Promise.all([
    grey.clone().stats(),
    // A Laplacian high-pass: what is left is edges. A photograph in focus keeps
    // a lot; a soft one keeps almost nothing.
    grey.clone()
      .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] })
      .stats(),
    perceptualHash(image),
  ]);

  const brightness = stats.channels[0]?.mean ?? 0;
  const detail = edges.channels[0]?.stdev ?? 0;

  return {
    brightness: Math.round(brightness),
    detail: Math.round(detail * 10) / 10,
    dark: brightness < DARK_BELOW,
    blurry: detail < DETAIL_BELOW,
    hash,
  };
}
