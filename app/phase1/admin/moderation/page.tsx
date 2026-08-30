"use client";

import { useState } from 'react';
import {
  PageHeader, StatCard, Card, Callout, Button, EmptyState, TextArea, Field, FieldGrid, PresenterNote, cx,
} from '../../../../components/phase1/kit';
import { Pill } from '../../../../components/phase1/status';
import { Dialog, Drawer } from '../../../../components/phase1/overlays';
import { PropertyImage } from '../../../../components/phase1/PropertyImage';
import { useToast } from '../../../../components/phase1/Toast';
import { MODERATION_QUEUE, ModerationCase, REJECTION_REASONS } from '../../../../lib/phase1/data';
import { Check, X, Eye, CheckCircle2, Inbox, Clock, Percent } from 'lucide-react';

export default function ModerationPage() {
  const { push } = useToast();
  const [queue, setQueue] = useState(MODERATION_QUEUE);
  const [preModeration, setPreModeration] = useState(false);
  const [rejecting, setRejecting] = useState<ModerationCase | null>(null);
  const [preview, setPreview] = useState<ModerationCase | null>(null);
  const [reason, setReason] = useState(REJECTION_REASONS[0]);
  const [note, setNote] = useState('');

  const remove = (id: string) => setQueue((q) => q.filter((c) => c.id !== id));

  const approve = (c: ModerationCase) => {
    remove(c.id);
    push({ tone: 'success', title: 'Listing approved', body: `${c.project} is now live.` });
  };
  const confirmReject = () => {
    if (!rejecting) return;
    remove(rejecting.id);
    push({ tone: 'info', title: 'Listing rejected', body: 'The agent has been told the reason and can correct it.' });
    setRejecting(null);
    setNote('');
  };

  return (
    <>
      <PageHeader eyebrow="Administration" title="Moderation queue" description="Listings waiting for a review. Approve to make them live, or reject with a reason the agent can act on." />

      <div className="vr-stagger mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="In queue" value={queue.length} hint="oldest first" icon={<Inbox size={16} />} />
        <StatCard label="Median time to decision" value="3h 12m" hint="target under 24 hours" tone="success" icon={<Clock size={16} />} />
        <StatCard label="Rejection rate, 30 days" value="7.4%" hint="mostly photograph quality" icon={<Percent size={16} />} />
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <div id="premod-label" className="text-[15px] font-semibold text-p1-text">Review every listing before it goes live</div>
            <p id="premod-desc" className="mt-1 text-[14px] leading-5 text-p1-text-2">
              {preModeration
                ? 'On: every listing is held for review before publication. Safer, but slower for agents.'
                : 'Off: verified agents publish directly and reviews happen after publication. Recommended.'}
            </p>
          </div>
          <button type="button" role="switch" aria-checked={preModeration} aria-labelledby="premod-label" aria-describedby="premod-desc"
            onClick={() => { setPreModeration((v) => !v); push({ tone: 'info', title: preModeration ? 'Listings now publish directly' : 'Every listing will be reviewed first' }); }}
            className="flex h-11 items-center gap-3 rounded-lg px-2 cursor-pointer">
            <span className={cx('relative h-7 w-12 rounded-full transition-colors', preModeration ? 'bg-p1-success' : 'bg-p1-border-strong')} aria-hidden>
              <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left]', preModeration ? 'left-6' : 'left-1')} />
            </span>
            <span className="text-[14px] font-medium text-p1-text">{preModeration ? 'On' : 'Off'}</span>
          </button>
        </div>
      </Card>

      {queue.length === 0 ? (
        <Card><EmptyState icon={<CheckCircle2 size={26} className="text-p1-success" />} title="Queue cleared" description="Nothing is waiting for review. New submissions will appear here." /></Card>
      ) : (
        <div className="grid gap-4">
          {queue.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-start gap-4">
                <PropertyImage seed={c.reference + c.project} variant={0} className="h-16 w-24 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[16px] font-semibold text-p1-text">{c.project}</span>
                    <Pill>{c.reference}</Pill>
                  </div>
                  <div className="mt-0.5 text-[14px] text-p1-text-2">{c.agent} · submitted {c.submittedAt}</div>
                  {c.flag && <Callout tone="warning" className="mt-3 py-2.5">{c.flag}</Callout>}
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  <Button variant="outline" leftIcon={<Eye size={15} />} onClick={() => setPreview(c)}>Preview</Button>
                  <Button variant="accent" leftIcon={<Check size={15} />} onClick={() => approve(c)}>Approve</Button>
                  <Button variant="danger" leftIcon={<X size={15} />} onClick={() => setRejecting(c)}>Reject</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} title="Reject this listing" description={rejecting ? `${rejecting.project} · ${rejecting.reference}` : undefined}
        footer={<><Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button><Button variant="danger" onClick={confirmReject}>Confirm rejection</Button></>}>
        <div className="mb-2 text-[14px] font-medium text-p1-text">Reason shown to the agent</div>
        <div role="group" aria-label="Rejection reason" className="flex flex-wrap gap-2">
          {REJECTION_REASONS.map((r) => (
            <button key={r} type="button" aria-pressed={reason === r} onClick={() => setReason(r)}
              className={cx('min-h-9 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors cursor-pointer',
                reason === r ? 'border-p1-primary bg-p1-primary text-p1-primary-on' : 'border-p1-border bg-p1-surface text-p1-text-2 hover:border-p1-border-strong')}>
              {r}
            </button>
          ))}
        </div>
        <TextArea containerClassName="mt-4" label="Note to the agent (optional)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: please upload photos of the actual unit, including the kitchen." hint="A specific reason produces a correction. A bare rejection produces a support ticket." />
      </Dialog>

      <Drawer open={!!preview} onClose={() => setPreview(null)} title={preview?.project ?? ''} description={preview ? `${preview.reference} · ${preview.agent}` : undefined}
        footer={preview && <><Button variant="danger" onClick={() => { setRejecting(preview); setPreview(null); }}>Reject</Button><Button variant="accent" onClick={() => { approve(preview); setPreview(null); }}>Approve</Button></>}>
        {preview && (
          <>
            <PropertyImage seed={preview.reference + preview.project} variant={0} rounded="rounded-xl" className="aspect-[16/10] w-full" />
            <FieldGrid className="mt-5">
              <Field label="Submitted" value={preview.submittedAt} />
              <Field label="Agent" value={preview.agent} />
              <Field label="Reference" value={preview.reference} mono />
              <Field label="Automated checks" value={preview.flag ? <span className="text-p1-warning">1 flag raised</span> : <span className="text-p1-success">All passed</span>} />
            </FieldGrid>
            {preview.flag && <Callout tone="warning" className="mt-4" title="Flag">{preview.flag}</Callout>}
            <p className="mt-4 text-[13px] text-p1-text-3">The full listing preview renders from the same public read model tenants will see in Phase 2.</p>
          </>
        )}
      </Drawer>

      <PresenterNote>
        Whether every listing is reviewed before going live is still a client decision (open question Q8), so it is a configuration flag, not a code path. Two moderators opening the same case is handled with a soft claim, so the second decision never silently overwrites the first. Every decision is audited with moderator, time and reason.
      </PresenterNote>
    </>
  );
}
