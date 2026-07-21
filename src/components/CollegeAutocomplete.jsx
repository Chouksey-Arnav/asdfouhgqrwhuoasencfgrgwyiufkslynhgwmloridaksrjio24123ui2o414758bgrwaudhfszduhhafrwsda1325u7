// Searchable college picker backed by SCHOOL_DATA (constants.js) — typing a few letters shows a
// dropdown of matching schools with their stats (state, type, average SAT/GPA, acceptance rate)
// instead of requiring the student to type the full name from memory. Still accepts any
// freeform name (SCHOOL_DATA covers ~150 well-known institutions, not every accredited US
// college), so nothing is blocked if a school isn't in the list — it just won't show stats.
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { C, glass2, inp } from '../lib/theme';
import { SCHOOL_DATA } from '../data/constants';

export default function CollegeAutocomplete({ value = '', onChange, onSelectSchool, onKeyDown, placeholder = 'School name', inputStyle = {} }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => { setQuery(value); }, [value]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return SCHOOL_DATA.filter(s => s.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  useEffect(() => {
    function onDocClick(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(school) {
    setQuery(school.name);
    onChange?.(school.name);
    onSelectSchool?.(school);
    setOpen(false);
  }

  return (
    <div ref={boxRef} style={{ position: 'relative', flex: 1, minWidth: 180 }}>
      <input
        style={inp(inputStyle)}
        placeholder={placeholder}
        value={query}
        onChange={e => { setQuery(e.target.value); onChange?.(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false); onKeyDown?.(e); }}
      />
      {open && matches.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, ...glass2({ padding: 6 }), maxHeight: 280, overflowY: 'auto', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
          {matches.map(s => (
            <div
              key={s.name}
              onMouseDown={() => pick(s)}
              style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                <div style={{ fontSize: 10.5, color: C.t3, marginTop: 1 }}>{s.state} · {s.type}</div>
              </div>
              <div style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM, textAlign: 'right', flexShrink: 0 }}>
                SAT ~{s.sat} · GPA {s.gpa} · {s.accept}% admit
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
