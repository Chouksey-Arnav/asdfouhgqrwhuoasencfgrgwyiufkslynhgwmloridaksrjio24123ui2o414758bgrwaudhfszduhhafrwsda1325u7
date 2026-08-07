import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Award, ClipboardList, FileDown, TrendingUp, TrendingDown, Minus,
  ShieldCheck, ShieldQuestion, Layers, Clock, GraduationCap, Sparkles, Target,
  AlertTriangle, Info, CheckCircle2, ChevronDown, School, Crown, Gauge, Loader2,
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { C, glass, glass2, btn, btnSm, btnG, inp, lbl, pill, R, CC, G, tint, accentFill } from '../lib/theme';
import { listItems, createItem, deleteItem } from '../lib/dataApi';
import { exportPortfolioResume } from '../lib/exportPDF';
import PanelHero, { SectionTitle, StatTile } from './ui/PanelHero';
import { showMedabrainToast, showMedabrainLine } from '../lib/medabrainComments';
import { resolveStudentScores } from '../lib/collegeRecommend';
import {
  scoreActivity, activityIssues, coachDraft, analyzeSlate, slateInsights, honorsInsights,
  reactToActivity, reactToAward, PILLARS,
} from '../lib/activityIntel';
import {
  analyzeAcademics, academicInsights, reactToGpa, recommendByAcademics, gpaBand, roleProfile,
} from '../lib/academicIntel';
import { CA_LIMITS } from '../lib/commonApp';
import MedabrainRead, { InsightList } from './portfolio/MedabrainRead';
import CommonAppExport from './portfolio/CommonAppExport';

// ─────────────────────────────────────────────────────────────────────────────
// Activities & Resume Builder.
//
// This panel used to be three forms, a chart, and a button that copied prose
// pretending to be the Common App format. Everything a student entered here
// went into a database row and stopped: the GPA drew a line, the activities
// stacked up, and nothing in the app read any of it back to them. The Portfolio
// had an AI that could see this data, but only if the student went and asked.
//
// It is now built on the same two-layer contract the college list uses:
//
//   COMPUTED (activityIntel.js / academicIntel.js / commonApp.js) — always
//   present, always right, no network. Entry scores, the six pillars of a
//   health-track application, the GPA trend, the real Common App field limits,
//   and college matches computed from the student's own transcript, score, and
//   the career they told us they want at signup.
//
//   READ (portfolioCritique.js, via MedabrainRead) — four on-demand deep reads
//   layered on top: the whole slate, one activity, the academic record, the
//   honors section. Each gets the student's real rows verbatim and a fixed
//   output contract, and each renders over the computed layer rather than
//   replacing it, so an outage degrades the panel instead of emptying it.
//
// The academic history is the spine. It is not a chart any more — it decides
// the college recommendations on this page, it feeds every Medabrain surface in
// the app, and it answers back the moment a GPA is saved.
// ─────────────────────────────────────────────────────────────────────────────

const ACT_TYPES = ['Clinical/Shadowing','Patient Care (paid)','Health Club/HOSA','Leadership','Volunteering','Research','Athletics','Arts & Performance','Work Experience','Clubs & Organizations','Other'];
// Every activity type gets its own color so the logged list reads as a
// varied, scannable portfolio instead of a monochrome stack.
const ACT_COLORS = {
  'Clinical/Shadowing': C.pink, 'Patient Care (paid)': C.rose, 'Health Club/HOSA': C.cyan,
  Leadership: C.blue, Volunteering: C.violet, Research: C.teal, Athletics: C.green,
  'Arts & Performance': C.fuchsia, 'Work Experience': C.orange, 'Clubs & Organizations': C.sky, Other: C.t3,
};
const GRADE_LEVELS = ['9','10','11','12','Post-graduate'];
const STATUSES = ['ongoing','completed'];
const CATEGORY_COLOR = { reach: C.rose, target: C.blue, safety: C.green };

function emptyActivity() {
  return { activity_type: ACT_TYPES[0], position: '', organization: '', description: '', impact: '', status: 'ongoing', hours_per_week: '', weeks_per_year: '', grade_levels: [], evidence_url: '', skills_tags: '', leadership_role: false };
}
function emptyGpa() {
  return { term: '', gpa: '', weighted: false, course_rigor: '' };
}
function emptyAward() {
  return { title: '', grade_level: '', level: '', issuing_organization: '', category: '', certificate_url: '' };
}

// The live coaching strip under the add forms — Medabrain reacting to what is
// being typed, before anything is saved. Deterministic and instant by design:
// a Groq call per keystroke would be slow, rate-limited, and worse than the
// arithmetic for the things it is checking.
function CoachStrip({ lines, label = 'Medabrain, while you type' }) {
  if (!lines.length) return null;
  const col = (l) => l === 'error' ? C.rose : l === 'warn' ? C.amber : l === 'good' ? C.green : C.violet;
  return (
    <div style={{ ...CC({ gap: 6 }), marginTop: 12 }}>
      <div style={R({ gap: 6, marginBottom: 1 })}>
        <Sparkles size={11} color={C.violetL} />
        <span style={{ fontSize: 9.5, fontWeight: 800, color: C.violetL, textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</span>
      </div>
      {lines.map((l, i) => {
        const c = col(l.level);
        return (
          <div key={i} style={{ ...R({ gap: 8, alignItems: 'flex-start', padding: '7px 10px' }), borderRadius: 8, background: tint(c, 0.07), border: `1px solid ${tint(c, 0.17)}` }}>
            <span style={{ width: 5, height: 5, borderRadius: 3, background: c, flexShrink: 0, marginTop: 6 }} />
            <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.5 }}>{l.text}</span>
          </div>
        );
      })}
    </div>
  );
}

// A character counter against a REAL Common App limit, shown on the fields that
// have one. Students consistently discover these limits after pasting into the
// live form and losing the end of a sentence; there is no reason they should
// meet them for the first time there.
function CharCap({ value, limit, note = null }) {
  const len = String(value || '').length;
  const over = len > limit;
  const near = !over && len > limit * 0.88;
  return (
    <span style={{ fontSize: 9.5, fontFamily: C.FM, color: over ? C.rose : near ? C.amber : C.t4, fontWeight: over ? 800 : 500, marginLeft: 7 }}>
      {len}/{limit}{over ? ` · ${len - limit} over the Common App limit` : note ? ` · ${note}` : ''}
    </span>
  );
}

// One logged activity: how much of it actually made it into the record, what is
// wrong with it, and a per-entry Medabrain read on demand.
function ActivityCard({ a, accent, user, gradeLabel, analysis, onRemove }) {
  const [open, setOpen] = useState(false);
  const tc = ACT_COLORS[a.activity_type] || C.blue;
  const s = useMemo(() => scoreActivity(a), [a]);
  const issues = useMemo(() => activityIssues(a), [a]);
  const bandColor = s.band.tone === 'good' ? C.green : s.band.tone === 'warn' ? C.amber : s.band.tone === 'critical' ? C.rose : C.blue;
  const errors = issues.filter(i => i.level === 'error').length;
  const warns = issues.filter(i => i.level === 'warn').length;

  return (
    <div style={{ ...glass2({ padding: 14 }), borderLeft: `3px solid ${tc}`, background: `linear-gradient(120deg,${tint(tc, 0.05)},rgba(255,255,255,0.02) 55%)` }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>
            {a.position} <span style={{ color: tc, fontWeight: 600 }}>· {a.activity_type}</span><span style={{ color: C.t3, fontWeight: 400 }}>{a.organization ? ` · ${a.organization}` : ''}</span>
            <span style={{ ...pill(a.status === 'ongoing' ? C.greenDim : C.blueDim, a.status === 'ongoing' ? C.greenL : C.blueL, { fontSize: 9, marginLeft: 8 }), textTransform: 'capitalize' }}>{a.status}</span>
            {a.leadership_role && <span style={pill(`${accent}20`, accent, { fontSize: 9, marginLeft: 6 })}><Crown size={9} style={{ marginRight: 3 }} />Leadership</span>}
            <VerificationBadge status={a.verification_status} />
          </div>
          {a.description && <div style={{ fontSize: 12, color: C.t2, marginTop: 3 }}>{a.description}</div>}
          {a.impact && <div style={{ fontSize: 12, color: accent, marginTop: 3, fontWeight: 600 }}>{a.impact}</div>}
          <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>
            {a.hours_per_week} hrs/wk · {a.weeks_per_year} wks/yr · <b style={{ color: C.t2, fontFamily: C.FM }}>≈{s.hoursPerYear}h/yr</b> · Grades {(a.grade_levels || []).join(', ') || '—'}
          </div>
          {(a.skills_tags || []).length > 0 && <div style={{ marginTop: 6, display: 'flex', gap: 5, flexWrap: 'wrap' }}>{a.skills_tags.map(sk => <span key={sk} style={pill('rgba(255,255,255,0.06)', C.t2, { fontSize: 9 })}>{sk}</span>)}</div>}
          {a.evidence_url && <a href={a.evidence_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: accent, marginTop: 4, display: 'inline-block' }}>View evidence →</a>}
        </div>
        <div style={{ ...CC({ gap: 6 }), alignItems: 'flex-end', flexShrink: 0 }}>
          <span style={pill(tint(bandColor, 0.14), bandColor, { fontSize: 9.5, fontWeight: 800, border: `1px solid ${tint(bandColor, 0.26)}` })}>{s.score}/100</span>
          <button style={btnSm(C.roseDim, { color: C.rose })} onClick={onRemove} aria-label="Delete activity"><Trash2 size={12} /></button>
        </div>
      </div>

      {/* How much of this entry actually made it onto the page — the bar is the
          record's completeness, not a judgment of the student's commitment. */}
      <div style={{ marginTop: 10 }}>
        <div style={R({ gap: 8, justifyContent: 'space-between', marginBottom: 4 })}>
          <span style={{ fontSize: 9.5, color: C.t4, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>{s.band.label}</span>
          <span style={{ fontSize: 9.5, color: C.t4 }}>
            {errors > 0 && <b style={{ color: C.rose }}>{errors} blocking</b>}{errors > 0 && warns > 0 && ' · '}{warns > 0 && <b style={{ color: C.amberL }}>{warns} to fix</b>}
            {errors === 0 && warns === 0 && <b style={{ color: C.greenL }}>nothing blocking</b>}
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ width: `${s.score}%`, height: '100%', background: bandColor, borderRadius: 3, transition: 'width .3s' }} />
        </div>
      </div>

      {issues.length > 0 && (
        <button type="button" onClick={() => setOpen(o => !o)}
          style={{ ...R({ gap: 6, marginTop: 10 }), background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.violetL, fontSize: 11, fontWeight: 700, fontFamily: C.FB }}>
          <Sparkles size={11} />{open ? 'Hide' : `What Medabrain would change (${issues.length})`}
          <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>
      )}

      {open && (
        <div style={{ ...CC({ gap: 9 }), marginTop: 10 }}>
          <div style={CC({ gap: 6 })}>
            {issues.map((iss, i) => {
              const c = iss.level === 'error' ? C.rose : iss.level === 'warn' ? C.amber : C.blue;
              const Icon = iss.level === 'tip' ? Info : AlertTriangle;
              return (
                <div key={i} style={{ ...R({ gap: 8, alignItems: 'flex-start', padding: '7px 10px' }), borderRadius: 8, background: tint(c, 0.06), border: `1px solid ${tint(c, 0.16)}` }}>
                  <Icon size={12} color={c} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.5 }}>{iss.text}</span>
                </div>
              );
            })}
          </div>
          <MedabrainRead
            kind="activity" compact
            title={`Medabrain on "${a.position}"`}
            runLabel="Read this entry line by line"
            idleHint="A close read of this one entry: what these exact words say to a reader, what belongs in the 150 characters the form gives you, and the one question you have not answered anywhere in it."
            args={{ user, gradeLabel, activity: a, analysis }}
          />
        </div>
      )}
    </div>
  );
}

export default function ActivitiesResumePanel({
  accent = C.blue, user = null, gradeLabel = null, isMobile = false,
  onResumeExported, onActivityLogged, onCollegeAdded,
}) {
  const [activities, setActivities] = useState([]);
  const [awards, setAwards] = useState([]);
  const [gpaEntries, setGpaEntries] = useState([]);
  const [testScores, setTestScores] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(emptyActivity());
  const [awardDraft, setAwardDraft] = useState(emptyAward());
  const [gpaDraft, setGpaDraft] = useState(emptyGpa());
  const [exportOpen, setExportOpen] = useState(false);
  const [gpaReaction, setGpaReaction] = useState(null);
  const [addingCollege, setAddingCollege] = useState(null);
  const [dismissedPicks, setDismissedPicks] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Test scores and the college list are read here (not just activities/
      // awards/GPA) because the academic matching on this page reasons over all
      // four: the GPA against admitted averages, the score against midpoints,
      // and the existing list so we never recommend a school they already have.
      const [a, w, g, ts, col] = await Promise.all([
        listItems('activities'), listItems('awards'), listItems('gpa_entries'),
        listItems('test_scores').catch(() => []), listItems('colleges').catch(() => []),
      ]);
      setActivities(a); setAwards(w); setGpaEntries(g); setTestScores(ts); setColleges(col);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // ── Derived intelligence ───────────────────────────────────────────────────
  const analysis = useMemo(() => analyzeSlate(activities, awards), [activities, awards]);
  const academics = useMemo(() => analyzeAcademics(gpaEntries), [gpaEntries]);
  const scores = useMemo(() => resolveStudentScores(testScores, user), [testScores, user]);
  const insights = useMemo(() => slateInsights(analysis, { gradeStage: user?.gradeStage }), [analysis, user?.gradeStage]);
  const acInsights = useMemo(() => academicInsights({ academics, scores, user, existing: colleges }), [academics, scores, user, colleges]);
  const hInsights = useMemo(() => honorsInsights(analysis), [analysis]);
  const picks = useMemo(
    () => recommendByAcademics({ academics, scores, user, existing: colleges }).filter(p => !dismissedPicks.includes(p.name)),
    [academics, scores, user, colleges, dismissedPicks]
  );
  const draftCoaching = useMemo(() => coachDraft(draft), [draft]);
  const profile = roleProfile(user?.dreamRole);

  async function addActivity() {
    if (!draft.position.trim()) return;
    if (Number(draft.hours_per_week) < 0 || Number(draft.weeks_per_year) < 0) { toast.error("Hours/weeks can't be negative."); return; }
    try {
      const row = await createItem('activities', {
        ...draft,
        hours_per_week: Number(draft.hours_per_week) || 0,
        weeks_per_year: Number(draft.weeks_per_year) || 0,
        sort_order: activities.length,
        evidence_url: draft.evidence_url.trim() || null,
        skills_tags: draft.skills_tags.split(',').map(s => s.trim()).filter(Boolean),
      });
      const next = [...activities, row];
      setActivities(next);
      setDraft(emptyActivity());
      // Computed from the row that was just saved, not picked at random — a
      // 400-hour leadership role and a two-hour club get different sentences.
      showMedabrainLine(reactToActivity(row, analyzeSlate(next, awards)));
      onActivityLogged?.();
    } catch (err) { toast.error(err.message); }
  }

  async function removeActivity(id) {
    if (!window.confirm('Delete this activity?')) return;
    setActivities(prev => prev.filter(a => a.id !== id));
    try { await deleteItem('activities', id); } catch (err) { toast.error(err.message); }
  }

  async function addAward() {
    if (!awardDraft.title.trim()) return;
    try {
      const row = await createItem('awards', {
        ...awardDraft, sort_order: awards.length,
        issuing_organization: awardDraft.issuing_organization.trim() || null,
        certificate_url: awardDraft.certificate_url.trim() || null,
      });
      const next = [...awards, row];
      setAwards(next);
      setAwardDraft(emptyAward());
      showMedabrainLine(reactToAward(row, analyzeSlate(activities, next)));
    } catch (err) { toast.error(err.message); }
  }

  async function removeAward(id) {
    if (!window.confirm('Delete this award?')) return;
    setAwards(prev => prev.filter(a => a.id !== id));
    try { await deleteItem('awards', id); } catch (err) { toast.error(err.message); }
  }

  async function addGpaEntry() {
    if (!gpaDraft.term.trim() || !gpaDraft.gpa) return;
    const gpaNum = Number(gpaDraft.gpa);
    // Weighted scales legitimately run past 4.3 (5.0 scales are common), so the
    // ceiling depends on which scale they said they are on. Rejecting a real
    // 4.6 weighted GPA as invalid was the old form telling a student their own
    // transcript was wrong.
    const ceiling = gpaDraft.weighted ? 6.0 : 4.3;
    if (gpaNum < 0 || gpaNum > ceiling) { toast.error(`GPA must be between 0 and ${ceiling} on ${gpaDraft.weighted ? 'a weighted' : 'an unweighted'} scale.`); return; }
    try {
      const row = await createItem('gpa_entries', { ...gpaDraft, gpa: gpaNum });
      const next = [...gpaEntries, row];
      setGpaEntries(next);
      setGpaDraft(emptyGpa());
      // THE moment this panel was rebuilt around: a real verdict on the number,
      // named schools matched to it and to the career they told us they want,
      // and — where it is earned — belief, said once and meant.
      const reaction = reactToGpa({ academics: analyzeAcademics(next), scores, user, existing: colleges });
      setGpaReaction(reaction);
      if (reaction) showMedabrainLine(reaction.headline, { duration: 7000 });
      else showMedabrainToast('gpa_added');
    } catch (err) { toast.error(err.message); }
  }

  async function removeGpaEntry(id) {
    if (!window.confirm('Delete this GPA entry?')) return;
    setGpaEntries(prev => prev.filter(g => g.id !== id));
    setGpaReaction(null);
    try { await deleteItem('gpa_entries', id); } catch (err) { toast.error(err.message); }
  }

  // Adding a matched school writes straight into the same `colleges` resource
  // the College List tab reads, already categorized — so the recommendation is
  // an action, not a suggestion the student has to re-enter somewhere else.
  async function addPick(pick) {
    setAddingCollege(pick.name);
    try {
      const row = await createItem('colleges', { name: pick.name, category: pick.category, status: 'researching' });
      setColleges(prev => [...prev, row]);
      showMedabrainLine(`${pick.name} added to your college list as a ${pick.category}. ${pick.reason.split(' · ')[0]}. Get its application deadline into Milestones while it is in front of you.`);
      onCollegeAdded?.();
    } catch (err) { toast.error(err.message); }
    finally { setAddingCollege(null); }
  }

  function toggleGrade(g) {
    setDraft(prev => ({ ...prev, grade_levels: prev.grade_levels.includes(g) ? prev.grade_levels.filter(x => x !== g) : [...prev.grade_levels, g] }));
  }

  function exportPdf() {
    exportPortfolioResume(null, activities, awards, gpaEntries);
    showMedabrainToast('resume_exported');
    onResumeExported?.();
  }

  const chartData = useMemo(() => ({
    labels: academics.entries.map(g => g.term),
    datasets: [{
      label: 'GPA',
      data: academics.entries.map(g => g.gpa),
      borderColor: accent,
      backgroundColor: `${accent}30`,
      tension: 0.35, fill: true, pointRadius: 4, pointBackgroundColor: accent,
    }],
  }), [academics.entries, accent]);

  const chartOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: academics.entries.some(e => Number(e.gpa) > 4.3) ? 5.0 : 4.3, ticks: { color: C.t3, stepSize: 0.5 }, grid: { color: C.b1 } },
      x: { ticks: { color: C.t3 }, grid: { display: false } },
    },
  }), [academics.entries]);

  const totalHours = analysis.totalHours;
  const band = academics.hasData ? gpaBand(academics.comparableGpa) : null;
  const TrendIcon = academics.trend === 'rising' ? TrendingUp : academics.trend === 'falling' ? TrendingDown : Minus;
  const hasAnything = activities.length > 0 || awards.length > 0 || gpaEntries.length > 0;

  return (
    <div style={CC({ gap: 22 })}>
      <PanelHero tourTag="portfolio-deep-resume" icon={Award} color={accent} color2={C.orange}
        eyebrow="Applications" title="Activities & Resume Builder"
        sub="Log every extracurricular, job, leadership role and honor with real hours and impact — then export it into the Common Application's actual fields, character limits and all. Your GPA history here drives the college matching and everything Medabrain knows about you."
        right={(activities.length > 0 || awards.length > 0) ? (
          <div style={R({ gap: 8, flexWrap: 'wrap' })}>
            <button style={btnG({ fontSize: 12 })} onClick={() => setExportOpen(true)}><ClipboardList size={13} />Export to Common App</button>
            <button style={{ ...btn(`linear-gradient(135deg,${accent},${C.orange})`, { fontSize: 12, boxShadow: `0 4px 14px ${tint(accent, 0.35)}` }), display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={exportPdf}><FileDown size={13} />Résumé PDF</button>
          </div>
        ) : undefined} />

      {hasAnything && (
        <div style={G(4, 12, {}, true)}>
          <StatTile icon={Layers} value={`${analysis.slotsUsed}/10`} label="Common App activity slots" sub={analysis.slotsFree > 0 ? `${analysis.slotsFree} still free` : 'full — ranked by weight'} color={C.blue} />
          <StatTile icon={Clock} value={`${totalHours.toLocaleString()}h`} label="Est. hours / year" sub={analysis.weeklyPeak ? `${analysis.weeklyPeak} hrs/week combined` : undefined} color={C.violet} />
          <StatTile icon={Award} value={`${analysis.awardCount}/5`} label="Honors slots" sub={analysis.unleveled ? `${analysis.unleveled} missing a level` : undefined} color={C.gold} />
          <StatTile icon={GraduationCap} value={academics.hasData ? academics.latestGpa : '—'} label={academics.hasData ? `GPA · ${band.label}` : 'No GPA yet'} sub={academics.hasData && academics.count > 1 ? `${academics.trend}${academics.delta ? ` (${academics.delta > 0 ? '+' : ''}${academics.delta})` : ''}` : undefined} color={C.green} />
        </div>
      )}

      {/* Coverage of the six pillars — the one view that shows a student what
          their application is actually missing rather than what it contains. */}
      {activities.length > 0 && (
        <div style={{ ...glass({ padding: 18 }), background: `linear-gradient(120deg,${tint(C.violet, 0.05)},rgba(255,255,255,0.02) 55%)`, border: `1px solid ${tint(C.violet, 0.16)}` }}>
          <div style={R({ justifyContent: 'space-between', marginBottom: 13, flexWrap: 'wrap', gap: 8 })}>
            <SectionTitle icon={Gauge} color={C.violetL} extra={{ marginBottom: 0 }}>What your application is made of</SectionTitle>
            <span style={pill(tint(C.violet, 0.14), C.violetL, { fontFamily: C.FM, fontSize: 11 })}>{analysis.coverageScore}% covered</span>
          </div>
          <div style={G(3, 9, {}, true)}>
            {PILLARS.map(p => {
              const has = analysis.covered.includes(p.id);
              const c = has ? C.green : p.id === 'clinical' ? C.rose : C.amber;
              return (
                <div key={p.id} style={{ ...R({ gap: 9, alignItems: 'flex-start', padding: '10px 12px' }), borderRadius: 10, background: tint(c, has ? 0.06 : 0.05), border: `1px solid ${tint(c, has ? 0.18 : 0.14)}` }}>
                  {has ? <CheckCircle2 size={13} color={c} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertTriangle size={13} color={c} style={{ flexShrink: 0, marginTop: 1 }} />}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: has ? C.t1 : c }}>{p.label}</div>
                    <div style={{ fontSize: 10.5, color: C.t3, marginTop: 2, lineHeight: 1.45 }}>{has ? p.why : 'Nothing logged here yet.'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Academic History ──────────────────────────────────────────────────
          The spine of the panel. Everything entered here decides the college
          matches below it and is handed to every Medabrain surface in the app. */}
      <div style={{ ...glass({ padding: 18 }), background: `linear-gradient(120deg,${tint(C.green, 0.05)},rgba(255,255,255,0.02) 55%)`, border: `1px solid ${tint(C.green, 0.18)}` }}>
        <div style={R({ justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 })}>
          <SectionTitle icon={TrendingUp} color={C.greenL} extra={{ marginBottom: 0 }}>Academic History</SectionTitle>
          {academics.hasData && (
            <div style={R({ gap: 7, flexWrap: 'wrap' })}>
              <span style={pill(tint(C.green, 0.15), C.greenL, { fontFamily: C.FM })}>{academics.latestGpa}{academics.latestWeighted ? ' weighted' : ''}</span>
              {academics.latestWeighted && <span style={pill(tint(C.blue, 0.13), C.blueL, { fontFamily: C.FM })}>≈ {academics.comparableGpa} unweighted</span>}
              {academics.count > 1 && (
                <span style={pill(tint(academics.trend === 'rising' ? C.green : academics.trend === 'falling' ? C.rose : C.blue, 0.13), academics.trend === 'rising' ? C.greenL : academics.trend === 'falling' ? C.roseL : C.blueL)}>
                  <TrendIcon size={10} style={{ marginRight: 3 }} />{academics.trend}
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.6, marginBottom: 14 }}>
          This is the number admissions offices weight most heavily, and here it actually does something: every term you log re-decides the college matches on this page and goes straight to Medabrain, so it reasons about your list from your real transcript instead of a guess.
        </div>

        {academics.count > 1 && (
          <div style={{ height: 180, marginBottom: 18 }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        )}

        <div style={G(4, 10, {}, true)}>
          <div><label style={lbl()}>Term</label><input style={inp()} placeholder="e.g. Grade 11, Fall" value={gpaDraft.term} onChange={e => setGpaDraft({ ...gpaDraft, term: e.target.value })} /></div>
          <div>
            {/* No character counter here — GPA is a number, not one of the Common App's capped
                text fields. What matters is which scale it is on, because that decides what it
                gets compared against. */}
            <label style={lbl()}>GPA <span style={{ fontSize: 9.5, color: C.t4, fontFamily: C.FM }}>· {gpaDraft.weighted ? 'weighted scale (0–6.0)' : 'unweighted scale (0–4.3)'}</span></label>
            <input type="number" step="0.01" min="0" max={gpaDraft.weighted ? 6 : 4.3} style={inp()} placeholder={gpaDraft.weighted ? '4.42' : '3.85'} value={gpaDraft.gpa} onChange={e => setGpaDraft({ ...gpaDraft, gpa: e.target.value })} />
          </div>
          <div><label style={lbl()}>Course rigor (matters a lot)</label><input style={inp()} placeholder="e.g. 4 AP classes, 2 honors" value={gpaDraft.course_rigor} onChange={e => setGpaDraft({ ...gpaDraft, course_rigor: e.target.value })} /></div>
          <div>
            <label style={lbl()}>Scale</label>
            <button type="button" style={btnSm(gpaDraft.weighted ? accentFill(accent) : C.s3, { color: gpaDraft.weighted ? C.onAccent : C.t1, width: '100%' })} onClick={() => setGpaDraft({ ...gpaDraft, weighted: !gpaDraft.weighted })}>{gpaDraft.weighted ? 'Weighted' : 'Unweighted'}</button>
          </div>
        </div>
        {gpaDraft.gpa && !gpaDraft.course_rigor && (
          <CoachStrip label="Medabrain" lines={[{ level: 'tip', text: 'Add the course rigor. A 3.8 with five APs and a 3.8 with none are different applications, and rigor is the only field that tells them apart — it also gets handed to Medabrain when it reasons about your college list.' }]} />
        )}
        <button style={{ ...btn(accent !== C.blue ? accent : C.blueGrad), marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }} onClick={addGpaEntry}><TrendingUp size={14} />Add GPA Entry</button>

        {/* The reaction to the number they just entered. */}
        {gpaReaction && (
          <div style={{ ...glass2({ padding: 16 }), marginTop: 16, border: `1px solid ${tint(gpaReaction.tone === 'critical' ? C.rose : gpaReaction.tone === 'warn' ? C.amber : C.green, 0.3)}`, background: `linear-gradient(120deg,${tint(C.violet, 0.08)},rgba(255,255,255,0.02) 60%)` }}>
            <div style={R({ gap: 8, marginBottom: 9 })}>
              <Sparkles size={13} color={C.violetL} />
              <span style={{ fontSize: 10.5, fontWeight: 800, color: C.violetL, textTransform: 'uppercase', letterSpacing: '.07em' }}>Medabrain on your GPA</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, lineHeight: 1.5, marginBottom: 8 }}>{gpaReaction.headline}</div>
            <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.65 }}>{gpaReaction.verdict}</div>
            {gpaReaction.trend && <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.65, marginTop: 9 }}>{gpaReaction.trend}</div>}
            {gpaReaction.context && <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.6, marginTop: 9 }}>{gpaReaction.context}</div>}
            {gpaReaction.picks.length > 0 && (
              <div style={{ marginTop: 13 }}>
                <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6, marginBottom: 9 }}>{gpaReaction.careerLine}</div>
                <div style={CC({ gap: 7 })}>
                  {gpaReaction.picks.map(p => (
                    <div key={p.name} style={{ ...R({ gap: 9, alignItems: 'flex-start', padding: '9px 12px' }), borderRadius: 9, background: tint(CATEGORY_COLOR[p.category] || C.blue, 0.06), border: `1px solid ${tint(CATEGORY_COLOR[p.category] || C.blue, 0.2)}` }}>
                      <School size={13} color={CATEGORY_COLOR[p.category] || C.blue} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={R({ gap: 7, flexWrap: 'wrap' })}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{p.name}</span>
                          <span style={pill(tint(CATEGORY_COLOR[p.category] || C.blue, 0.16), CATEGORY_COLOR[p.category] || C.blue, { fontSize: 9.5, textTransform: 'capitalize' })}>{p.category}</span>
                          <span style={pill(tint(C.violet, 0.13), C.violetL, { fontSize: 9.5 })}>{p.fit}% fit</span>
                        </div>
                        <div style={{ fontSize: 11, color: C.t3, marginTop: 3, lineHeight: 1.5 }}>{p.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {gpaReaction.belief && (
              <div style={{ fontSize: 12.5, color: C.t1, lineHeight: 1.65, marginTop: 13, paddingLeft: 11, borderLeft: `3px solid ${C.violetL}` }}>{gpaReaction.belief}</div>
            )}
            <div style={R({ gap: 8, marginTop: 13, flexWrap: 'wrap' })}>
              <button style={btnSm(C.s3, { fontSize: 11.5 })} onClick={() => setGpaReaction(null)}>Dismiss</button>
              <span style={{ fontSize: 10.5, color: C.t4, alignSelf: 'center' }}>The full matched slate is below, with an Add button on each.</span>
            </div>
          </div>
        )}

        {!loading && academics.count > 0 && (
          <div style={{ ...CC({ gap: 8 }), marginTop: 16 }}>
            {academics.entries.map((g, i) => {
              const prev = i > 0 ? Number(academics.entries[i - 1].gpa) : null;
              const d = prev != null ? Math.round((Number(g.gpa) - prev) * 100) / 100 : null;
              return (
                <div key={g.id} style={{ ...glass2({ padding: 12 }), display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{g.term}</span>
                    <span style={{ fontSize: 12, color: C.t3, marginLeft: 8, fontFamily: C.FM }}>GPA {g.gpa}{g.weighted ? ' (weighted)' : ''}{g.course_rigor ? ` · ${g.course_rigor}` : ''}</span>
                    {d != null && d !== 0 && (
                      <span style={{ fontSize: 11, marginLeft: 8, fontFamily: C.FM, fontWeight: 700, color: d > 0 ? C.greenL : C.roseL }}>{d > 0 ? '+' : ''}{d}</span>
                    )}
                  </div>
                  <button style={btnSm(C.roseDim, { color: C.rose })} onClick={() => removeGpaEntry(g.id)} aria-label="Delete GPA entry"><Trash2 size={12} /></button>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <MedabrainRead
            kind="academics"
            title="Medabrain on your academic record"
            runLabel="Read my transcript and tell me where I stand"
            idleHint="A full read of your GPA history against real admitted-student averages: what this record opens, whether your GPA or your test score is the binding constraint, which schools to apply to first, and the one academic move that would change the most from here."
            fallback={<InsightList insights={acInsights} max={5} />}
            disabled={!academics.hasData}
            disabledHint="Log a GPA term above and Medabrain will read your academic record against real admitted-student averages."
            args={{ user, gradeLabel, gpaEntries, scores, colleges, activities }}
          />
        </div>
      </div>

      {/* ── Colleges matched to the academic record ───────────────────────────
          The payoff for entering a transcript. Matched on GPA against admitted
          averages, on score against midpoints, and on the career the student
          named at signup — so two students with identical numbers and different
          goals get different slates. */}
      <div style={{ ...glass({ padding: 18 }), background: `linear-gradient(120deg,${tint(C.violet, 0.06)},rgba(255,255,255,0.02) 55%)`, border: `1px solid ${tint(C.violet, 0.2)}` }}>
        <SectionTitle icon={Target} color={C.violetL}>Colleges matched to your academic record</SectionTitle>
        {!academics.hasData && !scores.hasScore ? (
          <div style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.6 }}>
            Nothing to match on yet. Add a GPA term above (or log a real SAT/ACT in the Score Tracker) and this fills with U.S. schools picked from your actual numbers and the career you told us you want — each one addable to your college list in a tap, already categorized.
          </div>
        ) : (
          <>
            <div style={R({ gap: 8, flexWrap: 'wrap', marginBottom: 13 })}>
              {academics.hasData && <span style={pill(tint(C.green, 0.14), C.greenL, { fontFamily: C.FM })}>GPA {academics.comparableGpa} unweighted</span>}
              {scores.hasScore && <span style={pill(tint(C.blue, 0.14), C.blueL, { fontFamily: C.FM })}>SAT {scores.effectiveSat} effective</span>}
              <span style={pill(tint(C.violet, 0.13), C.violetL)}>Aiming at {profile.label}</span>
              <span style={{ fontSize: 10.5, color: C.t4, alignSelf: 'center', lineHeight: 1.5 }}>
                {!scores.hasScore ? 'Matching on GPA alone — a logged test score sharpens every result.' : !academics.hasData ? 'Matching on test score alone — add a GPA term and these re-rank.' : 'Matched on both, with the stricter of the two deciding each category.'}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.6, marginBottom: 14 }}>
              For {profile.label}, {profile.note}. That is weighted into every fit score below, not just the numbers.
            </div>
            {picks.length === 0 ? (
              <div style={R({ gap: 8, fontSize: 12.5, color: C.t3 })}>
                <Info size={13} />Every school we'd match to your record is already on your college list.
                {dismissedPicks.length > 0 && <button style={btnSm(C.s4, { marginLeft: 4 })} onClick={() => setDismissedPicks([])}>Show passed-on schools</button>}
              </div>
            ) : (
              <div style={CC({ gap: 9 })}>
                {picks.map(p => {
                  const cc = CATEGORY_COLOR[p.category] || C.blue;
                  const busy = addingCollege === p.name;
                  return (
                    <div key={p.name} style={{ ...glass2({ padding: 13 }), borderLeft: `3px solid ${cc}`, background: `linear-gradient(120deg,${tint(cc, 0.05)},rgba(255,255,255,0.02) 50%)` }}>
                      <div style={R({ gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' })}>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={R({ gap: 7, flexWrap: 'wrap' })}>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{p.name}</span>
                            <span style={pill(tint(cc, 0.16), cc, { textTransform: 'capitalize' })}>{p.category}</span>
                            <span style={pill(tint(C.violet, 0.13), C.violetL)}>{p.fit}% fit</span>
                            {p.school.bsmd && <span style={pill(tint(C.green, 0.14), C.greenL)}>BS/MD</span>}
                            {p.driver === 'gpa' && <span style={pill(tint(C.amber, 0.13), C.amberL)}>GPA decides this</span>}
                            {p.driver === 'score' && <span style={pill(tint(C.amber, 0.13), C.amberL)}>Score decides this</span>}
                          </div>
                          <div style={{ fontSize: 11, color: C.t3, marginTop: 5, fontFamily: C.FM }}>
                            {p.school.state} · {p.school.type} · admitted GPA {p.school.gpa} · SAT {p.school.sat} · ACT {p.school.act} · {p.school.accept}% admit · strong in {p.school.specialtyStrong}
                          </div>
                          <div style={{ fontSize: 11.5, color: C.t3, marginTop: 6, lineHeight: 1.55 }}>{p.reason}</div>
                        </div>
                        <div style={R({ gap: 6, flexShrink: 0 })}>
                          <button style={btn(accent !== C.blue ? accent : C.blueGrad, { fontSize: 12, padding: '7px 12px' })} disabled={busy} onClick={() => addPick(p)}>
                            {busy ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}Add
                          </button>
                          <button style={btnSm(C.s4)} title="Not interested" onClick={() => setDismissedPicks(prev => [...prev, p.name])}>Pass</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add an activity ───────────────────────────────────────────────── */}
      <div style={{ ...glass({ padding: 18 }), background: `linear-gradient(120deg,${tint(accent, 0.06)},rgba(255,255,255,0.02) 55%)`, border: `1px solid ${tint(accent, 0.2)}` }}>
        <SectionTitle icon={Plus} color={accent}>Add an activity</SectionTitle>
        <div style={G(2, 10, {}, true)}>
          <div>
            <label style={lbl()}>Type</label>
            <select style={inp()} value={draft.activity_type} onChange={e => setDraft({ ...draft, activity_type: e.target.value })}>
              {ACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl()}>Position / Leadership<CharCap value={draft.position} limit={CA_LIMITS.position} /></label>
            <input style={inp()} value={draft.position} onChange={e => setDraft({ ...draft, position: e.target.value })} placeholder="e.g. Team Captain" />
          </div>
        </div>
        <div style={G(2, 10, { marginTop: 10 }, true)}>
          <div>
            <label style={lbl()}>Organization<CharCap value={draft.organization} limit={CA_LIMITS.organization} /></label>
            <input style={inp()} value={draft.organization} onChange={e => setDraft({ ...draft, organization: e.target.value })} placeholder="e.g. Lincoln High School Debate Club" />
          </div>
          <div>
            <label style={lbl()}>Status</label>
            <div style={R({ gap: 6 })}>
              {STATUSES.map(s => (
                <button key={s} type="button" style={btnSm(draft.status === s ? accentFill(accent) : C.s3, { color: draft.status === s ? C.onAccent : C.t1, flex: 1, textTransform: 'capitalize' })} onClick={() => setDraft({ ...draft, status: s })}>{s}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={lbl()}>Description<CharCap value={draft.description} limit={CA_LIMITS.description} note="shares one 150-char Common App field with your impact line" /></label>
          <textarea style={{ ...inp(), minHeight: 60, resize: 'vertical' }} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="What did you actually do? Lead with the verb — ran, built, trained, raised, taught." />
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={lbl()}>Impact / results</label>
          <textarea style={{ ...inp(), minHeight: 44, resize: 'vertical' }} value={draft.impact} onChange={e => setDraft({ ...draft, impact: e.target.value })} placeholder="What changed because you were there? e.g. Grew membership from 12 to 40 students" />
        </div>
        <div style={G(2, 10, { marginTop: 10 }, true)}>
          <div><label style={lbl()}>Hours / week</label><input type="number" min="0" style={inp()} value={draft.hours_per_week} onChange={e => setDraft({ ...draft, hours_per_week: e.target.value })} /></div>
          <div><label style={lbl()}>Weeks / year</label><input type="number" min="0" style={inp()} value={draft.weeks_per_year} onChange={e => setDraft({ ...draft, weeks_per_year: e.target.value })} /></div>
        </div>
        {(Number(draft.hours_per_week) > 0 && Number(draft.weeks_per_year) > 0) && (
          <div style={{ fontSize: 11, color: C.t3, marginTop: 6, fontFamily: C.FM }}>
            ≈ {Math.round(Number(draft.hours_per_week) * Number(draft.weeks_per_year))} hours a year · {Number(draft.weeks_per_year) >= 40 ? 'All year' : Number(draft.weeks_per_year) <= 14 ? 'School break' : 'School year'} on the Common App's timing field
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <label style={lbl()}>Grade levels involved</label>
          <div style={R({ gap: 6, flexWrap: 'wrap' })}>
            {GRADE_LEVELS.map(g => (
              <button key={g} type="button" onClick={() => toggleGrade(g)} style={btnSm(draft.grade_levels.includes(g) ? accentFill(accent) : C.s3, { color: draft.grade_levels.includes(g) ? C.onAccent : C.t1 })}>{g}</button>
            ))}
          </div>
        </div>
        <div style={G(2, 10, { marginTop: 10 }, true)}>
          <div><label style={lbl()}>Skills gained (comma-separated, optional)</label><input style={inp()} value={draft.skills_tags} onChange={e => setDraft({ ...draft, skills_tags: e.target.value })} placeholder="e.g. public speaking, triage, teamwork" /></div>
          <div><label style={lbl()}>Evidence link (optional)</label><input style={inp()} value={draft.evidence_url} onChange={e => setDraft({ ...draft, evidence_url: e.target.value })} placeholder="Certificate, article, photo…" /></div>
        </div>
        <div style={{ marginTop: 10 }}>
          <button type="button" style={btnSm(draft.leadership_role ? accentFill(accent) : C.s3, { color: draft.leadership_role ? C.onAccent : C.t1 })} onClick={() => setDraft({ ...draft, leadership_role: !draft.leadership_role })}>{draft.leadership_role ? 'Leadership role ✓' : 'Mark as a leadership role'}</button>
        </div>

        <CoachStrip lines={draftCoaching} />

        <button style={{ ...btn(accent !== C.blue ? accent : C.blueGrad), marginTop: 14 }} onClick={addActivity}><Plus size={14} />Add Activity</button>
      </div>

      {/* ── The slate ─────────────────────────────────────────────────────── */}
      {!loading && activities.length > 0 && (
        <div style={CC({ gap: 12 })}>
          <div style={R({ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 })}>
            <SectionTitle icon={Layers} color={accent} extra={{ marginBottom: 0 }}>My Activities ({activities.length})</SectionTitle>
            <span style={{ fontSize: 10.5, color: C.t4 }}>Scored on how much of each activity actually made it into the record</span>
          </div>

          <MedabrainRead
            kind="slate"
            title="Medabrain on your whole activities list"
            runLabel="Read my whole list as an admissions officer would"
            idleHint="A read of the list as one application, not eleven rows: what forty seconds of it communicates, your strongest and weakest entries with the words you actually wrote, a slot-by-slot pass, and the one gap worth closing next."
            fallback={<InsightList insights={insights} max={6} />}
            args={{ user, gradeLabel, activities, awards, analysis, colleges }}
          />

          {activities.map(a => (
            <ActivityCard key={a.id} a={a} accent={accent} user={user} gradeLabel={gradeLabel} analysis={analysis} onRemove={() => removeActivity(a.id)} />
          ))}
        </div>
      )}

      {!loading && activities.length === 0 && (
        <div style={{ ...glass2({ padding: 16 }), border: `1px solid ${tint(C.violet, 0.2)}` }}>
          <InsightList insights={insights} />
        </div>
      )}

      {/* ── Honors ────────────────────────────────────────────────────────── */}
      <div style={{ ...glass({ padding: 18 }), background: `linear-gradient(120deg,${tint(C.gold, 0.06)},rgba(255,255,255,0.02) 55%)`, border: `1px solid ${tint(C.gold, 0.2)}` }}>
        <div style={R({ justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 })}>
          <SectionTitle icon={Award} color={C.goldL} extra={{ marginBottom: 0 }}>Add an honor or award</SectionTitle>
          <span style={pill(tint(C.gold, 0.13), C.goldL, { fontFamily: C.FM })}>{awards.length}/{CA_LIMITS.maxHonors} Common App slots</span>
        </div>
        <div style={G(3, 10, {}, true)}>
          <div>
            <label style={lbl()}>Award title<CharCap value={awardDraft.title} limit={CA_LIMITS.honorTitle} /></label>
            <input style={inp()} placeholder="e.g. National Merit Semifinalist" value={awardDraft.title} onChange={e => setAwardDraft({ ...awardDraft, title: e.target.value })} />
          </div>
          <div>
            <label style={lbl()}>Grade level</label>
            <select style={inp()} value={awardDraft.grade_level} onChange={e => setAwardDraft({ ...awardDraft, grade_level: e.target.value })}>
              <option value="">Grade level</option>
              {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl()}>Recognition level</label>
            <select style={inp()} value={awardDraft.level} onChange={e => setAwardDraft({ ...awardDraft, level: e.target.value })}>
              <option value="">Recognition level</option>
              <option>School</option><option>State/Regional</option><option>National</option><option>International</option>
            </select>
          </div>
        </div>
        <div style={G(2, 10, { marginTop: 10 }, true)}>
          <input style={inp()} placeholder="Issuing organization (optional)" value={awardDraft.issuing_organization} onChange={e => setAwardDraft({ ...awardDraft, issuing_organization: e.target.value })} />
          <input style={inp()} placeholder="Certificate link (optional)" value={awardDraft.certificate_url} onChange={e => setAwardDraft({ ...awardDraft, certificate_url: e.target.value })} />
        </div>
        {awardDraft.title && !awardDraft.level && (
          <CoachStrip label="Medabrain" lines={[{ level: 'warn', text: 'Set the level of recognition. It is a required field on the form and it is most of what the honor communicates — "Science Award" and "Science Award, National" are different lines to a reader.' }]} />
        )}
        <button style={{ ...btn(accent !== C.blue ? accent : C.blueGrad), marginTop: 14 }} onClick={addAward}><Plus size={14} />Add Award</button>
      </div>

      {!loading && (
        <div style={CC({ gap: 9 })}>
          <MedabrainRead
            kind="honors"
            title="Medabrain on your honors section"
            runLabel="Read my honors section"
            idleHint="How your five slots should be ordered, which honors your own activities suggest you may already hold and simply have not logged, and one recognition worth going after next."
            fallback={<InsightList insights={hInsights} max={4} />}
            disabled={awards.length === 0 && activities.length === 0}
            disabledHint="Log an honor or an activity and Medabrain will read this section."
            args={{ user, gradeLabel, awards, activities, analysis }}
          />
          {awards.length > 0 && awards.map(a => (
            <div key={a.id} style={{ ...glass2({ padding: 12 }), display: 'flex', alignItems: 'center', gap: 12, borderLeft: `3px solid ${C.gold}`, background: `linear-gradient(120deg,${tint(C.gold, 0.05)},rgba(255,255,255,0.02) 55%)` }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: tint(C.gold, 0.13), border: `1px solid ${tint(C.gold, 0.25)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Award size={14} color={C.goldL} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{a.title}</span>
                <span style={{ fontSize: 11, color: C.t3, marginLeft: 8 }}>{[a.level, a.grade_level && `Grade ${a.grade_level}`, a.issuing_organization].filter(Boolean).join(' · ')}</span>
                {!a.level && <span style={pill(C.amberDim, C.amberL, { fontSize: 9, marginLeft: 6 })}>No level set</span>}
                {a.certificate_url && <a href={a.certificate_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: accent, marginLeft: 8 }}>View certificate →</a>}
              </div>
              <VerificationBadge status={a.verification_status} />
              <button style={btnSm(C.roseDim, { color: C.rose })} onClick={() => removeAward(a.id)} aria-label="Delete award"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}

      <CommonAppExport
        open={exportOpen} onClose={() => setExportOpen(false)}
        activities={activities} awards={awards}
        studentName={user?.name || null} isMobile={isMobile}
        onExportPdf={exportPdf}
      />
    </div>
  );
}

function VerificationBadge({ status }) {
  if (status === 'verified') return <span style={pill(C.greenDim, C.greenL, { fontSize: 9, marginLeft: 6 })}><ShieldCheck size={9} style={{ marginRight: 3 }} />Verified</span>;
  if (status === 'pending') return <span style={pill(C.amberDim, C.amberL, { fontSize: 9, marginLeft: 6 })}><ShieldQuestion size={9} style={{ marginRight: 3 }} />Pending</span>;
  return null; // self_reported is the default state — no badge needed for the common case
}
