// Searchable college picker backed by SCHOOL_DATA (constants.js) — typing a few letters shows a
// dropdown of matching schools with their stats (state, type, SAT and ACT midpoints, acceptance
// rate) instead of requiring the student to type the full name from memory.
//
// U.S. SCHOOLS ONLY. This used to also search WORLD_COLLEGES, a ~10,000-row global dataset that
// carried no admissions stats at all — so the dropdown filled up with unrecognizable institutions
// worldwide that showed "No fit stats yet" and could never be categorized, recommended, or scored
// against the student's SAT/ACT. That search is gone: matches now come exclusively from the curated
// U.S. set, every one of which has real SAT/ACT/GPA/acceptance data behind it. Freeform names are
// still always accepted, so a student can type any school in by hand and nothing is blocked.
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { C, inp } from '../lib/theme';
import { SCHOOL_DATA } from '../data/constants';

export default function CollegeAutocomplete({ value = '', onChange, onSelectSchool, onKeyDown, placeholder = 'School name (U.S.)', inputStyle = {} }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => { setQuery(value); }, [value]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    // Name-start matches first, so typing "mich" surfaces Michigan before Central Michigan.
    return SCHOOL_DATA
      .filter(s => s.name.toLowerCase().includes(q))
      .sort((a, b) => (b.name.toLowerCase().startsWith(q) ? 1 : 0) - (a.name.toLowerCase().startsWith(q) ? 1 : 0))
      .slice(0, 10);
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
        // Opaque, high-z-index surface: `glass2`'s near-transparent fill let already-added school
        // cards below bleed through and made the list unusable ("some colleges are getting blocked").
        // A solid background + z-index above sibling panels + a hairline border keeps it readable and
        // always on top of the form fields it overlaps.
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200, background: C.s2, border: `1px solid ${C.b2 || C.b1}`, borderRadius: 12, padding: 6, maxHeight: 300, overflowY: 'auto', boxShadow: '0 18px 44px rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)' }}>
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
                SAT ~{s.sat} · ACT ~{s.act} · {s.accept}% admit
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
