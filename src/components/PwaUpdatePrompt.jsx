import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// ── The one place the app is allowed to reload itself out from under a student ──
//
// See vite.config.js's comment on registerType:'prompt' for the bug this replaces: the old
// 'autoUpdate' setting force-reloaded every open tab the instant a new deploy's service worker
// activated, with no regard for what the student was doing — the "screen goes blank, only a
// reload fixes it" report. This component is the entire fix's other half: it still lets a new
// version install in the background (so the update is ready immediately), but the reload that
// actually swaps it in only happens when the student presses the button below.
//
// Deliberately plain inline styles, like RootErrorBoundary — this can render before (or during
// a crash of) the rest of the app's styling system, so it must not depend on any of it.
export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) { console.error('MSP service worker registration failed:', error); },
  });

  if (!needRefresh) return null;

  return (
    <div style={{
      position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 100000,
      maxWidth: 420, margin: '0 auto',
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      padding: '14px 16px', borderRadius: 12,
      background: '#12172a', border: '1px solid #2a3352', color: '#e6e9f0',
      boxShadow: '0 12px 40px rgba(0,0,0,0.5)', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ flex: 1, minWidth: 180, fontSize: 13.5, lineHeight: 1.5 }}>
        A new version of MedSchoolPrep is ready.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          style={{
            padding: '8px 12px', borderRadius: 8, border: '1px solid #2a3352', cursor: 'pointer',
            background: 'transparent', color: '#a3acc2', fontWeight: 600, fontSize: 12.5,
          }}
        >
          Later
        </button>
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          style={{
            padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: 12.5,
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
