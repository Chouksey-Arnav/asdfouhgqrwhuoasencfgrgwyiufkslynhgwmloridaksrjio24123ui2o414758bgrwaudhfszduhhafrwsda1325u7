import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Stethoscope, CalendarClock, ExternalLink, ShieldAlert, AlertTriangle, Loader2, Check,
  ChevronDown, MapPin, Mic, GraduationCap, Search, Info, XCircle, Target, Clock,
  ScrollText, FileWarning, BellRing, X, Compass,
} from 'lucide-react';
import { C, glass, glass2, btnSm, R, CC, pill, tint, onTint, accentText } from '../../lib/theme';
import PanelHero from '../ui/PanelHero';
import SectionIntro from './SectionIntro';
import Disclosure, { HelpNote, HowItWorks } from '../ui/Disclosure';
import {
  PROGRAMS, MISLISTED_PROGRAMS, PATHWAY_GROUPS, PATHWAY_BY_ID,
  ROUND_TYPES, TEST_POLICIES, BASIS_META, STATES,
} from '../../data/combinedDegreePrograms';
import {
  verificationStatus, nextDeadline, milestoneRowsFor, collegeRowFor, programLabel,
  studentFactsFor, programReadiness, GAP_STATUS, acceptanceLine,
  interviewTargetsFor, filterPrograms, filterRoster, closingSoon, catalogSummary,
  ALERT_OFFSETS, STALE_AFTER_DAYS,
} from '../../lib/combinedDegree';
import { setInterviewIntent } from '../../lib/interviewIntent';
import { listItems, createItem } from '../../lib/dataApi';

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio ▸ Applying ▸ Combined Degrees.
//
// ── Why this is a section of Applying and not a tab of its own ──────────────
// A combined-degree program IS a college application. It belongs beside the
// college list, the supplemental essays, the recommenders, the interview prep
// and the odds calculator, because those five things are what applying to one
// consists of. Putting it anywhere else would mean building a second, parallel
// application tracker next to the one that already exists.
//
// ── What this screen is for ─────────────────────────────────────────────────
// This is the only medical-school-adjacent decision our students make while
// they are still in high school, and the prep timeline for it starts in ninth
// grade. It is also the worst-served: requirements are idiosyncratic, published
// in PDFs, changed between cycles without announcement, and aggregated almost
// entirely by people selling consulting.
//
// So the screen is built around the four things that actually go wrong.
//
//   1. THE NUMBER IS MADE UP. Almost no BS/MD program publishes an acceptance
//      rate. The figures in circulation are a known class size divided by a
//      guessed applicant count, laundered by blogs citing each other. Every
//      number on every card here carries its basis, and "not published" is
//      shown as loudly as a real figure would be — because the absence is the
//      fact the student needs.
//
//   2. THE DATA IS OLD. A requirement we checked fourteen months ago has had a
//      full admissions cycle to change. Stale entries carry a visible warning
//      rather than a quiet one; see verificationStatus().
//
//   3. THE PROGRAM IS DEAD, OR WAS NEVER WHAT THEY THINK. Northwestern's HPME
//      was terminated in 2020 and is still recommended everywhere. Texas JAMP
//      is a need-based program for students already enrolled at a Texas public
//      university, and gets listed next to Brown PLME constantly. Both have a
//      first-class block on this page, because a student who finds nothing here
//      believes whoever told them wrong.
//
//   4. THE STUDENT CANNOT SEE WHERE THEY STAND. We already hold their GPA
//      terms, every test sitting with sections, and dated service and clinical
//      hours. The gap view puts those against each program's stated bar, and
//      every shortfall links to the screen that fixes it.
//
// And the interview link. The MMI circuit and the CASPer test have been built
// and orphaned — nothing in the app explained what they were for. Any program
// here that interviews, or that requires CASPer, hands the student straight
// into the right module with the right mode pre-selected.
// ─────────────────────────────────────────────────────────────────────────────

const toneColor = (tone) => ({ good: C.green, warn: C.amber, bad: C.rose, neutral: C.t3 }[tone] || C.t3);
const urgencyColor = (u) => ({ critical: C.rose, urgent: C.amber, soon: C.blue }[u] || C.t3);
const readinessColor = (s) => ({ clears: C.green, close: C.amber, short: C.rose, unknown: C.t3, unstated: C.t3 }[s] || C.t3);

/** A number's provenance, said next to the number. Never optional. */
function BasisChip({ basis, compact = false }) {
  const meta = BASIS_META[basis] || BASIS_META.unpublished;
  const col = C[meta.colorKey] || C.t3;
  return (
    <span title={meta.blurb} style={pill(tint(col, 0.13), accentText(col), {
      fontSize: compact ? 8.5 : 9, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', 
      border: `1px solid ${tint(col, 0.26)}`,
    })}>{meta.label}</span>
  );
}

/**
 * The staleness warning. Deliberately not a subtle gray footnote: a student
 * planning a testing calendar around a score floor that moved last spring loses
 * that calendar, and the cost of over-warning is nil next to that.
 */
function StaleWarning({ v, isMobile }) {
  if (!v?.warning) return null;
  const col = v.stale ? C.rose : C.amber;
  return (
    <div style={{
      ...R({ gap: 8, alignItems: 'flex-start', padding: isMobile ? '9px 11px' : '10px 13px' }),
      borderRadius: 8, background: tint(col, 0.08), border: `1px solid ${tint(col, 0.28)}`,
    }}>
      {v.stale ? <FileWarning size={13} color={col} style={{ marginTop: 4, flexShrink: 0 }} />
        : <Clock size={13} color={col} style={{ marginTop: 4, flexShrink: 0 }} />}
      <span style={{ fontSize: 11, color: C.t2, lineHeight: 1.55 }}>
        <b style={{ color: accentText(col) }}>{v.stale ? 'Out of date — do not plan around this' : 'Getting old'}:</b>{' '}{v.warning}
      </span>
    </div>
  );
}

/** The deadline, always with its precision and its round attached. */
function DeadlineChip({ dl }) {
  if (!dl) return null;
  if (!dl.date) {
    return <span style={pill(C.surf2, C.t3, { fontSize: 9.5, gap: 4 })}><CalendarClock size={9.5} />{dl.label}</span>;
  }
  const col = urgencyColor(dl.urgency);
  return (
    <span style={pill(tint(col, 0.13), accentText(col), { fontSize: 9.5, gap: 4, border: `1px solid ${tint(col, 0.26)}` })}>
      <CalendarClock size={9.5} />{dl.label} · {dl.daysOut} days
    </span>
  );
}

/** One requirement, the student's own number against it, and where to go and fix it. */
function GapRow({ row, onGoTo }) {
  const meta = GAP_STATUS[row.status] || GAP_STATUS.info;
  const col = toneColor(meta.tone);
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderRadius: 8, padding: '8px 12px',
      background: row.status === 'short' || row.status === 'blocked' ? tint(col, 0.07) : C.surf2,
      border: `1px solid ${row.status === 'short' || row.status === 'blocked' ? tint(col, 0.24) : C.b1}`,
    }}>
      <div style={R({ gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' })}>
        <span style={R({ gap: 8, minWidth: 0 })}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: col, flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: C.t1 }}>{row.label}</span>
          {row.basis && <BasisChip basis={row.basis} compact />}
        </span>
        <span style={R({ gap: 4, flexWrap: 'wrap' })}>
          {row.requirement && <span style={{ fontSize: 11, color: C.t2, fontFamily: C.FM }}>{row.requirement}</span>}
          <span style={pill(tint(col, 0.14), accentText(col), { fontSize: 9, fontWeight: 800 })}>{meta.label}</span>
        </span>
      </div>
      <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.55, marginTop: 4 }}>
        {row.yours && <><b style={{ color: C.t2 }}>Yours:</b> {row.yours} · </>}
        {row.detail}
      </div>
      {(row.note || row.fixWhere) && (
        <div style={R({ gap: 8, flexWrap: 'wrap', marginTop: 4 })}>
          {row.fixWhere && onGoTo && (
            <button type="button" onClick={() => onGoTo(row.fixWhere)}
              style={btnSm('transparent', { fontSize: 10, color: accentText(col), border: `1px solid ${tint(col, 0.3)}`, padding: '4px 8px' })}>
              {row.status === 'short' || row.status === 'missing' ? 'Fix this' : 'Open'}
            </button>
          )}
          {row.note && (
            <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
              style={btnSm('transparent', { fontSize: 10, color: C.t3, border: `1px solid ${C.b1}`, padding: '4px 8px' })}>
              <Info size={9.5} style={{ marginRight: 4 }} />{open ? 'Less' : "The program's own words"}
            </button>
          )}
        </div>
      )}
      {open && row.note && (
        <div style={{ fontSize: 11, color: C.t2, lineHeight: 1.55, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.b1}`, fontStyle: 'italic' }}>
          {row.note}
        </div>
      )}
    </div>
  );
}

/** One fully specified program. */
function ProgramCard({ program, facts, saved, saving, onSave, onGoTo, isMobile }) {
  const [open, setOpen] = useState(false);
  const dl = useMemo(() => nextDeadline(program), [program]);
  const v = useMemo(() => verificationStatus(program), [program]);
  const readiness = useMemo(() => programReadiness(program, facts), [program, facts]);
  const accept = useMemo(() => acceptanceLine(program), [program]);
  const interviews = useMemo(() => interviewTargetsFor(program), [program]);
  const pathway = PATHWAY_BY_ID[program.pathway];
  const col = readinessColor(readiness.status);
  const round = ROUND_TYPES[program.deadline?.round];
  const policy = TEST_POLICIES[program.test?.policy];

  function practise(target) {
    setInterviewIntent({ mode: target.mode, stationFilter: target.stationFilter, programId: program.id });
    onGoTo?.('interview');
  }

  return (
    <motion.div layout style={{
      ...glass({ padding: 0, overflow: 'hidden' }),
      border: `1px solid ${tint(col, 0.22)}`,
      background: `linear-gradient(155deg,${tint(col, 0.05)},rgba(255,255,255,0.02) 55%)`,
    }}>
      <div style={{ height: 2, background: `linear-gradient(90deg,${col},${tint(col, 0)})` }} />
      <div style={{ padding: isMobile ? 14 : 17, ...CC({ gap: 12 }) }}>

        {/* Staleness rides ABOVE the name, for the same reason eligibility does
            on the Opportunities cards: a student should learn that a card is
            unreliable before they read anything on it, not after. */}
        <StaleWarning v={v} isMobile={isMobile} />

        <div style={R({ gap: 4, flexWrap: 'wrap' })}>
          <DeadlineChip dl={dl} />
          {round && (
            <span style={pill(round.binding ? tint(C.rose, 0.13) : C.surf2, round.binding ? accentText(C.rose) : C.t3, { fontSize: 9.5 })}>
              {round.label}{round.binding ? ' · binding' : ''}
            </span>
          )}
          <span style={pill(tint(C[pathway?.colorKey] || C.blue, 0.13), accentText(C[pathway?.colorKey] || C.blue), { fontSize: 9.5 })}>
            {program.degree} · {program.years} yr
          </span>
          <span style={pill(C.surf2, C.t3, { fontSize: 9.5, gap: 4 })}><MapPin size={9.5} />{program.state}</span>
          {program.supplemental?.required && (
            <span style={pill(tint(C.violet, 0.13), accentText(C.violet), { fontSize: 9.5, gap: 4 })}><ScrollText size={9.5} />Separate application</span>
          )}
        </div>

        <div>
          <div style={{ fontSize: isMobile ? 14 : 15.5, fontWeight: 800, color: C.t1, fontFamily: C.FD, lineHeight: 1.35 }}>{program.program}</div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>{program.institution}</div>
        </div>

        {/* ── Where this student stands ────────────────────────────────────
            The headline is computed from the same rows shown underneath, so
            the summary can never disagree with the detail. */}
        <div style={{
          ...R({ gap: 8, alignItems: 'flex-start', padding: '8px 12px' }),
          borderRadius: 8, background: tint(col, 0.07), border: `1px solid ${tint(col, 0.2)}`,
        }}>
          <Target size={13} color={col} style={{ marginTop: 4, flexShrink: 0 }} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: accentText(col) }}>{readiness.headline}</span>
            <span style={{ display: 'block', fontSize: 10.5, color: C.t3, marginTop: 4, lineHeight: 1.55 }}>
              {readiness.checkable > 0
                ? `Checked against ${readiness.checkable} requirement${readiness.checkable === 1 ? '' : 's'} this program states, using your own logged GPA, scores and hours.`
                : 'Nothing here is a number we can check you against — which is itself worth knowing.'}
            </span>
          </span>
        </div>

        {/* ── The acceptance rate, said honestly ───────────────────────────
            The most important twelve words on the page for most students. */}
        <div style={R({ gap: 8, alignItems: 'flex-start' })}>
          <GraduationCap size={12} color={C.t4} style={{ marginTop: 4, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: C.t3, lineHeight: 1.55, minWidth: 0 }}>
            <b style={{ color: C.t2, fontWeight: 700 }}>Selectivity:</b> {accept.text} <BasisChip basis={accept.basis} compact />
            {accept.note && <span style={{ display: 'block', marginTop: 4 }}>{accept.note}</span>}
          </span>
        </div>

        {policy && (
          <div style={R({ gap: 8, alignItems: 'flex-start' })}>
            <ShieldAlert size={12} color={toneColor(policy.tone)} style={{ marginTop: 4, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: C.t3, lineHeight: 1.55 }}>
              <b style={{ color: C.t2, fontWeight: 700 }}>{policy.label}.</b> {policy.blurb}
            </span>
          </div>
        )}

        <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }}>{program.why}</div>

        {/* ── Interview and CASPer prep — the link that was missing ───────── */}
        {interviews.length > 0 && (
          <div style={{ ...CC({ gap: 8, padding: '12px 12px' }), borderRadius: 8, background: tint(C.orange, 0.06), border: `1px solid ${tint(C.orange, 0.2)}` }}>
            <div style={R({ gap: 8, flexWrap: 'wrap' })}>
              <Mic size={12} color={C.orange} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: accentText(C.orange) }}>
                How this one assesses you
              </span>
            </div>
            {interviews.map(t => (
              <div key={t.key} style={CC({ gap: 4 })}>
                <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>
                  <b style={{ color: C.t1 }}>{t.label}.</b> {t.blurb}
                </span>
                <button type="button" onClick={() => practise(t)}
                  style={{ ...btnSm(tint(C.orange, 0.16), { color: accentText(C.orange), fontSize: 11, alignSelf: 'flex-start', border: `1px solid ${tint(C.orange, 0.3)}` }) }}>
                  <Mic size={11} style={{ marginRight: 4 }} />{t.cta}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── The gap detail ──────────────────────────────────────────────── */}
        {open && (
          <div style={CC({ gap: 8, paddingTop: 4 })}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3 }}>
              Every requirement, against your own record
            </div>
            {readiness.rows.map(r => <GapRow key={r.id} row={r} onGoTo={onGoTo} />)}

            {program.supplemental?.prompts?.length > 0 && (
              <div style={{ ...CC({ gap: 4, padding: '12px 12px' }), borderRadius: 8, background: C.surf2, border: `1px solid ${C.b1}` }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3 }}>
                  Supplemental prompts
                </span>
                {program.supplemental.prompts.map((p, i) => (
                  <div key={i} style={R({ gap: 8, alignItems: 'flex-start' })}>
                    <span style={{ fontSize: 10, fontFamily: C.FM, color: C.t4, flexShrink: 0, marginTop: 4 }}>{i + 1}</span>
                    <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>{p}</span>
                  </div>
                ))}
                <span style={{ fontSize: 10, color: C.t4, lineHeight: 1.5 }}>
                  Prompts change between cycles. Confirm this year's wording on the official page before you draft against them.
                </span>
              </div>
            )}

            {(program.sources || []).length > 0 && (
              <div style={CC({ gap: 4 })}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3 }}>Sources</span>
                {program.sources.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, color: accentText(C.blue), textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <ExternalLink size={10} />{s.label} <span style={{ color: C.t4 }}>· read {s.retrieved}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={R({ gap: 8, flexWrap: 'wrap', paddingTop: 4 })}>
          <button type="button" disabled={saving || saved} onClick={() => onSave(program, dl)}
            style={btnSm(saved ? tint(C.green, 0.14) : tint(C.sky, 0.16), {
              color: saved ? accentText(C.green) : accentText(C.sky), fontSize: 11,
              border: `1px solid ${tint(saved ? C.green : C.sky, 0.3)}`,
              cursor: saved ? 'default' : 'pointer',
            })}>
            {saving ? <Loader2 size={11} className="spin" style={{ marginRight: 4 }} />
              : saved ? <Check size={11} style={{ marginRight: 4 }} />
              : <BellRing size={11} style={{ marginRight: 4 }} />}
            {saved ? 'Tracked, with milestones' : 'Track it — and build my milestones'}
          </button>
          {program.url && (
            <a href={program.url} target="_blank" rel="noreferrer"
              style={{ ...btnSm(C.surf2, { color: C.t2, fontSize: 11, textDecoration: 'none' }) }}>
              <ExternalLink size={11} style={{ marginRight: 4 }} />Official page
            </a>
          )}
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
            style={btnSm('transparent', { fontSize: 11, color: C.t3, marginLeft: 'auto', border: `1px solid ${C.b1}` })}>
            <ChevronDown size={11} style={{ marginRight: 4, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
            {open ? 'Less' : `Requirements (${readiness.rows.length})`}
          </button>
        </div>

        <div style={{ fontSize: 9.5, color: C.t4, lineHeight: 1.5 }}>
          {v.label} against {program.institution}'s own page. Requirements and deadlines move between cycles — the official page is the authority, always.
        </div>
      </div>
    </motion.div>
  );
}

/**
 * The programs students will be told about that are not what they are told.
 *
 * Placed high on the page rather than in a footnote, because the failure it
 * prevents is a whole senior year spent on an application that does not exist.
 */
function MislistedBlock({ isMobile }) {
  return (
    <div style={CC({ gap: 8 })}>
      {MISLISTED_PROGRAMS.map(m => {
        const closed = m.kind === 'closed';
        const col = closed ? C.rose : C.amber;
        return (
          <div key={m.id} style={{
            ...glass2({ padding: isMobile ? 13 : 15 }),
            border: `1px solid ${tint(col, 0.26)}`,
            background: `linear-gradient(140deg,${tint(col, 0.07)},rgba(255,255,255,0.02) 60%)`,
          }}>
            <div style={R({ gap: 8, flexWrap: 'wrap', marginBottom: 4 })}>
              {closed ? <XCircle size={13} color={col} /> : <AlertTriangle size={13} color={col} />}
              <span style={pill(tint(col, 0.15), accentText(col), { fontSize: 9, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))'})}>
                {closed ? 'Closed' : 'Not a high-school application'}
              </span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{m.institution} — {m.program}</div>
            <div style={{ fontSize: 11.5, color: accentText(col), fontWeight: 700, marginTop: 4 }}>{m.headline}</div>
            <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55, marginTop: 8 }}>{m.detail}</div>
            <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.b1}` }}>
              <b style={{ color: C.t1 }}>What to do instead:</b> {m.instead}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CombinedDegreePanel({
  accent = C.blue, user = null, snapshot = null, loading = false,
  pathwayKey = null, onGoTo, isMobile = false,
}) {
  const [pathway, setPathway] = useState(() => (PATHWAY_BY_ID[pathwayKey] ? pathwayKey : 'all'));
  const [state, setStateFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [savingId, setSavingId] = useState(null);
  const [existingColleges, setExistingColleges] = useState([]);

  const facts = useMemo(() => studentFactsFor({ snapshot: snapshot || {}, user }), [snapshot, user]);
  const summary = useMemo(() => catalogSummary(), []);
  const list = useMemo(() => filterPrograms({ pathway, state, query }), [pathway, state, query]);
  const roster = useMemo(() => filterRoster({ pathway, state, query }), [pathway, state, query]);
  const soon = useMemo(() => closingSoon(120), []);

  // Which programs are already on the college list. Matched on the program
  // label, which is how collegeRowFor writes them — a dedicated column would be
  // better and is not worth a migration for a string comparison.
  useEffect(() => {
    let cancelled = false;
    listItems('colleges').then(rows => {
      if (cancelled) return;
      setExistingColleges(rows || []);
      const names = new Set((rows || []).map(r => String(r.name || '')));
      setSavedIds(new Set(PROGRAMS.filter(p => names.has(programLabel(p))).map(p => p.id)));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /**
   * Saving is the whole point of the screen: one tap turns "I should look at
   * this" into a school on the college list AND a dated milestone ladder that
   * starts five months out — which, for a November deadline with a supplemental
   * essay set and official score sends behind it, is when the work has to
   * begin.
   */
  const save = useCallback(async (program, dl) => {
    if (!program || savedIds.has(program.id)) return;
    setSavingId(program.id);
    try {
      const label = programLabel(program);
      let college = existingColleges.find(c => String(c.name) === label) || null;
      if (!college) {
        college = await createItem('colleges', collegeRowFor(program, dl));
        setExistingColleges(prev => [...prev, college]);
      }
      // The milestone rows carry the college id as well as the program's source_ref, so
      // completing the application milestone can find and advance the exact college-list row this
      // program created — see completionEffects in src/lib/milestoneSync.js.
      const rows = dl?.iso ? milestoneRowsFor(program, dl.iso) : [];
      for (const r of rows) await createItem('deadlines', { ...r, college_id: college?.id || null });
      setSavedIds(prev => new Set([...prev, program.id]));

      const alerts = Math.max(0, rows.length - 1);
      toast.success(
        alerts
          ? `${program.institution} is on your college list, with ${alerts} milestone${alerts === 1 ? '' : 's'} before the deadline.`
          : `${program.institution} is on your college list. That deadline is close — start now.`,
        { duration: 5200 },
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingId(null);
    }
  }, [savedIds, existingColleges]);

  const filtersOn = pathway !== 'all' || state !== 'all' || !!query.trim();
  const clearFilters = () => { setPathway('all'); setStateFilter('all'); setQuery(''); };

  return (
    <div style={CC({ gap: 20 })}>
      <PanelHero tourTag="portfolio-deep-combined" icon={Stethoscope} color={C.blue} color2={C.violet} m={isMobile}
        eyebrow="Combined degrees" title="Programs you apply to from high school"
        sub="Combined BS/MD, direct-admit BSN, six-year PharmD, seven-year dental and direct-entry PA and PT/OT. The only medical-school decision you make while you are still in school — and the one nobody documents properly."
        stats={[
          { value: summary.total, label: 'programs', color: C.blueL },
          { value: summary.states, label: 'states', color: C.violetL },
          { value: summary.detailed, label: 'fully checked', color: C.greenL },
        ]} />

      <HowItWorks
        id="combined-degree" color={C.blue} m={isMobile}
        steps={[
          { title: 'Find the ones that fit', body: 'Filter by pathway and state. Every card shows its deadline, its round, and whether the round is binding.' },
          { title: 'See where you actually stand', body: "We check each program's stated GPA, score and hours requirements against your own logged record — and link you to the screen that fixes each gap." },
          { title: 'Track it and get your milestones', body: 'One tap puts it on your college list and builds a milestone ladder starting five months out.' },
        ]}
      />

      {/* ── The honesty statement ────────────────────────────────────────────
          Placed before any program, because it is the thing that makes every
          number below readable. A student who does not know that most BS/MD
          acceptance rates are invented will read our "not published" as a gap
          in our data rather than as a fact about the world. */}
      <div style={{
        ...glass({ padding: isMobile ? 15 : 18 }),
        background: `linear-gradient(120deg,${tint(C.amber, 0.09)},rgba(255,255,255,0.02) 62%)`,
        border: `1px solid ${tint(C.amber, 0.24)}`,
      }}>
        <div style={R({ gap: 8, marginBottom: 8, flexWrap: 'wrap' })}>
          <ShieldAlert size={14} color={C.amber} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: accentText(C.amber) }}>
            Read this before you read a single acceptance rate
          </span>
        </div>
        <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55, maxWidth: 760 }}>
          Almost no combined-degree program publishes an acceptance rate. Nearly every percentage you will find online was
          produced by dividing a known class size by a <em>guessed</em> applicant count, and then repeated until it looked like a fact.
          So every number on this page carries a label — <BasisChip basis="official" /> means the program says it itself,{' '}
          <BasisChip basis="estimated" /> means it is a judgment, and <BasisChip basis="unpublished" /> means nobody
          outside the admissions office knows and anyone quoting you a precise figure made it up.
          Anything we have not re-checked in {Math.round(STALE_AFTER_DAYS / 30)} months carries a warning on the card, because a
          requirement that moved between cycles is worse than no requirement at all.
        </div>
      </div>

      {/* ── Closing soonest ──────────────────────────────────────────────────
          Above the filters on purpose. Combined-degree deadlines are the EARLY
          ones — November of senior year — and a student who is looking at this
          page in September needs the date before they need the browse. */}
      {soon.length > 0 && (
        <div style={{
          ...glass({ padding: isMobile ? 15 : 18 }),
          background: `linear-gradient(120deg,${tint(C.rose, 0.08)},rgba(255,255,255,0.02) 60%)`,
          border: `1px solid ${tint(C.rose, 0.22)}`,
        }}>
          <div style={R({ gap: 8, marginBottom: 4, flexWrap: 'wrap' })}>
            <CalendarClock size={14} color={C.rose} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: accentText(C.rose) }}>Closing soonest</span>
          </div>
          <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginBottom: 12, maxWidth: 720 }}>
            These are the early rounds, and most of them have a separate program application behind them.
            Tracking one builds milestones at {ALERT_OFFSETS.join(', ')} days out — the first of which is the summer before senior year, which is when the essays actually have to start.
          </div>
          <div style={CC({ gap: 8 })}>
            {soon.slice(0, 5).map(({ program, dl }) => {
              const col = urgencyColor(dl.urgency);
              const saved = savedIds.has(program.id);
              return (
                <div key={program.id} style={{
                  ...R({ gap: 8, justifyContent: 'space-between', flexWrap: 'wrap', padding: '8px 12px' }),
                  borderRadius: 8, background: tint(col, 0.06), border: `1px solid ${tint(col, 0.18)}`,
                }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{program.institution}</span>
                    <span style={{ display: 'block', fontSize: 10.5, color: C.t3, marginTop: 4 }}>
                      {program.program} · {dl.label} · {dl.daysOut} days
                      {dl.passedThisCycle ? " · this cycle's has already passed, so this is next cycle" : ''}
                      {dl.binding ? ' · binding' : ''}
                    </span>
                  </span>
                  <button type="button" disabled={saved || savingId === program.id} onClick={() => save(program, dl)}
                    style={btnSm(saved ? tint(C.green, 0.14) : tint(col, 0.16), {
                      color: saved ? accentText(C.green) : accentText(col), fontSize: 10.5, flexShrink: 0,
                      border: `1px solid ${tint(saved ? C.green : col, 0.3)}`, cursor: saved ? 'default' : 'pointer',
                    })}>
                    {savingId === program.id ? <Loader2 size={10.5} className="spin" /> : saved ? <Check size={10.5} /> : <BellRing size={10.5} />}
                    <span style={{ marginLeft: 4 }}>{saved ? 'Tracked' : 'Track it'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Commonly listed, and wrong ─────────────────────────────────────── */}
      <section aria-label="Programs that are not what you have been told" style={CC({ gap: 12 })}>
        <SectionIntro icon={AlertTriangle} color={C.rose} color2={C.amber} m={isMobile}
          title="Commonly recommended — and wrong"
          blurb="Programs that are closed, or that you cannot apply to from high school at all, and that get listed beside the real ones constantly. Getting one of these wrong costs a senior year."
          stats={[{ value: MISLISTED_PROGRAMS.length, label: 'to know about', color: C.roseL }]} />
        <MislistedBlock isMobile={isMobile} />
      </section>

      {/* ── The catalog ──────────────────────────────────────────────────── */}
      <section aria-label="Combined-degree programs" style={CC({ gap: 12 })}>
        <SectionIntro icon={Stethoscope} color={C.blue} color2={C.violet} m={isMobile}
          title="The programs"
          blurb="Every card is checked against your own logged GPA, test scores and hours. Nothing here is a guess dressed as a fact — where a program publishes nothing, the card says so."
          stats={[{ value: list.length, label: 'shown', color: C.blueL }]}
          right={filtersOn ? (
            <button onClick={clearFilters} style={btnSm(C.surfHi, { fontSize: 11, color: C.t2 })}>
              <X size={11} />Clear filters
            </button>
          ) : null} />

        {/* Filters */}
        <div style={CC({ gap: 8 })}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, color: C.t3, marginRight: 4 }}>Pathway:</span>
            <button onClick={() => setPathway('all')}
              style={pill(pathway === 'all' ? tint(accent, 0.22) : C.surf2, pathway === 'all' ? onTint(accent) : C.t3,
                { cursor: 'pointer', border: `1px solid ${pathway === 'all' ? tint(accent, 0.4) : C.b1}`, fontSize: 11, fontWeight: pathway === 'all' ? 700 : 500 })}>
              Everything
            </button>
            {PATHWAY_GROUPS.map(g => {
              const on = pathway === g.id;
              const gc = C[g.colorKey] || C.blue;
              return (
                <button key={g.id} onClick={() => setPathway(on ? 'all' : g.id)} title={g.blurb}
                  style={pill(on ? tint(gc, 0.22) : C.surf2, on ? onTint(gc) : C.t3,
                    { cursor: 'pointer', border: `1px solid ${on ? tint(gc, 0.4) : C.b1}`, fontSize: 11, fontWeight: on ? 700 : 500 })}>
                  {g.label}
                </button>
              );
            })}
          </div>

          <div style={R({ gap: 8, flexWrap: 'wrap' })}>
            <span style={{ ...R({ gap: 4, padding: '8px 12px' }), borderRadius: 8, background: C.surf2, border: `1px solid ${C.b1}`, flex: 1, minWidth: 190 }}>
              <Search size={12} color={C.t4} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search institution or program"
                aria-label="Search combined-degree programs"
                style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', color: C.t1, font: 'inherit', fontSize: 12 }} />
            </span>
            <select value={state} onChange={e => setStateFilter(e.target.value)} aria-label="Filter by state"
              style={{ padding: '8px 12px', borderRadius: 8, background: C.surf2, border: `1px solid ${C.b1}`, color: C.t2, font: 'inherit', fontSize: 12 }}>
              <option value="all">Every state</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {pathway !== 'all' && PATHWAY_BY_ID[pathway] && (
            <HelpNote>{PATHWAY_BY_ID[pathway].blurb}</HelpNote>
          )}
        </div>

        {loading && !list.length ? (
          <div style={{ ...glass2({ padding: 20, textAlign: 'center' }) }}>
            <Loader2 size={18} className="spin" color={C.t3} />
            <div style={{ fontSize: 12.5, color: C.t3, marginTop: 8 }}>Reading your portfolio…</div>
          </div>
        ) : list.length ? (
          <AnimatePresence initial={false}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(400px,1fr))', gap: 12 }}>
              {list.map(p => (
                <ProgramCard key={p.id} program={p} facts={facts} isMobile={isMobile}
                  saved={savedIds.has(p.id)} saving={savingId === p.id} onSave={save} onGoTo={onGoTo} />
              ))}
            </div>
          </AnimatePresence>
        ) : (
          <div style={{ ...glass2({ padding: 20, textAlign: 'center' }) }}>
            <Compass size={20} color={C.t3} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}>
              Nothing fully checked matches those filters — but the discovery list below may still have programs in {state === 'all' ? 'your state' : state}.
            </div>
          </div>
        )}
      </section>

      {/* ── The discovery roster ─────────────────────────────────────────────
          Deliberately a different kind of object, and labeled as one. These
          carry the institution, the degree, the length and the state and NOT
          ONE requirement claim, because we have not read those off the
          program's own page. Half-knowing a score floor is worse than not
          claiming one — but leaving the program out entirely means a student in
          Ohio never learns NEOMED exists, and goes back to the blog. */}
      <Disclosure id="combined-degree-roster" icon={Compass} color={C.teal} m={isMobile}
        title={`${roster.length} more programs we can point you at`}
        sub="We know these exist and where they are. We have not verified their requirements, so we do not state any.">
        <div style={CC({ gap: 12 })}>
          <HelpNote icon={Info}>
            These carry no deadline, no score floor and no acceptance rate — on purpose. A requirement we half-know is worse
            than one we do not claim, and every aggregator that fills these gaps is guessing. Use them to find out a program
            exists, then go to the institution's own admissions page for the requirements.
          </HelpNote>
          {roster.length === 0 ? (
            <div style={{ fontSize: 11.5, color: C.t3 }}>Nothing in the discovery list matches those filters.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(280px,1fr))', gap: 8 }}>
              {roster.map(r => {
                const g = PATHWAY_BY_ID[r.pathway];
                const gc = C[g?.colorKey] || C.blue;
                return (
                  <div key={r.id} style={{ ...glass2({ padding: 12 }), borderLeft: `3px solid ${tint(gc, 0.5)}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, lineHeight: 1.4 }}>{r.institution}</div>
                    <div style={{ fontSize: 11, color: C.t2, marginTop: 4, lineHeight: 1.5 }}>{r.program}</div>
                    <div style={R({ gap: 4, flexWrap: 'wrap', marginTop: 8 })}>
                      <span style={pill(tint(gc, 0.12), accentText(gc), { fontSize: 9 })}>{r.degree} · {r.years} yr</span>
                      <span style={pill(C.surf2, C.t3, { fontSize: 9, gap: 4 })}><MapPin size={9} />{r.state}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Disclosure>
    </div>
  );
}
