// Generic type-ahead text input: a normal text field that drops a filtered, keyboard-navigable
// list under itself. Freeform text is always allowed — the list is a shortcut, never a gate.
//
// The caller owns the data: `getOptions(query)` returns the rows to show for what has been typed
// (return rows for an empty query to make the list open on focus). Each row is
// { key, label, sub, meta, group } — `group` renders a sticky-ish section header, `sub` a second
// line, `meta` right-aligned detail.
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { C, inp } from '../../lib/theme';

export default function SuggestInput({
  value = '',
  onChange,
  onPick,
  getOptions,
  placeholder = '',
  inputStyle = {},
  wrapperStyle = {},
  maxHeight = 320,
  emptyHint = null,
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const listRef = useRef(null);

  const options = useMemo(() => (open ? getOptions(value) || [] : []), [open, value, getOptions]);

  useEffect(() => { setActive(0); }, [value]);

  useEffect(() => {
    function onDocClick(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Keep the highlighted row in view when arrowing past the edge of the scroll box.
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="1"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const pick = useCallback((opt) => {
    onChange?.(opt.label);
    onPick?.(opt);
    setOpen(false);
  }, [onChange, onPick]);

  function onKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open || options.length === 0) {
      if (e.key === 'ArrowDown') { setOpen(true); e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % options.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i - 1 + options.length) % options.length); }
    else if (e.key === 'Enter') {
      // Only swallow Enter when a row is highlighted — otherwise the parent form should still submit.
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === 'Tab') setOpen(false);
  }

  let lastGroup = null;

  return (
    <div ref={boxRef} style={{ position: 'relative', flex: 1, minWidth: 180, ...wrapperStyle }}>
      <input
        style={inp(inputStyle)}
        placeholder={placeholder}
        value={value}
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-autocomplete="list"
        onChange={e => { onChange?.(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && options.length > 0 && (
        // Solid fill + high z-index: the glass surfaces used elsewhere let the cards underneath
        // bleed through and made the list unreadable where it overlaps the form.
        <div ref={listRef} role="listbox" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200, background: C.s2, border: `1px solid ${C.b2 || C.b1}`, borderRadius: 12, padding: 4, maxHeight, overflowY: 'auto', boxShadow: '0 18px 44px rgba(0,0,0,0.45)' }}>
          {emptyHint && !value.trim() && (
            <div style={{ fontSize: 10.5, color: C.t3, padding: '4px 8px 4px' }}>{emptyHint}</div>
          )}
          {options.map((o, i) => {
            const header = o.group && o.group !== lastGroup ? o.group : null;
            lastGroup = o.group;
            const isActive = i === active;
            return (
              <React.Fragment key={o.key ?? o.label}>
                {header && (
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', padding: '8px 8px 4px' }}>{header}</div>
                )}
                <div
                  role="option"
                  aria-selected={isActive}
                  data-active={isActive ? '1' : '0'}
                  onMouseDown={e => { e.preventDefault(); pick(o); }}
                  onMouseEnter={() => setActive(i)}
                  style={{ padding: '8px 8px', borderRadius: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</div>
                    {o.sub && <div style={{ fontSize: 10.5, color: C.t3, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.sub}</div>}
                  </div>
                  {o.meta && <div style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM, textAlign: 'right', flexShrink: 0 }}>{o.meta}</div>}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
