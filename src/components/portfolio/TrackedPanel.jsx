import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Radar, Brain, Loader2, Search, ArrowRight, CalendarClock, AlertTriangle, Clock,
  CheckCircle2, Eye, ChevronDown, History, RefreshCw, Compass,
} from 'lucide-react';
import { C, glass, glass2, btnSm, inp, R, CC, pill, tint, onTint, accentText } from '../../lib/theme';
import { updateItem } from '../../lib/dataApi';
import { renderMarkdown } from '../../lib/renderMarkdown';
import { getCached, setCached, dailyKey } from '../../lib/aiCache';
import { localDateStr } from '../../lib/dateUtils';
import {
  buildTrackedItems, buildDailyReport, buildReportPrompt, trackedSignature,
  stageCounts, STAGES, STAGE_BY_ID,
} from '../../lib/trackedItems';
import PanelHero from '../ui/PanelHero';
import TrackQueueNotice from '../ui/TrackQueueNotice';
import EmptyState from '../ui/EmptyState';
import { HelpNote, HowItWorks } from '../ui/Disclosure';

// ─────────────────────────────────────────────────────────────────────────────
// The Tracked tab — where "Track" stops being a bookmark.
//
// Every Track button in the app writes a row somewhere (a scholarship into Financial Aid, a
// program into Activities, a school into the College List) and, until this tab existed, that was
// the last anyone heard of it. Nothing followed up. This is the follow-up: one live board of
// everything being tracked, ranked by what actually needs the student, with a report Meta Brain
// files EVERY DAY.
//
// The report is deterministic first and AI second (see trackedItems.js buildDailyReport): the
// facts are computed from real columns so the report exists offline, signed out, and rate
// limited, and can never invent a deadline. The model's only job is the voice on top. When there
// is nothing tracked, the report says exactly that instead of manufacturing something to say.
// ─────────────────────────────────────────────────────────────────────────────
const STAGE_ICONS = { needs_action: AlertTriangle, in_progress: Clock, watching: Eye, done: CheckCircle2 };

const KIND_FILTERS = [
  { id: 'all', label: 'Everything' },
  { id: 'Scholarship', label: 'Scholarships' },
  { id: 'Program', label: 'Programs' },
  { id: 'College', label: 'Colleges' },
  { id: 'Deadline', label: 'Deadlines' },
  { id: 'Recommender', label: 'Recommenders' },
];

// Status ladders, so a tracked thing can be moved forward from here rather than only from the
// panel it happens to live in. Mirrors FinancialAidPanel / CollegeListPanel / RecommendersPanel.
const NEXT_STATUS = {
  scholarships: { researching: 'applying', applying: 'submitted', submitted: 'awarded' },
  colleges: { researching: 'application_started', application_started: 'essays_in_progress', essays_in_progress: 'submitted' },
  recommenders: { 'Planning to ask': 'Asked', Asked: 'Confirmed', Confirmed: 'Submitted' },
};
const STATUS_VERB = {
  applying: 'Started applying', submitted: 'Marked submitted', awarded: 'Marked awarded',
  application_started: 'Application started', essays_in_progress: 'Essays in progress',
  Asked: 'Marked asked', Confirmed: 'Marked confirmed', Submitted: 'Marked submitted',
};

const LOG_KEY = 'portfolioTrackerLog';
const LOG_DAYS = 10;
// Below this many tracked items the whole board fits on one screen, so a search box and six type
// pills are furniture rather than help. The filters (and the state they hold) switch off entirely.
const FILTER_THRESHOLD = 6;

export default function TrackedPanel({
  snapshot, loading = false, accent = C.blue, askMedabrain, onOpen, onRefresh,
  pendingEntries = [], trackStatus = {}, isMobile = false, user = null,
}) {
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('all');
  const [kind, setKind] = useState('all');
  const [busyKey, setBusyKey] = useState(null);
  const [aiReport, setAiReport] = useState(null); // { loading, content, error }
  const [showLog, setShowLog] = useState(false);
  const [patches, setPatches] = useState({}); // optimistic row edits, keyed by `${resource}:${id}`

  // Optimistic patches are folded into the snapshot before classification so an inline status
  // change re-ranks the board instantly instead of waiting for a refetch.
  const effective = useMemo(() => applyPatches(snapshot, patches), [snapshot, patches]);
  const items = useMemo(() => buildTrackedItems(effective || {}), [effective]);
  const report = useMemo(() => buildDailyReport(items), [items]);
  const counts = useMemo(() => stageCounts(items), [items]);
  const signature = useMemo(() => trackedSignature(items), [items]);

  // ── Meta Brain's daily voice on the report ────────────────────────────────
  useEffect(() => {
    if (!askMedabrain || report.empty || !items.length) { setAiReport(null); return; }
    const key = dailyKey('trackedReport', user?.id || user?.email || 'anon', hash(signature));
    const cached = getCached(key);
    if (cached) { setAiReport({ loading: false, content: cached, error: null }); return; }
    let cancelled = false;
    setAiReport({ loading: true, content: null, error: null });
    askMedabrain(buildReportPrompt(report, items))
      .then((content) => { if (!cancelled) { setCached(key, content); setAiReport({ loading: false, content, error: null }); } })
      .catch((err) => { if (!cancelled) setAiReport({ loading: false, content: null, error: err.message }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- askMedabrain is recreated every render by App.jsx
  }, [signature, report.empty]);

  // ── The daily log ─────────────────────────────────────────────────────────
  // One line per day, written locally the first time the student opens the tab that day. It's
  // what makes the tracking read as *live* — a running record of what the tracker said on each
  // day, rather than a single number that silently overwrites itself.
  const [log, setLog] = useState(readLog);
  useEffect(() => {
    if (loading || !snapshot) return;
    const today = localDateStr();
    setLog((prev) => {
      if (prev[0]?.date === today && prev[0]?.headline === report.headline) return prev;
      const next = [{ date: today, headline: report.headline, needsAction: counts.needs_action || 0, tracked: items.length },
        ...prev.filter((e) => e.date !== today)].slice(0, LOG_DAYS);
      try { localStorage.setItem(LOG_KEY, JSON.stringify(next)); } catch { /* the log is a nicety */ }
      return next;
    });
  }, [report.headline, loading, snapshot, counts.needs_action, items.length]);

  // Search/type filtering only applies while the controls that drive it are on screen — otherwise
  // a student who filters a long board and then untracks their way below the threshold is left
  // with a silently filtered list and no visible control to clear it.
  const filtersActive = items.length >= FILTER_THRESHOLD;
  const filtered = useMemo(() => {
    const q = filtersActive ? query.trim().toLowerCase() : '';
    return items.filter((i) => {
      if (stage !== 'all' && i.stage !== stage) return false;
      if (filtersActive && kind !== 'all' && i.kind !== kind) return false;
      if (q && !`${i.name} ${i.sub} ${i.kind}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, stage, kind, query, filtersActive]);

  async function patchRow(item, patch, successMsg) {
    setBusyKey(item.key);
    setPatches((p) => ({ ...p, [item.key]: { ...(p[item.key] || {}), ...patch } }));
    try {
      await updateItem(item.resource, item.id, patch);
      toast.success(successMsg);
      onRefresh?.();
    } catch (err) {
      setPatches((p) => { const next = { ...p }; delete next[item.key]; return next; });
      toast.error(err.message);
    } finally { setBusyKey(null); }
  }

  function advance(item) {
    const ladder = NEXT_STATUS[item.resource];
    const current = rawStatus(effective, item);
    const next = ladder?.[current];
    if (!next) return;
    patchRow(item, { status: next }, `${item.name.slice(0, 34)} — ${STATUS_VERB[next] || next}`);
  }

  function setDate(item, value) {
    if (!value) return;
    const field = item.resource === 'scholarships' ? 'deadline'
      : item.resource === 'deadlines' ? 'due_date'
        : item.resource === 'colleges' ? 'rd_deadline'
          : item.resource === 'recommenders' ? 'due_date' : null;
    if (!field) return;
    patchRow(item, { [field]: value }, `Deadline saved for ${item.name.slice(0, 34)}`);
  }

  return (
    <div style={CC({ gap: 20 })}>
      <PanelHero
        tourTag="portfolio-tracked" icon={Radar} color={C.blue} color2={C.violet} m={isMobile}
        eyebrow="Tracked" title="Things you're keeping an eye on"
        sub="Anything you hit Track on — a scholarship, a program, a school — lands here. The most urgent one is always at the top, and we check on all of them every day."
        stats={[
          { value: items.length, label: 'tracked', color: C.blueL },
          { value: counts.needs_action || 0, label: 'need you', color: C.roseL },
          { value: counts.done || 0, label: 'finished', color: C.greenL },
        ]}
        right={onRefresh && (
          <button onClick={onRefresh} style={btnSm(C.s3, { color: C.t2, fontSize: 11 })} disabled={loading}>
            {loading ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}Refresh
          </button>
        )}
      />

      <TrackQueueNotice entries={pendingEntries} status={trackStatus} onRetried={onRefresh} />

      {/* Said once, at the top, in order — then dismissible. A board that sorts itself by urgency
          is genuinely useful and completely invisible until somebody explains it. */}
      <HowItWorks
        id="tracked" color={C.violet} m={isMobile}
        steps={[
          { title: 'Track something', body: 'Hit Track on any scholarship, program or school anywhere in the app.' },
          { title: 'We watch the dates', body: 'Each one gets a deadline, a status, and a plain next step.' },
          { title: 'Do the top one', body: 'The list re-sorts every day so the most urgent thing is first.' },
        ]}
      />

      {/* ── Today's report ── */}
      <div style={{
        ...glass({ padding: isMobile ? 16 : 20 }),
        background: `linear-gradient(125deg,${tint(C.violet, 0.11)},rgba(255,255,255,0.02) 60%)`,
        border: `1px solid ${tint(C.violet, 0.24)}`,
      }}>
        <div style={R({ gap: 10, marginBottom: 10, flexWrap: 'wrap' })}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg,${C.violet},${C.indigo})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Brain size={16} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: accentText(C.violet) }}>
              Today’s check-in
            </div>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{report.date}</div>
          </div>
          <button onClick={() => setShowLog((s) => !s)} aria-expanded={showLog} style={btnSm(C.s3, { color: C.t2, fontSize: 11 })}>
            <History size={12} />Past days
          </button>
        </div>

        <div style={{ fontSize: isMobile ? 14 : 15.5, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: '-.02em', lineHeight: 1.35 }}>
          {report.headline}
        </div>

        <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {report.lines.map((line, i) => (
            <li key={i} style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, display: 'flex', gap: 8 }}>
              <span aria-hidden style={{ color: C.violetL, flexShrink: 0 }}>·</span>{line}
            </li>
          ))}
        </ul>

        {report.focus && (
          <button onClick={() => onOpen?.(report.focus.view)}
            style={{
              boxSizing: 'border-box', width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit',
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 12, borderRadius: 10,
              background: tint(C.rose, 0.08), border: `1px solid ${tint(C.rose, 0.24)}`, marginTop: 12,
            }}>
            <AlertTriangle size={14} color={C.roseL} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.t1 }}>Do this first: {report.focus.name}</span>
              <span style={{ display: 'block', fontSize: 11, color: C.t3, marginTop: 2 }}>{report.focus.nextStep}</span>
            </span>
            <ArrowRight size={13} color={C.roseL} />
          </button>
        )}

        {(aiReport?.loading || aiReport?.content) && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.b1}` }}>
            {aiReport.loading
              ? <div style={R({ gap: 7, fontSize: 11.5, color: C.t3 })}><Loader2 size={12} className="spin" />Meta Brain is writing today's read…</div>
              : <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(aiReport.content) }} />}
          </div>
        )}

        <AnimatePresence initial={false}>
          {showLog && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.b1}`, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ fontSize: 10.5, color: C.t3, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>Last {LOG_DAYS} days</div>
                {log.length ? log.map((e) => (
                  <div key={e.date} style={R({ gap: 10, fontSize: 11.5, color: C.t2 })}>
                    <span style={{ fontFamily: C.FM, color: C.t3, flexShrink: 0, width: 74 }}>{e.date}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>{e.headline}</span>
                    {e.needsAction > 0 && <span style={pill(tint(C.rose, 0.14), C.roseL, { fontSize: 9.5 })}>{e.needsAction}</span>}
                  </div>
                )) : <div style={{ fontSize: 11.5, color: C.t3 }}>Today is the first report — check back tomorrow.</div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Stage tiles ──
          Four buckets, and — crucially — four filter buttons. They looked like read-only stat
          tiles for as long as nothing said otherwise, so the line under them says otherwise.
          Hidden entirely when there is nothing tracked: four zeroes above an empty state is just
          a more elaborate way of saying nothing. */}
      {items.length > 0 && (<>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 10 }}>
        {STAGES.map((s) => {
          const Icon = STAGE_ICONS[s.id];
          const c = C[s.colorKey] || C.blue;
          const active = stage === s.id;
          return (
            <button key={s.id} onClick={() => setStage(active ? 'all' : s.id)} aria-pressed={active}
              style={{
                all: 'unset', boxSizing: 'border-box', cursor: 'pointer', padding: 14, borderRadius: 12,
                background: active ? tint(c, 0.14) : C.surf2,
                border: `1px solid ${active ? tint(c, 0.4) : C.b1}`,
              }}>
              <div style={R({ gap: 6, marginBottom: 6 })}>
                <Icon size={13} color={c} />
                <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: C.FM, color: counts[s.id] ? C.t1 : C.t3 }}>{counts[s.id] || 0}</div>
              <div style={{ fontSize: 10, color: C.t3, marginTop: 3, lineHeight: 1.4 }}>{s.blurb}</div>
            </button>
          );
        })}
      </div>

      <HelpNote>Tap any box above to show only those — tap it again to go back to everything.</HelpNote>

      {/* ── Filters ──
          Search and six type pills are the right tools for forty tracked items and pure noise
          above five, where the whole list already fits on one screen. They appear when the list
          is big enough to need them. */}
      {items.length >= FILTER_THRESHOLD && (
        <div style={CC({ gap: 10 })}>
          <div style={R({ gap: 8 })}>
            <Search size={14} color={C.t3} />
            <input style={inp({ flex: 1 })} placeholder="Search everything you're tracking…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {KIND_FILTERS.map((k) => {
              const active = kind === k.id;
              const n = k.id === 'all' ? items.length : items.filter((i) => i.kind === k.id).length;
              return (
                <button key={k.id} onClick={() => setKind(k.id)} aria-pressed={active}
                  style={pill(active ? tint(accent, 0.22) : C.surf2, active ? onTint(accent) : C.t3, {
                    cursor: 'pointer', border: `1px solid ${active ? tint(accent, 0.4) : C.b1}`, fontWeight: active ? 700 : 500, gap: 6,
                  })}>
                  {k.label}<span style={{ fontFamily: C.FM, opacity: 0.75 }}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      </>)}

      {/* ── The board ── */}
      {loading && !items.length ? (
        <div style={{ ...glass({ padding: 36 }), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Loader2 className="spin" size={22} color={accent} />
          <div style={{ fontSize: 12.5, color: C.t2 }}>Pulling in everything you're tracking…</div>
        </div>
      ) : !items.length ? (
        <EmptyState
          icon={Compass} accent={accent} title="Nothing tracked yet"
          body="Find a program, competition or scholarship under Opportunities and hit Track. It shows up here with a countdown to its deadline and a plain next step, and we check on it every day."
          actionLabel="Find opportunities" onAction={() => onOpen?.('opportunities')}
        />
      ) : !filtered.length ? (
        <div style={{ ...glass2({ padding: 20, textAlign: 'center' }) }}>
          <div style={{ fontSize: 12.5, color: C.t2 }}>Nothing here right now.</div>
          <button onClick={() => { setStage('all'); setKind('all'); setQuery(''); }}
            style={{ ...btnSm(tint(accent, 0.16), { color: onTint(accent), fontSize: 11.5, marginTop: 10 }) }}>
            Show everything again
          </button>
        </div>
      ) : (
        <div style={CC({ gap: 8 })}>
          <AnimatePresence initial={false}>
            {filtered.map((item) => (
              <TrackedRow
                key={item.key} item={item} accent={accent} busy={busyKey === item.key}
                canAdvance={!!NEXT_STATUS[item.resource]?.[rawStatus(effective, item)]}
                onAdvance={() => advance(item)}
                onSetDate={(v) => setDate(item, v)}
                onOpen={() => onOpen?.(item.view)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ── One tracked thing ────────────────────────────────────────────────────────
function TrackedRow({ item, accent, busy, canAdvance, onAdvance, onSetDate, onOpen }) {
  const [open, setOpen] = useState(false);
  const stageMeta = STAGE_BY_ID[item.stage] || STAGES[2];
  const c = C[stageMeta.colorKey] || C.blue;
  // A past date is past whether or not the row also earned the 'overdue' flag — a finished
  // scholarship whose deadline has been and gone still has a negative day count, and rendering
  // that raw ("due in -3d") is the kind of small nonsense that makes a whole board look broken.
  const past = item.dueInDays != null && item.dueInDays < 0;
  const overdue = item.flags.includes('overdue');
  const dueColor = overdue ? C.roseL : past ? C.t3 : item.dueInDays != null && item.dueInDays <= 7 ? C.amberL : C.t3;
  const canDate = ['scholarships', 'deadlines', 'colleges', 'recommenders'].includes(item.resource);

  return (
    <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ ...glass2({ padding: 0, overflow: 'hidden' }), borderLeft: `3px solid ${c}` }}>
      <div style={{ ...R({ gap: 12, padding: '13px 14px', cursor: 'pointer', alignItems: 'flex-start' }) }} onClick={() => setOpen((o) => !o)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={R({ gap: 7, flexWrap: 'wrap' })}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{item.name}</span>
            <span style={pill(C.s3, C.t3, { fontSize: 9.5 })}>{item.kind}</span>
            {item.flags.includes('no-date') && <span style={pill(tint(C.amber, 0.14), C.amberL, { fontSize: 9.5 })}>No deadline</span>}
            {overdue && <span style={pill(tint(C.rose, 0.15), C.roseL, { fontSize: 9.5 })}>Date passed</span>}
            {item.flags.includes('stalled') && <span style={pill(tint(C.rose, 0.12), C.roseL, { fontSize: 9.5 })}>Stalled</span>}
          </div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 3 }}>
            {[item.sub, item.statusLabel].filter(Boolean).join(' · ')}
            {item.dueInDays != null && (
              <span style={{ color: dueColor, fontWeight: 600 }}>
                {' · '}{overdue ? `${Math.abs(item.dueInDays)} days overdue`
                  : past ? `date passed ${Math.abs(item.dueInDays)} days ago`
                    : item.dueInDays === 0 ? 'due today'
                      : `due in ${item.dueInDays} day${item.dueInDays === 1 ? '' : 's'}`}
              </span>
            )}
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} style={{ display: 'flex', color: C.t3, flexShrink: 0 }}><ChevronDown size={15} /></motion.div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.b1}`, paddingTop: 12 }}>
              <div style={{
                fontSize: 11.5, color: C.t2, lineHeight: 1.6, padding: '9px 11px', borderRadius: 9,
                background: tint(C.violet, 0.06), border: `1px solid ${tint(C.violet, 0.18)}`, display: 'flex', gap: 8,
              }}>
                <Brain size={12} color={C.violetL} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{item.nextStep}</span>
              </div>

              <div style={R({ gap: 8, marginTop: 10, flexWrap: 'wrap' })}>
                {canAdvance && (
                  <button onClick={onAdvance} disabled={busy} style={btnSm(tint(accent, 0.18), { color: onTint(accent), fontSize: 11 })}>
                    {busy ? <Loader2 size={11} className="spin" /> : <ArrowRight size={11} />}I did this — move it forward
                  </button>
                )}
                {canDate && (
                  <label style={R({ gap: 6, fontSize: 11, color: C.t3 })}>
                    <CalendarClock size={12} color={C.t3} />
                    <span>Deadline</span>
                    <input type="date" defaultValue={item.dueDate ? String(item.dueDate).slice(0, 10) : ''}
                      onChange={(e) => onSetDate(e.target.value)} aria-label={`Deadline for ${item.name}`}
                      style={inp({ width: 'auto', fontSize: 11.5, padding: '6px 9px' })} />
                  </label>
                )}
                <button onClick={onOpen} style={btnSm(C.s3, { color: C.t2, fontSize: 11 })}>See full details<ArrowRight size={11} /></button>
                {item.addedAt && (
                  <span style={{ marginLeft: 'auto', fontSize: 10.5, color: C.t4 }}>
                    Tracked {new Date(item.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {item.idleDays != null && item.idleDays > 0 ? ` · untouched ${item.idleDays}d` : ''}
                  </span>
                )}
              </div>

              {item.notes && (
                <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.6, marginTop: 10, whiteSpace: 'pre-wrap' }}>
                  {String(item.notes).slice(0, 420)}{String(item.notes).length > 420 ? '…' : ''}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────
const SNAPSHOT_KEY_FOR = { scholarships: 'scholarships', activities: 'activities', colleges: 'colleges', deadlines: 'deadlines', recommenders: 'recommenders' };

function applyPatches(snapshot, patches) {
  if (!snapshot || !Object.keys(patches).length) return snapshot;
  const next = { ...snapshot };
  for (const [key, patch] of Object.entries(patches)) {
    const [resource, idStr] = key.split(':');
    const listKey = SNAPSHOT_KEY_FOR[resource];
    if (!listKey) continue;
    const id = Number(idStr);
    next[listKey] = (next[listKey] || []).map((row) => (
      String(row.id) === String(id) ? { ...row, ...patch, updated_at: new Date().toISOString() } : row
    ));
  }
  return next;
}

function rawStatus(snapshot, item) {
  const listKey = SNAPSHOT_KEY_FOR[item.resource];
  const row = (snapshot?.[listKey] || []).find((r) => String(r.id) === String(item.id));
  return row?.status ?? null;
}

function readLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; }
}

/** Short stable hash of the tracked-state signature, so cache keys stay a sane length. */
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) { h = (h * 31 + str.charCodeAt(i)) | 0; }
  return String(h >>> 0);
}
