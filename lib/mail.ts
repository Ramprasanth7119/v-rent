/**
 * Sending mail, or standing in for it.
 *
 * No mail provider is connected to the POC, and pretending otherwise would be
 * worse than saying so: a confirmation email that silently goes nowhere makes
 * the whole verification flow look broken. So every message is written to an
 * outbox on disk and the caller is told it was not actually delivered, which
 * lets the interface offer the link directly and say why.
 *
 * Production sets the provider once, here. Nothing else changes: callers get
 * the same `sent` back and stop showing the link.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DATA_DIR as dataRoot } from './storage';

const OUTBOX = path.join(dataRoot, 'outbox');

export interface Message {
  to: string;
  subject: string;
  /** Plain text. The POC has no need of an HTML part yet. */
  body: string;
}

export interface Delivery {
  /** True only when a provider actually accepted the message. */
  sent: boolean;
  /** Where it went instead, when nothing accepted it. */
  outboxFile?: string;
}

/** Whether a real provider is configured. */
export const mailIsConfigured = () => Boolean(process.env.SMTP_URL || process.env.MAIL_PROVIDER);

export async function send(message: Message): Promise<Delivery> {
  if (mailIsConfigured()) {
    // The one place a provider is wired in. Deliberately not implemented in the
    // POC: an untested send path is worse than an obvious gap.
    throw new Error('A mail provider is configured but no transport is implemented yet.');
  }

  await mkdir(OUTBOX, { recursive: true });
  const name = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}.txt`;
  const file = path.join(OUTBOX, name);
  await writeFile(
    file,
    `To: ${message.to}\nSubject: ${message.subject}\nDate: ${new Date().toISOString()}\n\n${message.body}\n`,
    'utf8',
  );
  return { sent: false, outboxFile: name };
}

export function verificationEmail(name: string, link: string): Message {
  return {
    to: '',
    subject: 'Confirm your email address for V-RENT',
    body: [
      `Hello ${name},`,
      '',
      'Confirm this address to finish setting up your V-RENT account:',
      '',
      link,
      '',
      'The link works once and expires in 24 hours. If you did not create a V-RENT account, ignore this message — nothing will happen.',
      '',
      'V-RENT',
    ].join('\n'),
  };
}
