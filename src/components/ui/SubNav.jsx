import React from 'react';
import { motion } from 'framer-motion';
import { C } from '../../lib/theme';

// Pill/segmented sub-navigation bar used inside the Prep and Portfolio shells
// so several absorbed features can live under one top-level tab and switch
// between each other without leaving the page.
export default function SubNav({ items, active, onChange, accent = C.blue, m = false, tourPrefix }) {
  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, marginBottom: 18, WebkitOverflowScrolling: 'touch' }}>
      {items.map(it => {
        const isActive = active === it.id;
        return (
          <motion.button
            key={it.id}
            data-tour={tourPrefix ? `${tourPrefix}-${it.id}` : undefined}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange(it.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
              padding: m ? '8px 12px' : '8px 14px', borderRadius: 999,
              border: isActive ? `1px solid ${accent}55` : `1px solid ${C.b1}`,
              background: isActive ? `${accent}1c` : 'rgba(255,255,255,0.02)',
              color: isActive ? '#fff' : C.t2, fontWeight: isActive ? 700 : 500,
              fontSize: 12.5, fontFamily: C.FB, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all .15s',
            }}
          >
            {it.ic && <it.ic size={13} color={isActive ? accent : C.t3} />}
            {it.label}
            {!!it.badge && (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 16, height: 16, borderRadius: 8, background: isActive ? accent : C.s4, color: '#fff', fontSize: 9.5, fontWeight: 700, padding: '0 4px' }}>{it.badge}</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
