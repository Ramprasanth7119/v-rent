/**
 * Where this instance is allowed to write.
 *
 * Every store in the product keeps its state as JSON under one directory, and
 * on a laptop or a long-running server that directory is `.data` beside the
 * source. On a serverless platform it cannot be: the deployment bundle is
 * mounted read-only, so the first `mkdir` fails with ENOENT and the request
 * that triggered it — signing in, usually — returns a 500.
 *
 * The only writable path in that environment is the instance's own `/tmp`, so
 * that is where it goes. The consequence has to be understood rather than
 * hidden: `/tmp` belongs to one instance and does not survive a cold start, so
 * anything written there is a working set, not a record. The product is built
 * to cope — accounts re-seed from the environment on the next sign-in and a
 * workspace re-seeds from the sample portfolio — so a cold start produces a
 * fresh, correct demo rather than an error. It is not a place to keep anything
 * that matters.
 *
 * `VRENT_DATA_DIR` overrides both, which is the seam a real deployment uses:
 * point it at a mounted volume, or replace the four functions at the bottom of
 * each store with a database client.
 *
 * Server only.
 */

import path from 'node:path';
import os from 'node:os';

/**
 * True when the filesystem beside the code is read-only.
 *
 * `VERCEL` is set on every Vercel runtime; `AWS_LAMBDA_FUNCTION_NAME` and
 * `LAMBDA_TASK_ROOT` catch Lambda directly and the platforms built on it.
 */
export const isServerless = Boolean(
  process.env.VERCEL
  || process.env.AWS_LAMBDA_FUNCTION_NAME
  || process.env.LAMBDA_TASK_ROOT
  || process.env.NETLIFY,
);

/**
 * The root every store writes under.
 *
 * Resolved once at module load: it cannot change while the process is alive,
 * and a store re-deriving it per call would be a chance to get it wrong.
 */
export const DATA_DIR = process.env.VRENT_DATA_DIR
  ? path.resolve(process.env.VRENT_DATA_DIR)
  : isServerless
    ? path.join(os.tmpdir(), 'vrent-data')
    : path.join(process.cwd(), '.data');

/** True when what is written here will not survive the instance. */
export const storageIsEphemeral = isServerless && !process.env.VRENT_DATA_DIR;

/** A file or directory under the data root. */
export const dataPath = (...parts: string[]) => path.join(DATA_DIR, ...parts);
