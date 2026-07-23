// Searchable college picker backed by SCHOOL_DATA (constants.js) — typing a few letters shows a
// dropdown of matching schools with their stats (state, type, average SAT/GPA, acceptance rate)
// instead of requiring the student to type the full name from memory. Beyond that curated ~150,
// it also searches WORLD_COLLEGES — a real, ~10,000-institution global dataset (src/data/worldColleges.js,
// sourced from the Hipolabs University Domains List) lazy-loaded on first use so it never bloats the
// main bundle — so virtually any real accredited college/university on Earth can be found, just
// without the detailed fit-scoring stats reserved for the curated set. Freeform names are still
// always accepted; nothing is blocked if a school isn't in either list.
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { C, inp } from '../lib/theme';
import { SCHOOL_DATA } from '../data/constants';

let worldCollegesPromise = null;
function loadWorldColleges() {
  if (!worldCollegesPromise) {
    worldCollegesPromise = import('../data/worldColleges').then(m => m.WORLD_COLLEGES).catch(() => []);
  }
  return worldCollegesPromise;
}

export default function CollegeAutocomplete({ value = '', onChange, onSelectSchool, onKeyDown, placeholder = 'School name', inputStyle = {} }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [world, setWorld] = useState(null);
  const boxRef = useRef(null);

  useEffect(() => { setQuery(value); }, [value]);
  useEffect(() => { loadWorldColleges().then(setWorld); }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const curated = SCHOOL_DATA.filter(s => s.name.toLowerCase().includes(q));
    const curatedNames = new Set(curated.map(s => s.name.toLowerCase()));
    const globalHits = (world || [])
      .filter(row => row[0].toLowerCase().includes(q) && !curatedNames.has(row[0].toLowerCase()))
      .slice(0, 10)
      .map(row => ({ name: row[0], country: row[1], state: row[2] || null, global: true }));
    return [...curated, ...globalHits].slice(0, 10);
  }, [query, world]);

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
                <div style={{ fontSize: 10.5, color: C.t3, marginTop: 1 }}>{s.global ? [s.state, s.country].filter(Boolean).join(' · ') : `${s.state} · ${s.type}`}</div>
              </div>
              <div style={{ fontSize: 10.5, color: s.global ? C.t4 : C.t3, fontFamily: C.FM, textAlign: 'right', flexShrink: 0 }}>
                {s.global ? 'No fit stats yet' : `SAT ~${s.sat} · GPA ${s.gpa} · ${s.accept}% admit`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
