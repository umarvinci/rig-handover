import type { Digest, DigestRow } from '../digest/types.js';

// A job that retried this often, or whose last run failed, is marked `warn`.
const RETRY_WARN_AT = 3;

// Missing data is `—`, never an empty cell (styleguide). Empty text counts as missing.
const orDash = (s: string | null) => (s?.trim() ? s : '—');

const isWarn = (r: DigestRow) => r.retries >= RETRY_WARN_AT || r.lastStatus === 'fail';

// digest is null when the night has no file: the route answers 404 and this says why.
export function DigestPage({ night, digest }: { night: string; digest: Digest | null }) {
  if (digest === null) {
    return (
      <>
        <h1>digest · {night}</h1>
        <p class="warn">no run log for this night</p>
      </>
    );
  }
  return (
    <>
      <h1>digest · {night}</h1>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((r) => (
              <tr class={isWarn(r) ? 'warn' : undefined}>
                <td>{r.job}</td>
                <td>{orDash(r.owner)}</td>
                <td>{r.runs}</td>
                <td>{r.retries}</td>
                <td>{r.lastStatus}</td>
                <td>{orDash(r.lastError)}</td>
                <td>{r.firstAt}</td>
                <td>{r.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p class={digest.badLines > 0 ? 'warn' : 'mute'}>lines that did not parse: {digest.badLines}</p>
    </>
  );
}
