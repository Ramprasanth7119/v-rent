/**
 * The navigation chrome follows the theme. In the light theme the sidebar,
 * header and bottom bar sit on the light surface; in the dark theme on the dark
 * one. Both are read from the same tokens, so the checks are over the tokens
 * and over the shell never reaching past them for a fixed dark colour.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const css = readFileSync(join(root, 'app/globals.css'), 'utf8');
const shell = readFileSync(join(root, 'components/phase1/Shell.tsx'), 'utf8');

/** The custom properties declared directly in the first block for `selector`. */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no block for ${selector}`);
  const body = css.slice(start, css.indexOf('\n}', start));
  return Object.fromEntries([...body.matchAll(/(--p1-[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]));
}

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const light = tokens('.p1');
const dark = { ...light, ...tokens('.dark .p1') };

describe('theme tokens behind the navigation chrome', () => {
  it('puts the light theme on a light surface and the dark theme on a dark one', () => {
    for (const key of ['--p1-bg', '--p1-surface', '--p1-elevated']) {
      expect(luminance(light[key]), `light ${key}`).toBeGreaterThan(0.85);
      expect(luminance(dark[key]), `dark ${key}`).toBeLessThan(0.05);
    }
  });

  it('keeps navigation text readable in both themes', () => {
    for (const [name, t] of [['light', light], ['dark', dark]] as const) {
      expect(contrast(t['--p1-text'], t['--p1-surface']), `${name} text`).toBeGreaterThanOrEqual(7);
      expect(contrast(t['--p1-text-2'], t['--p1-surface']), `${name} secondary text`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t['--p1-text-3'], t['--p1-surface']), `${name} icons and labels`).toBeGreaterThanOrEqual(3);
      expect(contrast(t['--p1-primary'], t['--p1-surface']), `${name} active item`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('application shell', () => {
  it('draws the sidebar, header and bottom bar from theme tokens', () => {
    expect(shell).toMatch(/flex h-full flex-col border-r border-p1-border bg-p1-surface text-p1-text/);
    expect(shell).toMatch(/<header[^>]*bg-p1-bg/);
    expect(shell).toMatch(/aria-label="Quick navigation"[^>]*bg-p1-surface/);
  });

  it('never gives the chrome a fixed dark colour that ignores the light theme', () => {
    expect(shell).not.toMatch(/bg-p1-sidebar/);
    expect(shell).not.toMatch(/\bnavy\b/);
    expect(shell).not.toMatch(/bg-(black|gray-9\d\d|slate-9\d\d|\[#0B1220\])(?![/\w])/);
    expect(shell).not.toMatch(/\btext-white\/\d+/);
  });
});
