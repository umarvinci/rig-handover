import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, ReadNight, RunStatus } from './types.js';

// Plan morning-digest § 1. A line that isn't a run is counted in badLines, never thrown: the
// night still renders.

type Run = { at: string; t: number; job: string; status: RunStatus; owner: string | null; error: string | null };

// Same shape as nightsOnDisk; also keeps a route param like `..%2F..` out of the path.
const NIGHT = /^\d{4}-\d{2}-\d{2}$/;
// ISO 8601 with its offset: without one, the time order would depend on the server's zone.
const STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

const isStatus = (s: unknown): s is RunStatus => s === 'ok' || s === 'retry' || s === 'fail';
const isText = (s: unknown): s is string | null => s === null || typeof s === 'string';

// The edge: anything that isn't exactly a run is null. A missing owner or error reads as null.
function parseRun(line: string): Run | null {
  let v: unknown;
  try {
    v = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const { at, job, status, owner = null, error = null } = v as Record<string, unknown>;
  if (typeof at !== 'string' || !STAMP.test(at)) return null;
  const t = Date.parse(at);
  if (!Number.isFinite(t) || typeof job !== 'string' || job === '') return null;
  if (!isStatus(status) || !isText(owner) || !isText(error)) return null;
  return { at, t, job, status, owner, error };
}

// `at` is compared as a time and stored as written. Equal times keep file order (stable sort).
// Owner and status come from the job's latest run.
function toRow(job: string, runs: Run[]): DigestRow {
  const inOrder = runs.toSorted((a, b) => a.t - b.t);
  const first = inOrder[0];
  const last = inOrder[inOrder.length - 1];
  return {
    job,
    owner: last.owner,
    runs: runs.length,
    retries: runs.filter((r) => r.status === 'retry').length,
    fails: runs.filter((r) => r.status === 'fail').length,
    lastStatus: last.status,
    lastError: inOrder.findLast((r) => r.error !== null)?.error ?? null,
    firstAt: first.at,
    lastAt: last.at,
  };
}

export const readNight: ReadNight = (runsDir, night) => {
  if (!NIGHT.test(night)) return null;
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch (e) {
    if (e instanceof Error && 'code' in e && e.code === 'ENOENT') return null;
    throw e;
  }

  // Blank lines at the end are the file's last newline, not bad lines.
  const body = text.trimEnd();
  const byJob = new Map<string, Run[]>();
  let badLines = 0;
  for (const line of body === '' ? [] : body.split('\n')) {
    const run = parseRun(line);
    if (run === null) {
      badLines++;
      continue;
    }
    const runs = byJob.get(run.job) ?? [];
    runs.push(run);
    byJob.set(run.job, runs);
  }

  const rows = [...byJob].sort(([a], [b]) => (a < b ? -1 : 1)).map(([job, runs]) => toRow(job, runs));
  return { rows, badLines };
};
