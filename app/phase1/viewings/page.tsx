"use client";

/**
 * Viewing scheduler.
 *
 * The slot is the unit of work, not the appointment: an agent blocks out when
 * they can be at a property, publishes that, and a tenant takes one. Modelling
 * it the other way round — tenant proposes, agent confirms — is what makes the
 * WhatsApp version of this take six messages.
 *
 * A slot with a booking on it shows the tenant's name and number inline,
 * because the next thing the agent does is ring them.
 */

import { useMemo, useState } from 'react';
import {
  CalendarClock, Plus, Trash2, Phone, Link2, Check, Info, CalendarDays, UserCheck,
} from 'lucide-react';
import {
  Button, Card, SectionCard, PageHeader, Callout, MetricStrip, Metric,
  EmptyState, TextInput, SelectInput, LinkButton, IconButton, cx,
} from '../../../components/phase1/kit';
import { Pill } from '../../../components/phase1/status';
import { ConfirmDialog, Dialog } from '../../../components/phase1/overlays';
import { useDemo, TODAY, TODAY_ISO } from '../../../lib/phase1/DemoContext';
import { districtName } from '../../../lib/phase1/performance';
import { toolsId, type ViewingSlot } from '../../../lib/phase1/tools';
import { sgWeekday } from '../../../lib/phase1/format';

const START_TIMES = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

const plusHour = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const dayLabel = (date: string) => {
  const d = new Date(`${date}T00:00:00+08:00`);
  const today = isoDate(TODAY);
  if (date === today) return 'Today';
  if (date === isoDate(addDays(TODAY, 1))) return 'Tomorrow';
  return sgWeekday(d);
};

export default function ViewingsPage() {
  const { state, setTools } = useDemo();
  const slots = state.tools.slots;

  const [date, setDate] = useState(isoDate(addDays(TODAY, 1)));
  const [start, setStart] = useState('11:00');
  const [listingId, setListingId] = useState('any');
  const [removing, setRemoving] = useState<ViewingSlot | null>(null);
  const [booking, setBooking] = useState<ViewingSlot | null>(null);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');

  const live = useMemo(
    () => state.listings.filter((l) => !l.archived && (l.status === 'published' || l.status === 'paused')),
    [state.listings],
  );
  const byId = useMemo(() => new Map(state.listings.map((l) => [l.id, l])), [state.listings]);

  const sorted = useMemo(
    () => [...slots].sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)),
    [slots],
  );
  const upcoming = sorted.filter((s) => s.date >= isoDate(TODAY));
  const booked = upcoming.filter((s) => s.booking);

  /* Grouped by day, because a viewing schedule is read a day at a time. */
  const byDay = useMemo(() => {
    const map = new Map<string, ViewingSlot[]>();
    for (const s of upcoming) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return [...map.entries()];
  }, [upcoming]);

  const clash = slots.some((s) => s.date === date && s.start === start);

  const add = () => {
    if (clash) return;
    const slot: ViewingSlot = { id: toolsId('slot'), date, start, end: plusHour(start), listingId };
    setTools({ slots: [...slots, slot] });
  };

  const remove = () => {
    if (!removing) return;
    setTools({ slots: slots.filter((s) => s.id !== removing.id) });
    setRemoving(null);
  };

  const confirmBooking = () => {
    if (!booking || !name.trim() || !mobile.trim()) return;
    setTools({
      slots: slots.map((s) => (s.id === booking.id
        ? { ...s, booking: { name: name.trim(), mobile: mobile.trim(), at: new Date().toISOString() } }
        : s)),
    });
    setBooking(null);
    setName('');
    setMobile('');
  };

  const release = (slot: ViewingSlot) =>
    setTools({ slots: slots.map((s) => (s.id === slot.id ? { ...s, booking: undefined } : s)) });

  const bulkWeek = () => {
    /* Seven evenings is a week of viewings without filling in the form seven
       times — the thing an agent actually wants on a Monday morning. */
    const made: ViewingSlot[] = [];
    for (let i = 1; i <= 7; i += 1) {
      const d = isoDate(addDays(TODAY, i));
      for (const t of ['18:00', '19:00']) {
        if (slots.some((s) => s.date === d && s.start === t)) continue;
        made.push({ id: toolsId('slot'), date: d, start: t, end: plusHour(t), listingId: 'any' });
      }
    }
    if (made.length) setTools({ slots: [...slots, ...made] });
  };

  return (
    <>
      <PageHeader
        eyebrow="Enquiries and viewings"
        title="Viewing scheduler"
        description="Publish when you can be at a property and let a tenant take a slot, instead of trading six messages to find an hour that suits you both."
        actions={<LinkButton href="/phase1/performance" variant="outline">Enquiry inbox</LinkButton>}
      />

      <MetricStrip className="mb-6" cols={3}>
        <Metric label="Slots published" value={upcoming.length} hint="From today onwards" icon={<CalendarClock size={15} />} />
        <Metric label="Booked" value={booked.length} hint={booked.length ? 'Ring them to confirm' : 'Nothing taken yet'} icon={<UserCheck size={15} />} tone={booked.length ? 'success' : 'default'} />
        <Metric label="Still open" value={upcoming.length - booked.length} hint="Available to tenants" icon={<CalendarDays size={15} />} />
      </MetricStrip>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SectionCard
          title="Your schedule"
          description="Grouped by day. A tenant sees only the open slots."
          icon={<CalendarClock size={16} />}
          padding={byDay.length ? 'none' : 'md'}
          actions={<Button size="sm" variant="outline" onClick={bulkWeek} leftIcon={<Plus size={14} />}>Add a week of evenings</Button>}
        >
          {byDay.length === 0 ? (
            <EmptyState
              icon={<CalendarClock size={22} />}
              title="No slots published"
              description="Add the hours you can be at a property and they become bookable straight away."
            />
          ) : (
            <div className="divide-y divide-p1-border">
              {byDay.map(([day, list]) => (
                <div key={day} className="px-5 py-4">
                  <div className="mb-2.5 flex items-baseline justify-between gap-3">
                    <h3 className="font-p1display text-[15px] font-bold text-p1-text">{dayLabel(day)}</h3>
                    <span className="text-[12.5px] text-p1-text-3">
                      {list.filter((s) => s.booking).length} of {list.length} booked
                    </span>
                  </div>
                  <ul className="grid gap-2">
                    {list.map((s) => {
                      const l = s.listingId === 'any' ? null : byId.get(s.listingId);
                      return (
                        <li
                          key={s.id}
                          className={cx(
                            'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3.5 py-3',
                            s.booking ? 'border-p1-success-border bg-p1-success-soft/50' : 'border-p1-border bg-p1-surface',
                          )}
                        >
                          <span className="w-[112px] shrink-0 font-medium tabular-nums text-p1-text">{s.start}–{s.end}</span>
                          <span className="min-w-0 flex-1 basis-40 truncate text-[13.5px] text-p1-text-2">
                            {l ? `${l.project} ${l.unitNo} · D${String(l.district).padStart(2, '0')}` : 'Any of your listings'}
                          </span>
                          {s.booking ? (
                            <span className="flex min-w-0 flex-wrap items-center gap-2">
                              <Pill tone="success">Booked</Pill>
                              <span className="truncate text-[13.5px] font-medium text-p1-text">{s.booking.name}</span>
                              <a
                                href={`tel:${s.booking.mobile.replace(/\s/g, '')}`}
                                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-p1-primary underline-offset-4 hover:underline dark:text-p1-info"
                              >
                                <Phone size={13} aria-hidden />
                                {s.booking.mobile}
                              </a>
                              <Button size="sm" variant="ghost" onClick={() => release(s)}>Release</Button>
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => setBooking(s)}>Book for a tenant</Button>
                              <IconButton label="Remove this slot" onClick={() => setRemoving(s)}>
                                <Trash2 size={15} />
                              </IconButton>
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <aside className="grid min-w-0 content-start gap-4 [&>*]:min-w-0">
          <SectionCard title="Publish a slot" icon={<Plus size={16} />}>
            <div className="grid gap-4">
              <TextInput
                label="Date"
                type="date"
                value={date}
                min={TODAY_ISO}
                onChange={(e) => setDate(e.target.value)}
              />
              <SelectInput
                label="Starts"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                hint="Each slot runs for an hour."
                options={START_TIMES.map((t) => ({ value: t, label: `${t} – ${plusHour(t)}` }))}
              />
              <SelectInput
                label="Property"
                value={listingId}
                onChange={(e) => setListingId(e.target.value)}
                hint="Leave it open and the tenant says which listing they want to see."
                options={[
                  { value: 'any', label: 'Any of my listings' },
                  ...live.map((l) => ({
                    value: l.id,
                    label: `${l.project} ${l.unitNo} — D${String(l.district).padStart(2, '0')} ${districtName(l.district)}`,
                  })),
                ]}
              />
              {clash && (
                <Callout tone="warning" compact>
                  You already have a slot at that time on that day.
                </Callout>
              )}
              <Button variant="primary" block onClick={add} disabled={clash} leftIcon={<Plus size={16} />}>
                Publish the slot
              </Button>
            </div>
          </SectionCard>

          <Card padding="md">
            <div className="flex items-center gap-2 text-[13.5px] font-semibold text-p1-text">
              <Link2 size={15} className="text-p1-primary dark:text-p1-info" aria-hidden />
              Your booking link
            </div>
            <p className="mt-1.5 text-[13px] leading-5 text-p1-text-2">
              Every listing page carries this automatically. Send it on its own when a tenant asks when they can see
              the unit.
            </p>
            <code className="mt-2.5 block truncate rounded-lg bg-p1-subtle px-3 py-2 text-[12.5px] text-p1-text-2">
              vrent.sg/book/{state.profile.ceaNumber.toLowerCase() || 'your-cea'}
            </code>
          </Card>

          <Callout tone="info" title="What is real here" icon={<Info size={17} />}>
            Publishing, booking and releasing slots are working and stored against your workspace. The tenant-facing
            booking page and the calendar invitation sit on the public site, which is the later phase.
          </Callout>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        destructive
        title="Remove this slot?"
        description="It disappears from your booking page immediately."
        confirmLabel="Remove"
      />

      <Dialog
        open={Boolean(booking)}
        onClose={() => setBooking(null)}
        title="Book this slot for a tenant"
        description={booking ? `${dayLabel(booking.date)}, ${booking.start}–${booking.end}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setBooking(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmBooking} disabled={!name.trim() || !mobile.trim()} leftIcon={<Check size={16} />}>
              Book it
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <p className="text-[13.5px] leading-5 text-p1-text-2">
            For when a tenant rings you instead of using the link. The slot closes on your booking page as soon as you
            save this.
          </p>
          <TextInput label="Tenant name" value={name} onChange={(e) => setName(e.target.value)} data-autofocus placeholder="Who is coming" />
          <TextInput label="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+65 9xxx xxxx" inputMode="tel" />
        </div>
      </Dialog>
    </>
  );
}
