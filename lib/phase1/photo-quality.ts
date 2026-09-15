/**
 * The parts of photograph checking that need no image library: what is
 * recorded about a photograph, and how two of them are compared.
 *
 * Kept apart from `image.ts` because that module loads native code. Serving a
 * photograph that is already stored should never depend on it: if the image
 * library cannot load on an instance, uploads say so and every existing
 * photograph still displays.
 */

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
