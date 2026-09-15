"use client";

/**
 * Client shortlist as PDF.
 *
 * Before a viewing day an agent sends a client three or four units in one
 * document. The work is not the PDF — it is choosing the units and keeping the
 * choice, because the same client comes back on Thursday having lost the file
 * and wanting "the one near the MRT" added.
 *
 * So the screen is a picker with the shortlist saved beside it. The document
 * itself is the branded export that already exists; this decides what goes in
 * it and remembers that decision.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Check, Trash2, Users, Plus, Search, FolderOpen, Printer, Info, X,
} from 'lucide-react';
import {
  Button, SectionCard, PageHeader, Callout, MetricStrip, Metric, EmptyState,
  TextInput, TextArea, SelectInput, SearchInput, LinkButton, IconButton, cx,
} from '../../../components/phase1/kit';
import { StatusBadge, Pill } from '../../../components/phase1/status';
import { ConfirmDialog } from '../../../components/phase1/overlays';
import { useDemo, TODAY } from '../../../lib/phase1/DemoContext';
import { sgd } from '../../../lib/phase1/data';
import { dealOf, priceLabel } from '../../../lib/phase1/pricing';
import { districtName } from '../../../lib/phase1/performance';
import { toolsId, type Shortlist } from '../../../lib/phase1/tools';
import { sgDate } from '../../../lib/phase1/format';

export default function ShortlistsPage() {
  const router = useRouter();
  const { state, setTools } = useDemo();
  const saved = state.tools.shortlists;

  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState('all');
  const [beds, setBeds] = useState('all');
  const [maxRent, setMaxRent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Shortlist | null>(null);

  /* Only what a client could actually be sent: a draft has no photographs and
     a rejected listing is not advertisable. */
  const sendable = useMemo(
    () => state.listings.filter((l) => !l.archived && (l.status === 'published' || l.status === 'paused')),
    [state.listings],
  );
  const byId = useMemo(() => new Map(state.listings.map((l) => [l.id, l])), [state.listings]);

  const districts = useMemo(
    () => [...new Set(sendable.map((l) => l.district))].sort((a, b) => a - b),
    [sendable],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cap = Number(maxRent) || Infinity;
    return sendable.filter((l) => {
      if (district !== 'all' && String(l.district) !== district) return false;
      if (beds !== 'all' && (beds === '4' ? l.bedrooms < 4 : String(l.bedrooms) !== beds)) return false;
      /* The cap is a monthly rent; a sale is never measured against it. */
      if (dealOf(l) === 'rent' && l.monthlyRent > cap) return false;
      if (q && !`${l.project} ${l.address} ${l.unitNo} ${l.reference}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sendable, district, beds, maxRent, query]);

  const toggle = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const clear = () => {
    setPicked([]);
    setName('');
    setClient('');
    setNote('');
    setEditingId(null);
  };

  const save = () => {
    if (!picked.length) return;
    const title = name.trim() || (client.trim() ? `${client.trim()}'s shortlist` : `Shortlist ${saved.length + 1}`);
    const list: Shortlist = {
      id: editingId ?? toolsId('sl'),
      name: title,
      clientName: client.trim(),
      note: note.trim(),
      listingIds: picked,
      createdAt: TODAY.toISOString().slice(0, 10),
    };
    setTools({
      shortlists: editingId
        ? saved.map((s) => (s.id === editingId ? list : s))
        : [list, ...saved],
    });
    clear();
  };

  const load = (s: Shortlist) => {
    setPicked(s.listingIds.filter((id) => byId.has(id)));
    setName(s.name);
    setClient(s.clientName);
    setNote(s.note);
    setEditingId(s.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = () => {
    if (!removing) return;
    setTools({ shortlists: saved.filter((s) => s.id !== removing.id) });
    if (editingId === removing.id) clear();
    setRemoving(null);
  };

  /* The client's name and the covering note travel with the ids, so the
     document can be addressed rather than anonymous. */
  const exportIds = (ids: string[], client = '', message = '') => {
    const query = new URLSearchParams({ ids: ids.join(',') });
    if (client.trim()) query.set('for', client.trim());
    if (message.trim()) query.set('note', message.trim());
    router.push(`/phase1/listings/export?${query.toString()}`);
  };

  const total = picked.reduce((n, id) => { const l = byId.get(id); return n + (l && dealOf(l) === 'rent' ? l.monthlyRent : 0); }, 0);

  return (
    <>
      <PageHeader
        eyebrow="Listings and marketing"
        title="Client shortlist as PDF"
        description="Pick the units a client is going to see, keep the selection, and export it as a branded document with your CEA details on every page."
        actions={
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Printer size={17} />}
            disabled={picked.length === 0}
            onClick={() => exportIds(picked, client, note)}
          >
            Export {picked.length || ''} as PDF
          </Button>
        }
      />

      <MetricStrip className="mb-6" cols={3}>
        <Metric label="In this shortlist" value={picked.length} hint={picked.length ? `${sgd(total)} a month combined` : 'Nothing picked yet'} icon={<Check size={15} />} tone={picked.length ? 'success' : 'default'} />
        <Metric label="Saved shortlists" value={saved.length} hint="Kept against your workspace" icon={<FolderOpen size={15} />} />
        <Metric label="Sendable listings" value={sendable.length} hint="Published or paused" icon={<FileText size={15} />} />
      </MetricStrip>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-6 [&>*]:min-w-0">
          <SectionCard
            title="Choose the units"
            description="Narrow the list down, then tick what the client is seeing."
            icon={<Search size={16} />}
            actions={picked.length > 0 ? <Button size="sm" variant="ghost" onClick={() => setPicked([])}>Clear selection</Button> : undefined}
          >
            <div className="mb-4 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SearchInput size="sm" label="Find" value={query} onChange={setQuery} placeholder="Project or road" />
              <SelectInput
                label="District"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                options={[{ value: 'all', label: 'Any' }, ...districts.map((d) => ({ value: String(d), label: `D${String(d).padStart(2, '0')} ${districtName(d)}` }))]}
              />
              <SelectInput
                label="Bedrooms"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                options={[
                  { value: 'all', label: 'Any' },
                  { value: '1', label: '1' },
                  { value: '2', label: '2' },
                  { value: '3', label: '3' },
                  { value: '4', label: '4 or more' },
                ]}
              />
              <TextInput label="Rent up to" inputMode="numeric" placeholder="Any" value={maxRent} onChange={(e) => setMaxRent(e.target.value.replace(/\D/g, ''))} />
            </div>

            {visible.length === 0 ? (
              <EmptyState
                compact
                icon={<Search size={20} />}
                title="Nothing matches"
                description={sendable.length ? 'Widen the filters above.' : 'A shortlist is built from published listings, so publish one first.'}
                action={sendable.length ? undefined : <LinkButton href="/phase1/listings" size="sm">Open the listing manager</LinkButton>}
              />
            ) : (
              <ul className="grid gap-2">
                {visible.map((l) => {
                  const on = picked.includes(l.id);
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => toggle(l.id)}
                        aria-pressed={on}
                        className={cx(
                          'flex w-full cursor-pointer items-center gap-3.5 rounded-xl border px-4 py-3 text-left transition-colors',
                          on ? 'border-p1-primary bg-p1-primary-soft/50' : 'border-p1-border bg-p1-surface hover:border-p1-border-strong',
                        )}
                      >
                        <span
                          aria-hidden
                          className={cx(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                            on ? 'border-p1-primary bg-p1-primary text-white' : 'border-p1-border-strong',
                          )}
                        >
                          {on && <Check size={13} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="min-w-0 truncate font-p1display text-[15px] font-bold text-p1-text">
                              {l.project} {l.unitNo}
                            </span>
                            <StatusBadge kind="listing" value={l.status} />
                          </span>
                          <span className="mt-0.5 block truncate text-[13px] text-p1-text-3">
                            D{String(l.district).padStart(2, '0')} {districtName(l.district)} · {l.bedrooms} bed · {l.sizeSqft.toLocaleString('en-SG')} sqft · {l.furnishing}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-p1display text-[16px] font-bold tabular-nums text-p1-text">{priceLabel(l).amount}</span>
                          <span className="block text-[12px] text-p1-text-3">{dealOf(l) === 'sale' ? 'asking price' : 'a month'}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Saved shortlists"
            description="Reopen one to change it, or export it again."
            icon={<FolderOpen size={16} />}
            padding={saved.length ? 'none' : 'md'}
          >
            {saved.length === 0 ? (
              <EmptyState compact title="Nothing saved yet" description="Pick some units and save the selection with the client's name on it." />
            ) : (
              <ul className="divide-y divide-p1-border">
                {saved.map((s) => {
                  const alive = s.listingIds.filter((id) => byId.has(id));
                  return (
                    <li key={s.id} className={cx('flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4', editingId === s.id && 'bg-p1-primary-soft/30')}>
                      <div className="min-w-0 flex-1 basis-56">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-p1display text-[15px] font-bold text-p1-text">{s.name}</span>
                          <Pill tone="neutral">{alive.length} {alive.length === 1 ? 'unit' : 'units'}</Pill>
                          {alive.length !== s.listingIds.length && <Pill tone="warning">{s.listingIds.length - alive.length} removed</Pill>}
                        </div>
                        <div className="mt-0.5 text-[12.5px] text-p1-text-3">
                          {s.clientName ? `For ${s.clientName} · ` : ''}saved {sgDate(s.createdAt)}
                        </div>
                        {s.note && <p className="mt-1 text-[13px] leading-5 text-p1-text-2">{s.note}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => load(s)}>Open</Button>
                        <Button size="sm" variant="outline" leftIcon={<Printer size={14} />} disabled={alive.length === 0} onClick={() => exportIds(alive, s.clientName, s.note)}>
                          Export
                        </Button>
                        <IconButton label={`Delete ${s.name}`} onClick={() => setRemoving(s)}>
                          <Trash2 size={15} />
                        </IconButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        <aside className="grid min-w-0 content-start gap-4 [&>*]:min-w-0">
          <SectionCard
            title={editingId ? 'Edit this shortlist' : 'Save this selection'}
            icon={<Users size={16} />}
            actions={editingId ? <Button size="sm" variant="ghost" leftIcon={<X size={14} />} onClick={clear}>New</Button> : undefined}
          >
            <div className="grid gap-4">
              <TextInput label="Client name" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Who it is for" optional />
              <TextInput label="Shortlist name" value={name} onChange={(e) => setName(e.target.value)} placeholder={client ? `${client}'s shortlist` : 'Saturday viewings'} optional />
              <TextArea label="Note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything to remember about this client" optional />

              {picked.length > 0 ? (
                <div className="rounded-xl border border-p1-border bg-p1-subtle/60 p-3.5">
                  <div className="text-[12.5px] font-semibold text-p1-text-2">In the document</div>
                  <ul className="mt-2 space-y-1.5">
                    {picked.map((id) => {
                      const l = byId.get(id);
                      if (!l) return null;
                      return (
                        <li key={id} className="flex items-center justify-between gap-3 text-[13px]">
                          <span className="min-w-0 truncate text-p1-text">{l.project} {l.unitNo}</span>
                          <span className="shrink-0 tabular-nums text-p1-text-2">{priceLabel(l).amount}{dealOf(l) === 'sale' ? '' : '/mo'}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="text-[13px] text-p1-text-3">Tick units on the left and they appear here.</p>
              )}

              <div className="grid gap-2">
                <Button variant="primary" block disabled={picked.length === 0} onClick={save} leftIcon={<Plus size={16} />}>
                  {editingId ? 'Save the changes' : 'Save the shortlist'}
                </Button>
                <Button variant="outline" block disabled={picked.length === 0} onClick={() => exportIds(picked, client, note)} leftIcon={<Printer size={16} />}>
                  Export as PDF now
                </Button>
              </div>
            </div>
          </SectionCard>

          <Callout tone="info" title="What goes in the document" icon={<Info size={17} />}>
            Every unit with its photographs, rent, size, furnishing, availability and nearest station — then your name,
            CEA registration and agency licence on the last page, which the advertising rules require on anything you
            send a client.
          </Callout>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        destructive
        title="Delete this shortlist?"
        description="The listings themselves are not touched — only the saved selection."
        confirmLabel="Delete"
      />
    </>
  );
}
