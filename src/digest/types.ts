// Plan morning-digest § 1. The shape every part of § 2 builds on; the reader itself is #2.
// Times are the log's own strings, offset kept: never converted to UTC (styleguide).

export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job in runs/<night>.jsonl. `runs` counts its lines, `retries` and `fails` its `retry`
// and `fail` lines.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  fails: number;
  lastStatus: RunStatus;
  // The latest error the job logged, even if a later run was ok.
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

// Rows sorted by job, so the page and the JSON agree. An empty file: no rows, "nothing ran".
export type Digest = { rows: DigestRow[]; badLines: number };

// null: no file for that night (404).
export type ReadNight = (runsDir: string, night: string) => Digest | null;
