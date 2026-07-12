import React from 'react';
import { C, glass, btn } from '../../lib/theme';

// Consistent empty-state treatment, used across Prep/Portfolio sub-views
// instead of ad hoc one-line text per panel.
export default function EmptyState({ icon: Icon, title, body, actionLabel, onAction, accent = C.blue }) {
  return (
    <div style={{ ...glass({ padding: 36, textAlign: 'center' }) }}>
      {Icon && (
        <div style={{ width: 48, height: 48, borderRadius: 14, background: `${accent}15`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Icon size={22} color={accent} />
        </div>
      )}
      {title && <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, fontFamily: C.FD, marginBottom: 6 }}>{title}</div>}
      {body && <div style={{ fontSize: 13, color: C.t3, lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>{body}</div>}
      {actionLabel && onAction && (
        <button style={{ ...btn(accent !== C.blue ? accent : C.blueGrad), marginTop: 18 }} onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
