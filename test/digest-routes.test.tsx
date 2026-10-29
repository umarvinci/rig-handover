import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Digest } from '../src/digest/types.js';

// runs/ is read-only: made-up nights go in a temp dir, one night per test.
const tmp = mkdtempSync(join(tmpdir(), 'rig-routes-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: tmp });

function night(name: string, lines: string[]): string {
  writeFileSync(join(tmp, `${name}.jsonl`), lines.join('\n'));
  return name;
}

// The job cell of each table row, in page order.
const pageJobs = (html: string) => [...html.matchAll(/<tr[^>]*><td>([^<]*)<\/td>/g)].map((m) => m[1]);

describe('digest page and JSON', () => {
  it('answer 200 and list the same jobs in the same order, sorted by job', async () => {
    // Written out of order on purpose: the order comes from readNight, not from the file.
    const n = night('2026-11-01', [
      '{"at":"2026-11-01T01:00:00+01:00","job":"zeta/sync","status":"ok","owner":"sam"}',
      '{"at":"2026-11-01T01:05:00+01:00","job":"alpha/build","status":"retry","owner":"kim","error":"timeout"}',
      '{"at":"2026-11-01T01:10:00+01:00","job":"mid/clean","status":"ok","owner":null}',
      '{"at":"2026-11-01T01:15:00+01:00","job":"alpha/build","status":"ok","owner":"kim"}',
      '',
    ]);
    const jobs = ['alpha/build', 'mid/clean', 'zeta/sync'];

    const page = await app.request(`/digest/${n}`);
    expect(page.status).toBe(200);
    expect(page.headers.get('content-type')).toContain('text/html');
    expect(pageJobs(await page.text())).toEqual(jobs);

    const api = await app.request(`/api/digest/${n}`);
    expect(api.status).toBe(200);
    expect(api.headers.get('content-type')).toContain('application/json');
    const digest = (await api.json()) as Digest;
    expect(digest.rows.map((r) => r.job)).toEqual(jobs);
    expect(digest.badLines).toBe(0);
  });

  it('answer 404 for a night with no file', async () => {
    const page = await app.request('/digest/2026-11-02');
    expect(page.status).toBe(404);
    expect(await page.text()).toContain('no run log for this night');

    const api = await app.request('/api/digest/2026-11-02');
    expect(api.status).toBe(404);
    expect(await api.json()).toEqual({ error: 'no such night', night: '2026-11-02' });
  });

  it('answer 404 for a night that is not a date', async () => {
    const page = await app.request('/digest/tonight');
    expect(page.status).toBe(404);
    expect(await page.text()).toContain('no run log for this night');

    const api = await app.request('/api/digest/tonight');
    expect(api.status).toBe(404);
    expect(await api.json()).toEqual({ error: 'no such night', night: 'tonight' });
  });

  it('show an empty night as nothing ran: no table, no rows, no bad lines', async () => {
    const n = night('2026-11-03', []);

    const page = await app.request(`/digest/${n}`);
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(html).toContain('nothing ran');
    expect(html).not.toContain('<table');
    expect(html).toContain('lines that did not parse: 0');

    const api = await app.request(`/api/digest/${n}`);
    expect(api.status).toBe(200);
    expect(await api.json()).toEqual({ rows: [], badLines: 0 });
  });

  it('count a bad line on both, and still list the jobs around it', async () => {
    const n = night('2026-11-04', [
      '{"at":"2026-11-04T01:00:00+01:00","job":"b/job","status":"ok","owner":"sam"}',
      '{"at":"2026-11-04T01:05:00+01:00","job":"a/job","status":"ok","ow',
      '{"at":"2026-11-04T01:10:00+01:00","status":"ok","owner":"sam"}',
      '{"at":"2026-11-04T01:15:00+01:00","job":"a/job","status":"fail","owner":"sam","error":"boom"}',
      '',
    ]);

    const page = await app.request(`/digest/${n}`);
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(html).toContain('lines that did not parse: 2');
    expect(pageJobs(html)).toEqual(['a/job', 'b/job']);

    const api = await app.request(`/api/digest/${n}`);
    expect(api.status).toBe(200);
    const digest = (await api.json()) as Digest;
    expect(digest.badLines).toBe(2);
    expect(digest.rows.map((r) => r.job)).toEqual(['a/job', 'b/job']);
  });
});
