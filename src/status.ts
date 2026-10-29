import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { readNight } from './digest/read.js';
import { lastBeat, type Beat } from './heartbeat.js';

// Runs (log lines) by status. null: the night can't be read, so the board shows `—`.
export type NightCounts = { ok: number; retry: number; fail: number };
export type Night = { night: string; counts: NightCounts | null };

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: Night[];
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

// Counts come from the digest reader, so the board and the digest page agree. Bad lines are not
// runs; a night with some still has counts.
function nightCounts(runsDir: string, night: string): NightCounts | null {
  try {
    const digest = readNight(runsDir, night);
    if (digest === null) return null;
    const runs = digest.rows.reduce((n, r) => n + r.runs, 0);
    const retry = digest.rows.reduce((n, r) => n + r.retries, 0);
    const fail = digest.rows.reduce((n, r) => n + r.fails, 0);
    return { ok: runs - retry - fail, retry, fail };
  } catch {
    return null;
  }
}

export function readStatus(config: RigConfig): Status {
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights: nightsOnDisk(config.runsDir).map((night) => ({ night, counts: nightCounts(config.runsDir, night) })),
  };
}
