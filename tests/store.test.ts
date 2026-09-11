/**
 * The record store.
 *
 * Every account, workspace, decision and logged request in the product goes
 * through this, so the semantics it promises are worth pinning down: an id is
 * unique, a patch merges rather than replaces, `undefined` removes a field
 * rather than setting it to nothing, a dotted key reaches into a nested object,
 * and the capped append keeps the newest rows rather than the first ones.
 *
 * These run against the file backend, which is what a laptop and CI use. The
 * MongoDB backend implements the same contract — the point of writing it down
 * here is that the two cannot quietly diverge on what a patch means.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

interface Person {
  id: string;
  name: string;
  email?: string;
  at: string;
  cea?: { registrationNo: string };
}

let dir: string;
// Imported fresh per test, because the backend reads its directory once.
let store: <T extends { id: string }>(name: string) => import('../lib/store/driver').Store<T>;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'vrent-store-'));
  process.env.VRENT_DATA_DIR = dir;
  delete process.env.MONGODB_URI;
  // The backend resolves its directory once, at module load, so each test needs
  // the module evaluated again against its own temporary directory.
  vi.resetModules();
  ({ store } = await import('../lib/store/driver'));
});

afterEach(async () => {
  delete process.env.VRENT_DATA_DIR;
  await rm(dir, { recursive: true, force: true });
});

const person = (id: string, over: Partial<Person> = {}): Person => ({
  id,
  name: `Person ${id}`,
  at: '2026-09-01T00:00:00.000Z',
  ...over,
});

describe('the record store', () => {
  it('reads back what it wrote, and nothing for an id it has never seen', async () => {
    const people = store<Person>('people');
    await people.put(person('a', { name: 'Li Minghong' }));

    expect((await people.get('a'))?.name).toBe('Li Minghong');
    expect(await people.get('nobody')).toBeNull();
  });

  it('treats the id as unique — a second put replaces rather than appends', async () => {
    const people = store<Person>('people');
    await people.put(person('a', { name: 'First' }));
    await people.put(person('a', { name: 'Second' }));

    expect(await people.count()).toBe(1);
    expect((await people.get('a'))?.name).toBe('Second');
  });

  it('finds one by a field, and by a dotted path into a nested object', async () => {
    const people = store<Person>('people');
    await people.put(person('a', { email: 'a@vrent.sg', cea: { registrationNo: 'R026417F' } }));
    await people.put(person('b', { email: 'b@vrent.sg', cea: { registrationNo: 'R111111Z' } }));

    expect((await people.findOne({ email: 'b@vrent.sg' }))?.id).toBe('b');
    expect((await people.findOne({ 'cea.registrationNo': 'R026417F' }))?.id).toBe('a');
    expect(await people.findOne({ email: 'nobody@vrent.sg' })).toBeNull();
  });

  it('finds every match, without returning the rest of the collection', async () => {
    const people = store<Person>('people');
    await people.put(person('a', { email: 'shared@vrent.sg' }));
    await people.put(person('b', { email: 'shared@vrent.sg' }));
    await people.put(person('c', { email: 'other@vrent.sg' }));

    const matching = await people.find({ email: 'shared@vrent.sg' });
    expect(matching.map((p) => p.id).sort()).toEqual(['a', 'b']);
  });

  it('merges a patch into the record rather than replacing it', async () => {
    const people = store<Person>('people');
    await people.put(person('a', { name: 'Li Minghong', email: 'a@vrent.sg' }));

    expect(await people.patch('a', { name: 'Michelle Li' })).toBe(true);

    const after = await people.get('a');
    expect(after?.name).toBe('Michelle Li');
    expect(after?.email).toBe('a@vrent.sg');
  });

  it('reports a patch against an id that is not there, rather than creating one', async () => {
    const people = store<Person>('people');
    expect(await people.patch('ghost', { name: 'Nobody' })).toBe(false);
    expect(await people.count()).toBe(0);
  });

  it('removes a field patched to undefined instead of keeping an empty one', async () => {
    // The account store clears a lock this way; a field left present but empty
    // would still read as data to everything downstream.
    const people = store<Person>('people');
    await people.put(person('a', { email: 'a@vrent.sg' }));
    await people.patch('a', { email: undefined });

    const after = await people.get('a');
    expect(after?.email ?? null).toBeNull();
  });

  it('sorts and limits a listing', async () => {
    const people = store<Person>('people');
    await people.put(person('a', { at: '2026-09-01T00:00:00.000Z' }));
    await people.put(person('b', { at: '2026-09-03T00:00:00.000Z' }));
    await people.put(person('c', { at: '2026-09-02T00:00:00.000Z' }));

    const newest = await people.list({ sort: { field: 'at', dir: -1 }, limit: 2 });
    expect(newest.map((p) => p.id)).toEqual(['b', 'c']);
  });

  it('deletes', async () => {
    const people = store<Person>('people');
    await people.put(person('a'));
    await people.remove('a');
    expect(await people.get('a')).toBeNull();
  });

  it('counts the whole collection, and the part matching a filter', async () => {
    const people = store<Person>('people');
    await people.put(person('a', { email: 'a@vrent.sg' }));
    await people.put(person('b', { email: 'a@vrent.sg' }));
    await people.put(person('c', { email: 'c@vrent.sg' }));

    expect(await people.count()).toBe(3);
    expect(await people.count({ email: 'a@vrent.sg' })).toBe(2);
  });

  it('keeps the newest rows when an append passes the cap', async () => {
    // The audit trail and the request log both rely on this: the cap must drop
    // the oldest, never the most recent, or the screen shows stale rows.
    const rows = store<Person>('rows');
    for (let i = 1; i <= 5; i += 1) {
      await rows.appendCapped([person(`r${i}`, { at: `2026-09-0${i}T00:00:00.000Z` })], 3, 'at');
    }

    const kept = await rows.list({ sort: { field: 'at', dir: -1 } });
    expect(kept).toHaveLength(3);
    expect(kept.map((r) => r.id)).toEqual(['r5', 'r4', 'r3']);
  });

  it('keeps collections apart', async () => {
    await store<Person>('one').put(person('a'));
    expect(await store<Person>('two').count()).toBe(0);
  });

  it('does not lose a write when several land at once', async () => {
    // Two requests arriving together each read, change and write the whole
    // file. Without serialisation the second overwrites the first.
    const people = store<Person>('people');
    await Promise.all(
      Array.from({ length: 12 }, (_, i) => people.put(person(`p${i}`))),
    );
    expect(await people.count()).toBe(12);
  });
});
