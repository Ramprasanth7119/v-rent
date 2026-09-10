"use client";

/**
 * The enquiry form on a shared listing.
 *
 * The person filling this in has no account and is not going to make one, so it
 * asks for the least that lets an agent reply usefully: who they are, how to
 * reach them, and what they want to know. Move-in date and budget are offered
 * because an agent who has them can answer in one message instead of three, but
 * neither is required.
 *
 * On success the form is replaced by the confirmation rather than cleared —
 * a tenant should not be left wondering whether it sent.
 */

import { useState } from 'react';
import { Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button, TextInput, TextArea, cx } from '../kit';

export function EnquiryForm({
  ownerId,
  listingId,
  agentName,
  className = '',
}: {
  ownerId: string;
  listingId: string;
  agentName: string;
  className?: string;
}) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [moveIn, setMoveIn] = useState('');
  const [budget, setBudget] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const ready = name.trim() && contact.trim() && message.trim().length >= 5;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || state === 'sending') return;
    setState('sending');
    setError(null);

    try {
      const res = await fetch('/api/phase1/enquiries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ownerId,
          listingId,
          name: name.trim(),
          contact: contact.trim(),
          message: message.trim(),
          moveIn: moveIn || undefined,
          budget: budget ? Number(budget) : undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'That did not send.');
      }
      setState('sent');
    } catch (err) {
      setState('idle');
      setError(err instanceof Error ? err.message : 'That did not send. Try again in a moment.');
    }
  };

  if (state === 'sent') {
    return (
      <section className={cx('rounded-xl border border-p1-success-border bg-p1-success-soft/60 p-6 text-center', className)}>
        <CheckCircle2 size={26} className="mx-auto text-p1-success" aria-hidden />
        <h2 className="mt-3 text-[17px] font-semibold text-p1-text">Your enquiry is with {agentName}</h2>
        <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-6 text-p1-text-2">
          It arrived in their inbox with the unit reference attached, so they know which flat you mean. Agents who use
          V-RENT are asked to reply the same day.
        </p>
      </section>
    );
  }

  return (
    <section className={cx('rounded-xl border border-p1-border bg-p1-surface p-5 sm:p-6', className)} id="enquire">
      <h2 className="text-[17px] font-semibold text-p1-text">Ask {agentName} about this unit</h2>
      <p className="mt-1 text-[13.5px] leading-5 text-p1-text-2">
        Your details go to this agent only, with the listing reference attached.
      </p>

      <form className="mt-4 space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Your name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          <TextInput
            label="Mobile or email"
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            hint="However you would rather be reached."
          />
        </div>

        <TextArea
          label="Message"
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Is the unit still available? I would like to view it this weekend."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Move-in date" type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} hint="Optional." />
          <TextInput
            label="Your budget"
            inputMode="numeric"
            value={budget}
            onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))}
            leftIcon={<span className="text-[14px] font-semibold">S$</span>}
            hint="Optional. Per month."
          />
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-p1-danger-border bg-p1-danger-soft px-3.5 py-2.5 text-[13.5px] text-p1-text">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-p1-danger" aria-hidden />
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={!ready} loading={state === 'sending'} rightIcon={<Send size={16} />}>
            Send enquiry
          </Button>
          <span className="text-[12.5px] text-p1-text-3">No account needed.</span>
        </div>
      </form>
    </section>
  );
}
