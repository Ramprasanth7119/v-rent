/**
 * The chrome an agent carries from screen to screen.
 *
 * Everything here was found by opening the portal at a width and measuring it,
 * and every check is the shape of a defect that had already shipped once. They
 * are source checks rather than rendered ones for the reason the vitest config
 * gives: the run is node-only and these are the parts of a screen that can be
 * stated as a rule rather than looked at.
 *
 * Widths that matter, and why each is in here:
 *
 *   320  the narrowest phone still in use, and the one the header did not fit
 *   375  the narrowest phone the header fits with the switch spelled out
 *   360  between the two, where the word has to be gone
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const source = (p: string) => readFileSync(join(root, p), 'utf8');

/** The file with its prose removed, so a comment describing a bug is not read as the bug. */
const code = (p: string) => source(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the header fits the narrowest phone', () => {
  const demo = code('components/phase1/DemoDataSwitch.tsx');

  it('drops the switch label below 375px', () => {
    /* The header row is the menu button, the mark and the control cluster.
       Spelling "Demo Data" out needs 370px of it; at 320 that pushed the avatar
       34px past the right edge and the whole page scrolled sideways. */
    expect(demo).toMatch(/hidden whitespace-nowrap min-\[375px\]:inline/);
  });

  it('keeps the control named when the word is not shown', () => {
    expect(demo).toMatch(/aria-label="Demo Data"/);
  });
});

describe('the application shell', () => {
  const shell = code('components/phase1/Shell.tsx');

  it('does not let the header icon buttons be squeezed', () => {
    // Without shrink-0 the 36px targets gave up their width to the row when it
    // ran short, and "Open menu" measured 20px across at 320.
    expect(shell).toMatch(/const iconBtn = '[^']*\bshrink-0\b/);
  });

  it('names the icon-only tab in the bottom bar', () => {
    // Every other tab prints its label underneath; the create tab shows the
    // icon alone, so a screen reader reached it and announced "link".
    expect(shell).toMatch(/aria-label=\{isCreate \? item\.label : undefined\}/);
  });

  it('holds focus inside the navigation drawer while it is open', () => {
    // It calls itself aria-modal, so Tab must not walk out of it into the page
    // it is covering, and closing must hand focus back to the opener.
    expect(shell).toMatch(/drawerRef/);
    expect(shell).toMatch(/if \(e\.key !== 'Tab'\) return/);
    expect(shell).toMatch(/opener\?\.focus\?\.\(\)/);
  });

  it('still closes on Escape and locks the page behind it', () => {
    expect(shell).toMatch(/if \(e\.key === 'Escape'\)/);
    expect(shell).toMatch(/document\.body\.style\.overflow = 'hidden'/);
  });
});

describe('pagination', () => {
  const data = code('components/phase1/ui/data.tsx');

  it('prints a window of page numbers, not one button per page', () => {
    /* Every page used to get a button. Twelve decisions is a row of twelve;
       four hundred pages of API calls is a row of four hundred, which pushed
       Next off the right-hand edge of the window. */
    expect(data).not.toMatch(/Array\.from\(\{ length: pages \}\)\.map/);
    expect(data).toMatch(/function pageWindow/);
  });

  it('gives each page button a name of its own', () => {
    expect(data).toMatch(/aria-label=\{`Page \$\{n\}`\}/);
  });

  it('no longer needs a call site to cap itself', () => {
    // ApiActivity capped the row at 999 buttons, which is the same bug with a
    // ceiling on it rather than a fix.
    expect(code('app/phase1/admin/reports/ApiActivity.tsx')).not.toMatch(/Math\.min\(pg\.pages/);
  });
});

describe('touch targets', () => {
  it('gives the card header link a 28px box', () => {
    // At 12.5px the text box alone was 19px tall.
    expect(code('components/phase1/dashboard/parts.tsx')).toMatch(/-mx-1\.5 inline-flex min-h-7/);
  });

  it('gives the help mark a 28px box without moving the line it sits on', () => {
    expect(code('components/phase1/ui/form.tsx')).toMatch(/-m-1 flex h-7 w-7 shrink-0/);
  });

  it('keeps the notification checkboxes square', () => {
    /* They sit in a flex row beside their labels. Without shrink-0 the label
       squeezed the box to 13px across on a 320px screen. */
    const settings = code('app/phase1/settings/page.tsx');
    const boxes = settings.match(/type="checkbox"[\s\S]{0,160}?className="([^"]*)"/g) ?? [];
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) expect(box).toContain('shrink-0');
  });
});

describe('nothing in the agent portal offers to decide its own verification', () => {
  it('has no simulate-approval controls left on the status page', () => {
    const status = code('app/phase1/status/page.tsx');
    expect(status).not.toMatch(/Prototype controls/);
    expect(status).not.toMatch(/Simulate officer approval/);
    expect(status).not.toMatch(/set\(\{ approval:/);
    expect(status).not.toMatch(/set\(\{ ceaValid:/);
  });

  it('leaves no other agent screen writing those two fields', () => {
    for (const file of [
      'app/phase1/profile/page.tsx',
      'app/phase1/checkout/page.tsx',
      'app/phase1/payment/page.tsx',
      'app/phase1/plans/page.tsx',
    ]) {
      const src = code(file);
      expect(src, file).not.toMatch(/approval:\s*'(approved|under_review)'/);
      expect(src, file).not.toMatch(/ceaValid:/);
    }
  });
});
