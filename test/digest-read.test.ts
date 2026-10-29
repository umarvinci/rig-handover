import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

// runs/ is read-only: made-up nights go in a temp dir.
const tmp = mkdtempSync(join(tmpdir(), 'rig-runs-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function night(name: string, lines: string[]): string {
  writeFileSync(join(tmp, `${name}.jsonl`), lines.join('\n'));
  return name;
}

describe('readNight', () => {
  it('reads 2026-10-28: 5 jobs sorted by job, the cut-off last line counted', () => {
    const d = readNight('runs', '2026-10-28');
    expect(d?.badLines).toBe(1);
    expect(d?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('keeps a row whose owner is null', () => {
    const row = readNight('runs', '2026-10-28')?.rows.find((r) => r.job === 'digest/render');
    expect(row?.owner).toBeNull();
  });

  it('counts retries and keeps the last error after a later ok', () => {
    const row = readNight('runs', '2026-10-28')?.rows.find((r) => r.job === 'fixtures/refresh');
    expect(row).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
  });

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '2026-10-01')).toBeNull();
    expect(readNight('runs', '../package')).toBeNull();
  });

  it('reads an empty night as nothing ran', () => {
    expect(readNight(tmp, night('2026-10-02', []))).toEqual({ rows: [], badLines: 0 });
  });

  it('orders by time, not by string, and keeps the offsets as written', () => {
    const n = night('2026-10-03', [
      '{"at":"2026-10-03T01:00:00+01:00","job":"a","status":"fail","owner":"x","error":"boom"}',
      '{"at":"2026-10-03T00:30:00Z","job":"a","status":"ok","owner":"x"}',
      '{"at":"2026-10-02T23:45:00Z","job":"a","status":"retry","owner":"x"}',
      '',
    ]);
    const row = readNight(tmp, n)?.rows[0];
    expect(row).toMatchObject({ lastStatus: 'ok', lastError: 'boom', firstAt: '2026-10-02T23:45:00Z', lastAt: '2026-10-03T00:30:00Z' });
  });

  it('counts valid JSON of the wrong shape as bad, not a blank last line', () => {
    const n = night('2026-10-04', [
      '{"at":"2026-10-04T01:00:00+01:00","job":"a","status":"ok","owner":"x"}',
      '{"at":"2026-10-04T01:00:00+01:00","status":"ok","owner":"x"}',
      '{"at":"2026-10-04T01:00:00+01:00","job":"a","status":"done","owner":"x"}',
      '{"at":"yesterday","job":"a","status":"ok","owner":"x"}',
      '[1,2]',
      '',
    ]);
    expect(readNight(tmp, n)).toMatchObject({ badLines: 4, rows: [{ job: 'a', runs: 1 }] });
  });
});
