import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';
import {
  Stethoscope, Compass, FlaskConical, Ticket, Building2, GraduationCap,
  ExternalLink, ChevronDown, ChevronUp, Search, AlertTriangle, Clock3, Sparkles,
} from 'lucide-react';
import { C, glass2, btnSm, inp, R, CC, pill, tint } from '../../lib/theme';
// SP.nudge rather than a literal 4: these are chip rows, where 4px is an optical
// gap inside one control group rather than space between components. Stated as
// the token so scripts/verifySpacing.mjs can tell the two apart — a bare 4 reads
// to it as a layout gap under the 8px floor.
import { SP } from '../../lib/tokens/space';
import {
  MED_SCHOLARSHIPS, MED_STAGES, MED_TRACKS, MED_ENTRY_KINDS,
  MED_SCHOLARSHIP_READ_ON, medScholarshipCounts,
} from '../../data/medicalScholarships';
import { PATHWAY_FINANCE } from '../../data/pathwayFinance';
import TrackButton from '../ui/TrackButton';
import { scholarshipRowFromCatalog, normalizeKey } from '../../lib/trackingCatalog';

// ─────────────────────────────────────────────────────────────────────────────
// The medicine-specific scholarship pipeline (src/data/medicalScholarships.js).
//
// ── Why this is organized by STAGE rather than by amount or deadline ────────
// Every other scholarship surface in this app answers "what can I win now?",
// and for the general and health-career databases that is the right question.
// It is the wrong question here, because the honest answer for a fifteen-
// year-old is "almost none of this, yet" — and a list sorted by what they can
// win today would be four entries long and would teach them that medicine has
// no money in it. The opposite is true: medicine has more money in it than any
// other path in this app, awarded later.
//
// So the organizing axis is the road, not the calendar. A student sees the
// whole pipeline — high school, pre-med, medical school, residency — and every
// entry they cannot apply for yet carries the thing they CAN do about it now
// (`hsAction`). That is the entire point of showing them an award they are
// eight years away from: the MD-PhD entry is not there to be applied to, it is
// there so a ninth-grader knows that research started now is what makes it
// reachable.
//
// ── Why "not yet" entries are not hidden or grayed into illegibility ────────
// Same argument the health-career panel makes, one stage further along. The
// failure mode is a student spending an evening on an application they were
// never eligible for, and the fix for that is to SAY SO on the card — which is
// why several entries here lead their eligibility line with the disqualifier.
// Hiding them instead just means they find the same award on Google, without
// the sentence that would have saved them the evening.
// ─────────────────────────────────────────────────────────────────────────────

const KIND_ICON = {
  named: Stethoscope,
  fellowship: FlaskConical,
  program: GraduationCap,
  'fee-assistance': Ticket,
  institutional: Building2,
  discovery: Compass,
};

const KIND_COLOR = (kind) => ({
  named: C.greenL,
  fellowship: C.blueL,
  program: C.tealL,
  'fee-assistance': C.amberL,
  institutional: C.fuchsia || C.violetL,
  discovery: C.violetL,
}[kind] || C.greenL);

const STAGE_ORDER = Object.entries(MED_STAGES)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([id, meta]) => ({ id, ...meta }));

const fuse = new Fuse(MED_SCHOLARSHIPS, {
  keys: [
    { name: 'name', weight: 0.35 },
    { name: 'org', weight: 0.15 },
    { name: 'tags', weight: 0.25 },
    { name: 'eligibility', weight: 0.15 },
    { name: 'why', weight: 0.1 },
  ],
  threshold: 0.36,
  ignoreLocation: true,
});

export default function MedicalScholarshipPipeline({
  accent = C.violet, pathwayFinanceId = null, onTrack, trackedKeys, pendingKeys,
}) {
  const [stage, setStage] = useState('all');
  const [track, setTrack] = useState('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const counts = medScholarshipCounts();

  const entries = useMemo(() => {
    const base = query.trim().length >= 2
      ? fuse.search(query.trim()).map(r => r.item)
      : MED_SCHOLARSHIPS;
    const byStage = stage === 'all' ? base : base.filter(s => (s.stage || []).includes(stage));
    const byTrack = track === 'all' ? byStage : byStage.filter(s => (s.tracks || []).includes(track));
    if (!pathwayFinanceId) return byTrack;
    // The student's own pathway floats to the top rather than filtering the rest
    // away: a pre-med who is also considering PA should still see the PA entries.
    return byTrack.slice().sort((a, b) => {
      const aMine = (a.pathways || []).includes(pathwayFinanceId) ? 0 : 1;
      const bMine = (b.pathways || []).includes(pathwayFinanceId) ? 0 : 1;
      return aMine - bMine;
    });
  }, [stage, track, query, pathwayFinanceId]);

  const stateOf = (name) => {
    const key = normalizeKey(name);
    if (trackedKeys?.has(key)) return 'tracked';
    if (pendingKeys?.has(key)) return 'pending';
    return 'idle';
  };

  async function handleTrack(s) {
    if (!onTrack) return;
    setBusyId(s.id);
    try {
      // `why` carries what `description` carries everywhere else in the catalog,
      // so it is mapped rather than the row builder being taught a second field.
      const row = scholarshipRowFromCatalog({ ...s, description: s.why });
      const res = await onTrack(row, { dedupeKey: normalizeKey(s.name), label: s.name });
      if (res?.status === 'duplicate') toast(`${s.name} is already in your tracker`, { icon: '✓' });
      else if (res?.status === 'queued') {
        toast(`${s.name} is saved on this device and will finish saving shortly.`, { icon: '📥', duration: 6000 });
      } else toast.success(`${s.name} added to your tracker`);
    } catch (err) { toast.error(err.message); }
    finally { setBusyId(null); }
  }

  const activeStage = stage === 'all' ? null : MED_STAGES[stage];

  return (
    <div style={CC({ gap: 12 })}>
      <p style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55, margin: 0 }}>
        The money that pays for medicine is mostly awarded after high school — during your pre-med
        years, at medical school, and in residency. That is not a reason to look away from it now.
        It is the reason to look at it now: several of these are won by the person who started
        building the record at fifteen, and at least one of them should change which colleges you
        apply to. {counts.total} entries across four stages, each saying plainly whether you can
        apply yet and what to do about it if you cannot.
      </p>

      {/* Stage — the primary axis */}
      <div style={R({ gap: SP.nudge, flexWrap: 'wrap' })}>
        <button type="button" onClick={() => setStage('all')}
          style={pill(stage === 'all' ? tint(accent, 0.18) : C.b0, stage === 'all' ? accent : C.t3, {
            cursor: 'pointer', border: `1px solid ${stage === 'all' ? tint(accent, 0.32) : C.b1}`,
            fontSize: 10.5, fontWeight: stage === 'all' ? 700 : 500,
          })}>
          The whole road ({counts.total})
        </button>
        {STAGE_ORDER.map(s => {
          const on = stage === s.id;
          const color = C[`${s.color}L`] || C[s.color] || accent;
          return (
            <button key={s.id} type="button" onClick={() => setStage(s.id)}
              style={pill(on ? tint(color, 0.18) : C.b0, on ? color : C.t3, {
                cursor: 'pointer', border: `1px solid ${on ? tint(color, 0.32) : C.b1}`,
                fontSize: 10.5, fontWeight: on ? 700 : 500,
              })}>
              {s.short} ({counts.byStage[s.id] || 0})
            </button>
          );
        })}
      </div>

      {/* What the selected stage means. Shown only when one is selected — on
          "the whole road" it would be four paragraphs of preamble. */}
      {activeStage && (
        <div style={{
          ...glass2({ padding: 12 }),
          border: `1px solid ${tint(C[`${activeStage.color}L`] || accent, 0.24)}`,
          background: tint(C[`${activeStage.color}L`] || accent, 0.05),
          fontSize: 12, color: C.t2, lineHeight: 1.55,
        }}>
          <b style={{ color: C.t1 }}>{activeStage.label}.</b> {activeStage.note}
        </div>
      )}

      {/* Track — the secondary axis */}
      <div style={R({ gap: SP.nudge, flexWrap: 'wrap' })}>
        {MED_TRACKS.map(t => {
          const on = track === t.id;
          return (
            <button key={t.id} type="button" onClick={() => setTrack(t.id)}
              style={pill(on ? tint(accent, 0.16) : C.b0, on ? accent : C.t3, {
                cursor: 'pointer', border: `1px solid ${on ? tint(accent, 0.3) : C.b1}`, fontSize: 10,
                fontWeight: on ? 700 : 500,
              })}>
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={R({ gap: 8 })}>
        <Search size={14} color={C.t3} />
        <input
          style={inp({ flex: 1 })}
          placeholder="Search by name, field or eligibility — 'MD-PhD', 'research year', 'DACA', 'rural', 'fee waiver'…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {entries.length === 0 ? (
        <div style={glass2({ padding: 16, textAlign: 'center' })}>
          <div style={{ fontSize: 12.5, color: C.t2 }}>
            Nothing in this combination. Try "The whole road", or clear the search — this database is
            medicine-specific, so general awards live in the scholarship database further down.
          </div>
        </div>
      ) : (
        <div style={CC({ gap: 8 })}>
          {entries.map(s => {
            const color = KIND_COLOR(s.kind);
            const Icon = KIND_ICON[s.kind] || Stethoscope;
            const open = openId === s.id;
            const applicableNow = (s.stage || []).includes('high-school');
            const trackState = stateOf(s.name);
            return (
              <div key={s.id} style={{
                ...glass2({ padding: 0, overflow: 'hidden' }),
                borderLeft: `3px solid ${trackState === 'tracked' ? C.green : color}`,
                background: `linear-gradient(120deg,${tint(color, 0.05)},${tint(C.t1, 0.02)} 55%)`,
              }}>
                <div style={R({ gap: 8, padding: 12, alignItems: 'flex-start', flexWrap: 'wrap' })}>
                  <button type="button" onClick={() => setOpenId(open ? null : s.id)} aria-expanded={open}
                    style={{ all: 'unset', boxSizing: 'border-box', flex: 1, minWidth: 190, cursor: 'pointer' }}>
                    <div style={R({ gap: 8, alignItems: 'flex-start' })}>
                      <Icon size={15} color={color} style={{ flexShrink: 0, marginTop: 4 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>
                          {s.org}{s.amount ? ` · ${s.amount}` : ''}
                        </div>
                        <div style={R({ gap: SP.nudge, marginTop: 8, flexWrap: 'wrap' })}>
                          <span style={pill(tint(color, 0.14), color, { fontSize: 9 })}>
                            {MED_ENTRY_KINDS[s.kind]?.label || 'Scholarship'}
                          </span>
                          {(s.stage || []).map(st => {
                            const meta = MED_STAGES[st];
                            if (!meta) return null;
                            const stColor = C[`${meta.color}L`] || C[meta.color] || accent;
                            return (
                              <span key={st} style={pill(tint(stColor, 0.12), stColor, { fontSize: 9 })}>
                                {meta.short}
                              </span>
                            );
                          })}
                          {(s.pathways || []).map(id => (
                            <span key={id} style={pill(C.b0, C.t3, { fontSize: 9 })}>
                              {PATHWAY_FINANCE.find(x => x.id === id)?.short || id}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                  {/* Discovery entries have nothing to track — there is no single
                      award behind them, and a tracker row saying "Where to look"
                      with no deadline is clutter the student then has to delete. */}
                  {onTrack && s.kind !== 'discovery' && (
                    <TrackButton state={trackState} busy={busyId === s.id} accent={accent}
                      onClick={e => { e.stopPropagation(); handleTrack(s); }} />
                  )}
                  <button type="button" onClick={() => setOpenId(open ? null : s.id)}
                    aria-label={open ? 'Collapse' : 'Expand'}
                    style={{ all: 'unset', cursor: 'pointer', marginTop: 4 }}>
                    {open ? <ChevronUp size={15} color={C.t3} /> : <ChevronDown size={15} color={C.t3} />}
                  </button>
                </div>

                {open && (
                  <div style={{ padding: '0px 12px 12px', borderTop: `1px solid ${C.b1}`, paddingTop: 12, ...CC({ gap: 8 }) }}>
                    <Line title="Who's eligible">{s.eligibility}</Line>
                    {s.deadline && <Line title="Typical timing">{s.deadline}</Line>}
                    {s.commitment && (
                      <div style={{
                        ...glass2({ padding: 12 }), border: `1px solid ${tint(C.teal, 0.24)}`,
                        background: tint(C.teal, 0.05),
                      }}>
                        <div style={{ ...R({ gap: 8, alignItems: 'flex-start' }), fontSize: 12, color: C.t2, lineHeight: 1.55 }}>
                          <Clock3 size={12} color={C.tealL} style={{ flexShrink: 0, marginTop: 4 }} />
                          <span><b style={{ color: C.t1 }}>What you owe in return:</b> {s.commitment}</span>
                        </div>
                      </div>
                    )}
                    {s.howToFind && (
                      <div style={{
                        ...glass2({ padding: 12 }), border: `1px solid ${tint(C.violet, 0.24)}`,
                        background: tint(C.violet, 0.05),
                      }}>
                        <div style={{ ...R({ gap: 8, alignItems: 'flex-start' }), fontSize: 12, color: C.t2, lineHeight: 1.55 }}>
                          <Search size={12} color={C.violetL} style={{ flexShrink: 0, marginTop: 4 }} />
                          <span><b style={{ color: C.t1 }}>How to find it:</b> {s.howToFind}</span>
                        </div>
                      </div>
                    )}
                    <Line title="Why it matters">{s.why}</Line>
                    {/* The whole reason an award eight years away is on this
                        screen. Rendered as the loudest block on the card for
                        anything a student cannot apply for yet. */}
                    {s.hsAction && !applicableNow && (
                      <div style={{
                        ...glass2({ padding: 12 }), border: `1px solid ${tint(C.green, 0.28)}`,
                        background: tint(C.green, 0.06),
                      }}>
                        <div style={{ ...R({ gap: 8, alignItems: 'flex-start' }), fontSize: 12, color: C.t2, lineHeight: 1.55 }}>
                          <Sparkles size={12} color={C.greenL} style={{ flexShrink: 0, marginTop: 4 }} />
                          <span><b style={{ color: C.t1 }}>What to do about it now:</b> {s.hsAction}</span>
                        </div>
                      </div>
                    )}
                    {s.caution && (
                      <div style={{
                        ...glass2({ padding: 12 }), border: `1px solid ${tint(C.amber, 0.28)}`,
                        background: tint(C.amber, 0.06),
                      }}>
                        <div style={{ ...R({ gap: 8, alignItems: 'flex-start' }), fontSize: 12, color: C.t2, lineHeight: 1.55 }}>
                          <AlertTriangle size={12} color={C.amberL} style={{ flexShrink: 0, marginTop: 4 }} />
                          <span><b style={{ color: C.amberL }}>Check this before you plan around it:</b> {s.caution}</span>
                        </div>
                      </div>
                    )}
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer"
                        style={{ ...btnSm(C.s3, { color: C.t2, textDecoration: 'none', alignSelf: 'flex-start' }) }}>
                        <ExternalLink size={12} /> Official page
                      </a>
                    )}
                    {s.kind !== 'discovery' && (
                      <div style={{ fontSize: 10.5, color: C.t4, lineHeight: 1.5 }}>
                        Amounts and deadlines are typical ranges and seasons, not this year's figures —
                        both move annually, and this program's eligibility can move too. Confirm on the
                        official page before you plan around any of it.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 10.5, color: C.t4, lineHeight: 1.5 }}>
        Every official page linked above was read end to end on {new Date(MED_SCHOLARSHIP_READ_ON + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}.
        Programs change their eligibility, not only their numbers — the Tylenol scholarship on this
        page stopped being open to high schoolers between one year and the next — so treat every entry
        as a starting point for your own check rather than a fact sheet.
      </div>
    </div>
  );
}

function Line({ title, children }) {
  return (
    <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }}>
      <b style={{ color: C.t1 }}>{title}:</b> {children}
    </div>
  );
}
