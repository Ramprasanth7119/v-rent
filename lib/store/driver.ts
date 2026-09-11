/**
 * Where records live.
 *
 * Every store in the product used to read a whole JSON file, change one thing
 * in it and write the file back. That works on a laptop and fails on a cloud
 * platform in two ways at once: the filesystem beside the code is read-only, so
 * there is nowhere to write; and the writable path that is left belongs to a
 * single instance and is discarded when it recycles, so an account created at
 * two o'clock is gone by three.
 *
 * So records go to MongoDB when `MONGODB_URI` is set, and to files otherwise.
 * The file backend is kept deliberately: a laptop should need no database to
 * run the product, and the tests should not need one either.
 *
 * The interface is the smaller half of what a document database offers —
 * fetch by id, fetch one by field, list, write, patch, delete, and an
 * append-with-a-cap for the two logs. That is all seven stores ever needed, and
 * keeping it small is what lets one of them be a JSON file.
 *
 * Server only.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Collection, Db, MongoClient } from 'mongodb';
import { DATA_DIR } from '../storage';

/** Every record carries its own id; Mongo's `_id` mirrors it. */
export interface Record {
  id: string;
}

/** Equality only. Dotted keys reach into nested objects on both backends. */
export type Where = globalThis.Record<string, string | number | boolean | null | undefined>;

export interface ListOptions {
  sort?: { field: string; dir: 1 | -1 };
  limit?: number;
}

export interface Store<T extends Record> {
  get(id: string): Promise<T | null>;
  findOne(where: Where): Promise<T | null>;
  /** Everything matching. Use this rather than filtering a whole `list()`. */
  find(where: Where, options?: ListOptions): Promise<T[]>;
  list(options?: ListOptions): Promise<T[]>;
  put(doc: T): Promise<void>;
  patch(id: string, changes: Partial<T>): Promise<boolean>;
  remove(id: string): Promise<void>;
  count(where?: Where): Promise<number>;
  /** Insert, then keep only the newest `cap` by `sortField`. For the two logs. */
  appendCapped(docs: T[], cap: number, sortField: string): Promise<void>;
}

export const usingMongo = Boolean(process.env.MONGODB_URI);

/* ------------------------------------------------------------------ mongo */

/**
 * One client for the whole process, and deliberately on `globalThis`.
 *
 * A serverless instance handles many requests, and a module-level variable is
 * re-initialised on every hot reload in development. Without this, each reload
 * opens another connection pool and the database runs out of connections long
 * before the developer notices why.
 */
declare global {
  // eslint-disable-next-line no-var
  var __vrentMongo: Promise<{ client: MongoClient; db: Db }> | undefined;
}

/**
 * The database to use: `MONGODB_DB` if set, otherwise the path of the
 * connection string, otherwise a default. Parsing is best effort — a malformed
 * URI should fail on connect with the driver's own message, not here with a
 * `URL` error that says nothing about MongoDB.
 */
function databaseName(uri: string): string {
  if (process.env.MONGODB_DB) return process.env.MONGODB_DB;
  try {
    const path = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'https://')).pathname.slice(1);
    if (path) return decodeURIComponent(path);
  } catch {
    /* falls through to the default */
  }
  return 'vrent';
}

async function connect(): Promise<{ client: MongoClient; db: Db }> {
  const uri = process.env.MONGODB_URI!;
  const { MongoClient: Client } = await import('mongodb');
  const client = new Client(uri, {
    // A cold start should fail fast and say so, rather than holding the request
    // open until the platform kills it.
    // Short enough to still return an honest error inside a serverless
    // function's budget rather than being killed mid-wait.
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    maxPoolSize: 10,
  });
  await client.connect();
  return { client, db: client.db(databaseName(uri)) };
}

/**
 * How long a failure is believed before trying again.
 *
 * Two things have to be true at once. A failed connection must not be cached
 * for the life of the instance, or one unlucky cold start poisons every request
 * it ever serves. But a request that makes six store calls must not wait out
 * six separate five-second timeouts either — that is half a minute of a visitor
 * watching a spinner, and longer than the platform will hold the function open.
 * So a failure is remembered for a few seconds: long enough for the rest of the
 * request to give up immediately, short enough that the next one tries again.
 */
const RETRY_AFTER_MS = 4000;
let failedAt = 0;
let lastFailure: Error | null = null;

export function mongo(): Promise<{ client: MongoClient; db: Db }> {
  if (lastFailure && Date.now() - failedAt < RETRY_AFTER_MS) {
    return Promise.reject(lastFailure);
  }

  if (!globalThis.__vrentMongo) {
    globalThis.__vrentMongo = connect().catch((err: Error) => {
      globalThis.__vrentMongo = undefined;
      failedAt = Date.now();
      lastFailure = err;
      throw err;
    });
  }
  return globalThis.__vrentMongo.then((conn) => {
    lastFailure = null;
    return conn;
  });
}

/** Indexes are created once per process, not per query. */
const indexed = new Set<string>();

async function collection<T extends Record>(name: string): Promise<Collection<T>> {
  const { db } = await mongo();
  const col = db.collection<T>(name);
  if (!indexed.has(name)) {
    indexed.add(name);
    // Best effort. An index that cannot be created is a slow query, not a
    // broken one, and must not take the request down with it.
    void col.createIndex({ id: 1 }, { unique: true }).catch(() => {});
    // The two logs are always read newest-first and trimmed oldest-first.
    if (name === 'audit' || name === 'requests') {
      void col.createIndex({ at: -1 }).catch(() => {});
    }
    if (name === 'accounts') {
      void col.createIndex({ email: 1 }).catch(() => {});
      void col.createIndex({ 'cea.registrationNo': 1 }).catch(() => {});
    }
    if (name === 'photos') {
      void col.createIndex({ ownerId: 1, listingId: 1 }).catch(() => {});
    }
  }
  return col;
}

/** Mongo hands back `_id`, which nothing above this layer knows or wants. */
const strip = <T>(doc: unknown): T | null => {
  if (!doc) return null;
  const { _id, ...rest } = doc as globalThis.Record<string, unknown>;
  void _id;
  return rest as T;
};

function mongoStore<T extends Record>(name: string): Store<T> {
  return {
    async get(id) {
      const col = await collection<T>(name);
      return strip<T>(await col.findOne({ id } as never));
    },

    async findOne(where) {
      const col = await collection<T>(name);
      return strip<T>(await col.findOne(clean(where) as never));
    },

    async find(where, options) {
      const col = await collection<T>(name);
      let cursor = col.find(clean(where) as never);
      if (options?.sort) cursor = cursor.sort({ [options.sort.field]: options.sort.dir });
      if (options?.limit) cursor = cursor.limit(options.limit);
      return (await cursor.toArray()).map((d) => strip<T>(d)!).filter(Boolean);
    },

    async list(options) {
      const col = await collection<T>(name);
      let cursor = col.find({});
      if (options?.sort) cursor = cursor.sort({ [options.sort.field]: options.sort.dir });
      if (options?.limit) cursor = cursor.limit(options.limit);
      return (await cursor.toArray()).map((d) => strip<T>(d)!).filter(Boolean);
    },

    async put(doc) {
      const col = await collection<T>(name);
      await col.replaceOne({ id: doc.id } as never, doc as never, { upsert: true });
    },

    async patch(id, changes) {
      const col = await collection<T>(name);
      /* `undefined` means "remove this field". The driver would otherwise write
         it as null, which is a different thing: a lock cleared by setting
         `lockedUntil: undefined` would come back as a present-but-null field
         and read as data rather than absence. */
      const set: globalThis.Record<string, unknown> = {};
      const unset: globalThis.Record<string, ''> = {};
      for (const [field, value] of Object.entries(changes as object)) {
        if (value === undefined) unset[field] = '';
        else set[field] = value;
      }
      const update: globalThis.Record<string, unknown> = {};
      if (Object.keys(set).length) update.$set = set;
      if (Object.keys(unset).length) update.$unset = unset;
      if (!Object.keys(update).length) return Boolean(await col.findOne({ id } as never));

      const res = await col.updateOne({ id } as never, update as never);
      return res.matchedCount > 0;
    },

    async remove(id) {
      const col = await collection<T>(name);
      await col.deleteOne({ id } as never);
    },

    async count(where) {
      const col = await collection<T>(name);
      return col.countDocuments(clean(where ?? {}) as never);
    },

    async appendCapped(docs, cap, sortField) {
      if (!docs.length) return;
      const col = await collection<T>(name);
      try {
        await col.insertMany(docs as never[], { ordered: false });
      } catch (err) {
        /* A row already written — a retried request, a duplicate id — is not a
           reason to lose the rest of the batch, and `ordered: false` has
           already inserted them. Anything else is worth knowing about. */
        const code = (err as { code?: number }).code;
        if (code !== 11000) throw err;
      }
      const total = await col.countDocuments({});
      if (total <= cap) return;
      // Trim the oldest. One query for the cut-off, one delete below it.
      const cutoff = await col
        .find({})
        .sort({ [sortField]: -1 })
        .skip(cap - 1)
        .limit(1)
        .toArray();
      const edge = (cutoff[0] as globalThis.Record<string, unknown> | undefined)?.[sortField];
      if (edge !== undefined) await col.deleteMany({ [sortField]: { $lt: edge } } as never);
    },
  };
}

/** Mongo rejects `undefined` in a filter; the file backend would match on it. */
const clean = (where: Where): Where => {
  const out: Where = {};
  for (const [k, v] of Object.entries(where)) if (v !== undefined) out[k] = v;
  return out;
};

/* ------------------------------------------------------------------- file */

const reach = (doc: unknown, dotted: string): unknown =>
  dotted.split('.').reduce<unknown>(
    (node, key) => (node && typeof node === 'object' ? (node as globalThis.Record<string, unknown>)[key] : undefined),
    doc,
  );

const matches = (doc: unknown, where: Where) =>
  Object.entries(clean(where)).every(([field, value]) => reach(doc, field) === value);

function sortAndLimit<T>(docs: T[], options?: ListOptions): T[] {
  let out = docs;
  if (options?.sort) {
    const { field, dir } = options.sort;
    out = [...out].sort((a, b) => {
      const x = reach(a, field);
      const y = reach(b, field);
      if (x === y) return 0;
      return ((x as never) > (y as never) ? 1 : -1) * dir;
    });
  }
  return options?.limit ? out.slice(0, options.limit) : out;
}

function fileStore<T extends Record>(name: string): Store<T> {
  const file = path.join(DATA_DIR, `${name}.json`);

  /* One writer at a time per collection. Two requests that each read, change
     and write the whole file would otherwise lose one of the changes. */
  let queue: Promise<unknown> = Promise.resolve();
  const serialise = <R>(work: () => Promise<R>): Promise<R> => {
    const next = queue.then(work, work);
    queue = next.catch(() => {});
    return next;
  };

  const readAll = async (): Promise<T[]> => {
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8')) as { docs?: T[] };
      return parsed.docs ?? [];
    } catch {
      return [];
    }
  };

  const writeAll = async (docs: T[]) => {
    await mkdir(DATA_DIR, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify({ docs }, null, 2), 'utf8');
    await rename(tmp, file);
  };

  return {
    async get(id) {
      return (await readAll()).find((d) => d.id === id) ?? null;
    },

    async findOne(where) {
      return (await readAll()).find((d) => matches(d, where)) ?? null;
    },

    async find(where, options) {
      const matching = (await readAll()).filter((d) => matches(d, where));
      return sortAndLimit(matching, options);
    },

    async list(options) {
      return sortAndLimit(await readAll(), options);
    },

    put(doc) {
      return serialise(async () => {
        const docs = await readAll();
        const at = docs.findIndex((d) => d.id === doc.id);
        if (at >= 0) docs[at] = doc;
        else docs.push(doc);
        await writeAll(docs);
      });
    },

    patch(id, changes) {
      return serialise(async () => {
        const docs = await readAll();
        const at = docs.findIndex((d) => d.id === id);
        if (at < 0) return false;
        docs[at] = { ...docs[at], ...changes };
        await writeAll(docs);
        return true;
      });
    },

    remove(id) {
      return serialise(async () => {
        await writeAll((await readAll()).filter((d) => d.id !== id));
      });
    },

    async count(where) {
      const docs = await readAll();
      return where ? docs.filter((d) => matches(d, where)).length : docs.length;
    },

    appendCapped(docs, cap, sortField) {
      return serialise(async () => {
        const all = [...docs, ...(await readAll())];
        all.sort((a, b) => String(reach(b, sortField)).localeCompare(String(reach(a, sortField))));
        await writeAll(all.slice(0, cap));
      });
    },
  };
}

/* ----------------------------------------------------------------- public */

const cache = new Map<string, Store<Record>>();

/** The store for one collection. Same interface whichever backend is behind it. */
export function store<T extends Record>(name: string): Store<T> {
  const existing = cache.get(name);
  if (existing) return existing as Store<T>;
  const made = (usingMongo ? mongoStore<T>(name) : fileStore<T>(name)) as Store<Record>;
  cache.set(name, made);
  return made as unknown as Store<T>;
}

/** For the health check: is the database reachable, and how long did it take. */
export async function storeHealth(): Promise<{ backend: 'mongodb' | 'files'; ok: boolean; ms: number; detail?: string }> {
  const started = Date.now();
  if (!usingMongo) return { backend: 'files', ok: true, ms: 0, detail: DATA_DIR };
  try {
    const { db } = await mongo();
    await db.command({ ping: 1 });
    return { backend: 'mongodb', ok: true, ms: Date.now() - started };
  } catch (err) {
    return {
      backend: 'mongodb',
      ok: false,
      ms: Date.now() - started,
      detail: err instanceof Error ? err.message : 'could not reach the database',
    };
  }
}
