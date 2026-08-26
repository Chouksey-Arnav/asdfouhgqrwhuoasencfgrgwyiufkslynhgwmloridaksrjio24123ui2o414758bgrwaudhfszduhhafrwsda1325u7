import React, { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import {
  Search, X, CalendarRange, MapPin, Trophy, SlidersHorizontal, ArrowDownWideNarrow, Layers, ListChecks,
} from 'lucide-react';
import { C, glass2, btnSm, inp, R, CC, pill, tint, onTint } from '../../lib/theme';
import {
  PROGRAMS, PROGRAM_TIERS, PROGRAM_CATEGORIES, TIER_BY_ID, CATEGORY_BY_ID,
} from '../../data/opportunityPrograms';
import { nextDeadline, isFreeOrFunded, deadlineCalendar, MONTH_LONG } from '../../lib/opportunityEligibility';
import { PIPELINE_STAGES, STAGE_BY_ID, stageCounts } from '../../lib/opportunityMatch';
import { US_STATES } from '../../data/constants';
import { ProgramCard } from './ProgramTiers';

// ─────────────────────────────────────────────────────────────────────────────
// The program explorer.
//
// The tier board worked at twenty-one programs: three accordions, open one,
// read nine cards. At a hundred and four it stops being a board and becomes a
// wall, and a wall is functionally the same as an empty page — the student
// scrolls twice, decides it is "a list of stuff", and leaves.
//
// So this is the layer that turns the database into something you can ask
// questions of. Four of them, specifically, and each one is a control:
//
//   WHEN?    The twelve-month strip. This is the most important thing on the
//            page and it is deliberately first, because the single fact that
//            reorganizes a pre-health student's year is that the good summer
//            programs close in December, January and February. You cannot see
//            that in a list sorted by date. You can see it instantly in twelve
//            bars, and once you have seen it you never plan a summer in April
//            again.
//
//   WHERE?   Half the best research programs are open to one state or one
//            metro area. Showing a Nebraskan student a Baltimore-only
//            internship wastes their attention; hiding every regional program
//            from them wastes the ones near home. So the state filter is
//            explicit, opt-in, and never guessed — a wrong guess would silently
//            hide real opportunities, which is the worst failure available.
//
//   WHAT KIND?  Nine categories, so "show me things I could do from my bedroom"
//            and "show me things where I'd be in a lab" are one tap apart.
//
//   HOW FAR HAVE I GOT?  The pipeline. A tracked program used to have two
//            states — saved or not — which is a bookmark. Interested →
//            preparing → applying → submitted → accepted is the difference
//            between a list a student looks at and a list a student works.
//
// Everything here is client-side and synchronous over an array of 104 objects,
// so every control is instant and the page never waits on anything.
// ─────────────────────────────────────────────────────────────────────────────

const PAGE = 18;

const fuse = new Fuse(PROGRAMS, {
  keys: [
    { name: 'name', weight: 0.4 },
    { name: 'org', weight: 0.2 },
    { name: 'why', weight: 0.15 },
    { name: 'eligibility', weight: 0.15 },
    { name: 'location', weight: 0.1 },
  ],
  threshold: 0.36,
  ignoreLocation: true,
});

/** Per call, not a frozen literal — see the note in theme.js's header. */
const tierColor = (id) => C[TIER_BY_ID[id]?.colorKey] || C.t3;
const catColor = (id) => C[CATEGORY_BY_ID[id]?.colorKey] || C.t3;
const stageColor = (id) => C[STAGE_BY_ID[id]?.colorKey] || C.t3;

export default function ProgramExplorer({
  facts = {}, freeOnly = false, isMobile = false,
  savedIds = new Set(), savingId = null, onSaveDeadline,
  stages = {}, onStage, homeState = null, onHomeState,
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(null);
  const [tier, setTier] = useState(null);
  const [month, setMonth] = useState(null);
  const [stageFilter, setStageFilter] = useState(null);
  const [sort, setSort] = useState('deadline');
  const [shown, setShown] = useState(PAGE);

  // The calendar is computed over everything a student could act on, not over
  // the filtered set — the whole point of the strip is to show the shape of the
  // year, and a shape that changes every time you tap a category chip is not a
  // shape, it is noise.
  const calendarSource = useMemo(() => PROGRAMS.filter(p => (
    p.tier !== 'pay_to_play'
    && (!freeOnly || isFreeOrFunded(p))
    && (!homeState || !p.states || p.states.includes(homeState))
  )), [freeOnly, homeState]);
  const { months, undated } = useMemo(() => deadlineCalendar(calendarSource), [calendarSource]);
  const busiest = useMemo(() => Math.max(1, ...months.map(m => m.count)), [months]);

  const counts = useMemo(() => stageCounts(stages), [stages]);
  const inPipeline = useMemo(() => Object.keys(stages).length, [stages]);

  const results = useMemo(() => {
    const base = query.trim().length >= 2 ? fuse.search(query.trim()).map(r => r.item) : PROGRAMS;
    const filtered = base.filter(p => (
      (!category || p.category === category)
      && (!tier || p.tier === tier)
      && (!month || p.deadline?.month === month)
      && (!stageFilter || stages[p.id] === stageFilter)
      && (!freeOnly || isFreeOrFunded(p))
      && (!homeState || !p.states || p.states.includes(homeState))
    ));
    if (sort === 'name') return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'winnable') {
      // Least selective first, and inside that the free ones — the order a
      // student with nothing on their resume yet actually needs, and the
      // opposite of the order every other list on the internet uses.
      const rank = { open: 0, competitive: 1, elite: 2 };
      return [...filtered].sort((a, b) => (
        (rank[a.selectivity] - rank[b.selectivity])
        || (Number(isFreeOrFunded(b)) - Number(isFreeOrFunded(a)))
        || a.name.localeCompare(b.name)
      ));
    }
    if (sort === 'deadline') {
      // Dated programs first, soonest first; rolling and locally-set ones after,
      // because "no deadline" is never the urgent answer.
      return [...filtered].sort((a, b) => {
        const da = nextDeadline(a)?.daysOut;
        const db = nextDeadline(b)?.daysOut;
        if (da == null && db == null) return a.name.localeCompare(b.name);
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      });
    }
    return filtered;
  }, [query, category, tier, month, stageFilter, sort, freeOnly, homeState, stages]);

  const activeFilters = [category, tier, month, stageFilter].filter(v => v != null).length + (homeState ? 1 : 0);
  function clearAll() {
    setCategory(null); setTier(null); setMonth(null); setStageFilter(null); setQuery('');
  }

  const visible = results.slice(0, shown);

  return (
    <div style={CC({ gap: 16 })}>
      {/* ── Your pipeline ───────────────────────────────────────────────────
          Above the search box on purpose: what you have already started
          outranks what you might start. When nothing is in it, this row
          explains what it is for instead of rendering five zeroes. */}
      <div style={{
        ...glass2({ padding: isMobile ? 12 : 16 }),
        border: `1px solid ${tint(inPipeline ? C.violet : C.t3, inPipeline ? 0.24 : 0.12)}`,
      }}>
        <div style={R({ gap: 8, flexWrap: 'wrap', marginBottom: 8 })}>
          <ListChecks size={13} color={inPipeline ? C.violetL : C.t3} />
          <span style={{ fontSize: 12, fontWeight: 800, color: C.t1 }}>Your pipeline</span>
          {inPipeline > 0 && (
            <span style={pill(tint(C.violet, 0.14), onTint(C.violet), { fontSize: 10 })}>
              {inPipeline} program{inPipeline === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {inPipeline === 0 ? (
          <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.6 }}>
            Mark a program below as interested, preparing, applying or submitted and it shows up here.
            Saving something is a bookmark; moving it through these stages is what gets it applied to.
          </div>
        ) : (
          <div style={R({ gap: 8, flexWrap: 'wrap' })}>
            {PIPELINE_STAGES.map(s => {
              const col = stageColor(s.id);
              const n = counts[s.id] || 0;
              const on = stageFilter === s.id;
              return (
                <button key={s.id} type="button" disabled={!n}
                  onClick={() => { setStageFilter(on ? null : s.id); setShown(PAGE); }}
                  aria-pressed={on}
                  style={{
                    font: 'inherit', cursor: n ? 'pointer' : 'default', textAlign: 'left',
                    padding: '8px 12px', borderRadius: 8,
                    background: on ? tint(col, 0.2) : C.surf2,
                    border: `1px solid ${on ? tint(col, 0.42) : C.b1}`,
                    opacity: n ? 1 : 0.45,
                  }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 800, fontFamily: C.FM, color: n ? col : C.t4 }}>{n}</span>
                  <span style={{ display: 'block', fontSize: 10, color: C.t3, marginTop: 4 }}>{s.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── The year ────────────────────────────────────────────────────────
          Twelve bars, starting from this month. The single most useful object
          on this page: it makes the winter cluster visible without anybody
          having to write the sentence "apply in December". */}
      <div style={{ ...glass2({ padding: isMobile ? 12 : 16 }) }}>
        <div style={R({ gap: 8, flexWrap: 'wrap', marginBottom: 8 })}>
          <CalendarRange size={13} color={C.roseL} />
          <span style={{ fontSize: 12, fontWeight: 800, color: C.t1 }}>The next twelve months</span>
          {month && (
            <button type="button" onClick={() => { setMonth(null); setShown(PAGE); }}
              style={btnSm('transparent', { fontSize: 10.5, color: C.t3, marginLeft: 'auto' })}>
              <X size={10} />Show every month
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {months.map(m => {
            const on = month === m.month;
            const col = on ? C.rose : m.count ? C.blue : C.t4;
            // 8px floor so an empty month is still a target you can hit, and
            // still reads as "nothing here" rather than as a rendering bug.
            const h = 8 + Math.round((m.count / busiest) * 40);
            return (
              <button key={m.month} type="button" disabled={!m.count}
                onClick={() => { setMonth(on ? null : m.month); setShown(PAGE); }}
                aria-pressed={on}
                aria-label={`${MONTH_LONG[m.month - 1]}: ${m.count} deadline${m.count === 1 ? '' : 's'}`}
                style={{
                  flex: 1, minWidth: 0, font: 'inherit', border: 'none', background: 'transparent',
                  padding: 0, cursor: m.count ? 'pointer' : 'default',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}>
                <span style={{ fontSize: 10, fontFamily: C.FM, color: m.count ? C.t2 : C.t4 }}>{m.count || ''}</span>
                <span style={{
                  width: '100%', height: h, borderRadius: 4,
                  background: m.count ? tint(col, on ? 0.72 : 0.4) : C.surf2,
                  border: `1px solid ${tint(col, on ? 0.9 : 0.24)}`,
                }} />
                <span style={{
                  fontSize: 9.5, color: on ? onTint(C.rose) : m.isNow ? C.t2 : C.t4,
                  fontWeight: on || m.isNow ? 800 : 500,
                }}>{m.label}</span>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 10.5, color: C.t4, lineHeight: 1.6, marginTop: 8 }}>
          Deadlines for the {calendarSource.length} programs you are eligible to see, by the month they fall in.
          {undated.length > 0 && ` ${undated.length} more have no fixed date — rolling, or set by your own school, chapter or hospital.`}
        </div>
      </div>

      {/* ── Search and filters ───────────────────────────────────────────── */}
      <div style={CC({ gap: 8 })}>
        <div style={R({ gap: 8 })}>
          <Search size={14} color={C.t3} />
          <input
            style={inp({ flex: 1, fontSize: 13 })}
            placeholder="Search the database by name, organization, or who it's for…"
            value={query}
            onChange={e => { setQuery(e.target.value); setShown(PAGE); }}
          />
        </div>

        {/* Where you live. Never inferred: hiding a real program because we
            guessed a state wrong is silent and unrecoverable, so it stays off
            until the student chooses. */}
        <div style={R({ gap: 8, flexWrap: 'wrap' })}>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: C.t3, display: 'inline-flex', alignItems: 'center', gap: 8, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>
            <MapPin size={11} />Where you live
          </span>
          <select
            value={homeState || ''}
            onChange={e => { onHomeState?.(e.target.value || null); setShown(PAGE); }}
            aria-label="Filter to programs open where you live"
            style={inp({ width: 'auto', fontSize: 11.5, padding: '8px 12px' })}>
            <option value="">Every state — show me everything</option>
            {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
          {homeState && (
            <span style={{ fontSize: 10.5, color: C.t3 }}>
              Showing national programs plus the ones open to {US_STATES.find(s => s.code === homeState)?.name}.
            </span>
          )}
        </div>

        <ChipRow icon={Layers} label="Kind" value={category} onChange={v => { setCategory(v); setShown(PAGE); }}
          options={PROGRAM_CATEGORIES.map(c => ({ id: c.id, label: c.label, color: catColor(c.id), title: c.blurb }))} />

        <ChipRow icon={Trophy} label="Tier" value={tier} onChange={v => { setTier(v); setShown(PAGE); }}
          options={PROGRAM_TIERS.map(t => ({ id: t.id, label: t.label, color: tierColor(t.id), title: t.blurb }))} />

        <ChipRow icon={ArrowDownWideNarrow} label="Sort" value={sort} onChange={v => setSort(v || 'deadline')} required
          options={[
            { id: 'deadline', label: 'Closing soonest', color: C.rose, title: 'Dated programs first, in the order they close.' },
            { id: 'winnable', label: 'Easiest to win', color: C.green, title: 'Least selective first — the order to read this in if you are starting from nothing.' },
            { id: 'name', label: 'A–Z', color: C.blue, title: 'Alphabetical.' },
          ]} />
      </div>

      <div style={R({ gap: 8, flexWrap: 'wrap' })}>
        <span style={{ fontSize: 11, color: C.t3 }}>
          {results.length} of {PROGRAMS.length} programs
          {month ? ` closing in ${MONTH_LONG[month - 1]}` : ''}
          {freeOnly ? ' · free and funded only' : ''}
        </span>
        {(activeFilters > 0 || query) && (
          <button type="button" onClick={clearAll}
            style={btnSm('transparent', { fontSize: 10.5, color: C.t3, marginLeft: 'auto' })}>
            <X size={10} />Clear filters
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div style={{ ...glass2({ padding: 20, textAlign: 'center' }) }}>
          <SlidersHorizontal size={18} color={C.t3} />
          <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6, marginTop: 8 }}>
            Nothing matches all of those at once. Clearing the state filter usually opens it back up —
            most of the database is national.
          </div>
          <button type="button" onClick={clearAll} style={{ ...btnSm(tint(C.violet, 0.16), { color: onTint(C.violet), fontSize: 11.5, marginTop: 8 }) }}>
            <X size={11} />Clear filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(330px,1fr))', gap: 12 }}>
          {visible.map(p => (
            <ProgramCard key={p.id} program={p} facts={facts} isMobile={isMobile}
              saved={savedIds.has(p.id)} saving={savingId === p.id} onSaveDeadline={onSaveDeadline}
              stage={stages[p.id] || null} onStage={onStage} showMeta />
          ))}
        </div>
      )}

      {results.length > visible.length && (
        <button type="button" onClick={() => setShown(n => n + PAGE)}
          style={btnSm(C.surfHi, { fontSize: 12, color: C.t2, alignSelf: 'center' })}>
          Show {Math.min(PAGE, results.length - visible.length)} more
        </button>
      )}
    </div>
  );
}

/**
 * One row of filter chips. Tapping the active chip clears that filter, so every
 * control is its own undo — except where `required` is set, because sort has to
 * hold some value for the list to have an order at all.
 */
function ChipRow({ icon: Icon, label, options, value, onChange, required = false }) {
  return (
    <div style={R({ gap: 8, flexWrap: 'wrap' })}>
      <span style={{
        fontSize: 10.5, fontWeight: 800, color: C.t3, minWidth: 80,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))',
      }}>
        <Icon size={11} />{label}
      </span>
      {options.map(o => {
        const on = value === o.id;
        return (
          <button key={o.id} type="button" title={o.title} aria-pressed={on}
            onClick={() => onChange(on && !required ? null : o.id)}
            style={pill(on ? tint(o.color, 0.2) : C.surf2, on ? onTint(o.color) : C.t3, {
              cursor: 'pointer', fontSize: 10.5,
              border: `1px solid ${on ? tint(o.color, 0.4) : C.b1}`,
              fontWeight: on ? 800 : 500,
            })}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

