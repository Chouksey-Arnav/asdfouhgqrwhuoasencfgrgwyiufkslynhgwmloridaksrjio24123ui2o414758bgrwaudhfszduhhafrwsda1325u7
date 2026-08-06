import React from 'react';
import { Plus, Check, CloudOff, Loader2 } from 'lucide-react';
import { C, btnSm, tint, onTint } from '../../lib/theme';

// The Track button, shared by the scholarship and opportunity databases.
//
// It has four states because tracking has four real outcomes, and collapsing them (as a plain
// "Track" button does) is what made tracking feel unreliable: a student had no way to distinguish
// "saved", "already saved", "saving", and "your connection dropped so this is sitting in the
// outbox". `pending` is not an error — the item IS saved on this device and will reach the
// account on its own; the label says so rather than implying something went wrong.
export default function TrackButton({ state = 'idle', busy = false, accent = C.blue, onClick, label = 'Track', trackedLabel = 'Tracked' }) {
  if (busy) {
    return (
      <button disabled style={btnSm('rgba(255,255,255,0.06)', { color: C.t3, cursor: 'wait' })}>
        <Loader2 size={12} className="spin" />Saving…
      </button>
    );
  }
  if (state === 'tracked') {
    return (
      <button disabled title="Already in your tracker"
        style={btnSm(tint(C.green, 0.15), { color: C.greenL, cursor: 'default', border: `1px solid ${tint(C.green, 0.3)}` })}>
        <Check size={12} />{trackedLabel}
      </button>
    );
  }
  if (state === 'pending') {
    return (
      <button disabled title="Saved on this device — finishing the save to your account"
        style={btnSm(tint(C.amber, 0.13), { color: C.amberL, cursor: 'default', border: `1px solid ${tint(C.amber, 0.28)}` })}>
        <CloudOff size={12} />Queued
      </button>
    );
  }
  return (
    <button onClick={onClick} style={btnSm(tint(accent, 0.18), { color: onTint(accent) })}>
      <Plus size={12} />{label}
    </button>
  );
}
