import React, { useState } from 'react';
import { CloudOff, LogIn, RefreshCw, Loader2 } from 'lucide-react';
import { C, glass2, btnSm, R, CC, tint } from '../../lib/theme';
import { retryTracksNow } from '../../lib/trackQueue';

// Surfaces the Track outbox (src/lib/trackQueue.js) so a queued track is a visible, explained,
// retryable state rather than a mystery. Renders nothing when the queue is empty, which is the
// overwhelmingly common case.
//
// The wording matters here: an item in this list IS saved — on this device, durably, across
// reloads — it just hasn't reached the account yet. Telling a student "couldn't save" when the
// data is safely on disk is both untrue and the thing that makes people re-tap Track and create
// duplicates. Mirrors how Settings already talks about a paused progress sync.
export default function TrackQueueNotice({ entries = [], status = {}, onRetried }) {
  const [retrying, setRetrying] = useState(false);
  const queued = entries.filter(e => e.status !== 'blocked');
  const blocked = entries.filter(e => e.status === 'blocked');
  if (!entries.length) return null;

  const color = blocked.length ? C.violet : C.amber;
  const Icon = blocked.length ? LogIn : CloudOff;

  async function retry() {
    setRetrying(true);
    try { await retryTracksNow(); } catch { /* the queue keeps the entry either way */ }
    finally { setRetrying(false); onRetried?.(); }
  }

  return (
    <div style={{ ...glass2({ padding: 14 }), border: `1px solid ${tint(color, 0.3)}`, background: `linear-gradient(120deg,${tint(color, 0.08)},rgba(255,255,255,0.02) 55%)` }}>
      <div style={R({ gap: 8, marginBottom: 8 })}>
        <Icon size={14} color={color} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>
          {blocked.length
            ? `${blocked.length} item${blocked.length === 1 ? '' : 's'} waiting for you to sign in`
            : `${queued.length} item${queued.length === 1 ? '' : 's'} finishing saving`}
        </span>
      </div>
      <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, marginBottom: 10 }}>
        {blocked.length
          ? 'These are saved on this device and will be added to your account automatically once you sign in — nothing has been lost.'
          : "These are saved on this device. They'll finish saving to your account automatically as soon as the connection comes back — you don't need to add them again."}
      </p>
      <div style={CC({ gap: 5, marginBottom: 10 })}>
        {entries.slice(0, 6).map(e => (
          <div key={e.id} style={{ fontSize: 11.5, color: C.t2 }}>· {e.label || e.row?.name || e.row?.position || 'Tracked item'}</div>
        ))}
        {entries.length > 6 && <div style={{ fontSize: 11, color: C.t3 }}>…and {entries.length - 6} more</div>}
      </div>
      <button onClick={retry} disabled={retrying} style={btnSm(tint(color, 0.16), { color: '#fff', cursor: retrying ? 'wait' : 'pointer' })}>
        {retrying ? <><Loader2 size={12} className="spin" />Retrying…</> : <><RefreshCw size={12} />Try saving now</>}
      </button>
      {status.lastError && !blocked.length && (
        <div style={{ fontSize: 10.5, color: C.t3, marginTop: 6 }}>Last attempt: {status.lastError}</div>
      )}
    </div>
  );
}
