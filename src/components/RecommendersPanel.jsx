import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, UserCheck, Users, Mail, CheckCircle2, AlertTriangle, Clock, ClipboardCopy,
  Check, ChevronDown, ChevronUp, Link2, BookOpen, School, Info,
} from 'lucide-react';
import { C, glass, glass2, btn, btnSm, inp, lbl, R, CC, G, pill, tint, autoGrid } from '../lib/theme';
import { listItems, createItem, updateItem, deleteItem } from '../lib/dataApi';
import PanelHero, { SectionTitle, StatTile } from './ui/PanelHero';
import Disclosure from './ui/Disclosure';
import { showMedabrainToast } from '../lib/medabrainComments';
import {
  RECOMMENDER_ROLES, ROLE_LABELS, roleFromRelationship, leadTimeStatus, needsAttention,
  emailTemplates, hoursForRecommender, lettersPolicySummary,
  MIN_LEAD_DAYS, IDEAL_LEAD_DAYS, STATUSES,
} from '../lib/recommenders';
import { trackedCombinedPrograms } from '../lib/programEssayPrompts';
import { programLabel } from '../lib/combinedDegree';

// ─────────────────────────────────────────────────────────────────────────────
// Letters of recommendation — rebuilt around the reason students get this wrong.
//
// This panel used to be a list with a status pill. It tracked the ask perfectly
// well and did nothing about the only failure that actually happens, which is
// that the ask is made far too late because it is frightening. Most teenagers
// have never asked a professional adult for anything, and a blank email to a
// physician is a genuinely intimidating object. So they wait, and a letter that
// would have been specific and warm at six weeks' notice becomes four generic
// sentences at eleven days.
//
// Three changes address that, and they are the whole panel:
//
//   1. THE ROLES ARE THE ONES THIS STUDENT ACTUALLY HAS. A shadowing physician,
//      a research mentor, a volunteer coordinator, a clinical supervisor — not
//      just teacher/counselor/coach, which is the list for a general college
//      application and misses everyone who has watched them do the thing they
//      are applying to do.
//   2. THE EMAIL IS ALREADY WRITTEN, with their own logged hours inside it.
//      They read it, change the one sentence that has to be theirs, and send.
//   3. THE LEAD TIME IS ENFORCED AS A NUDGE. Under a month and the panel says
//      so, at the top, before anything else.
//
// And one honesty feature: per tracked program, whether letters are used at
// all. Chasing a physician for a letter a program will never read is a real
// cost paid by real students, and the catalog knows which programs those are.
//
// The lead-time arithmetic, the email text and the hours matching all live in
// src/lib/recommenders.js as pure functions, tested by
// scripts/verifyRecommenders.mjs. Nothing here computes a date.
// ─────────────────────────────────────────────────────────────────────────────

const statusColor = (status) => ({ 'Planning to ask': C.t3, Asked: C.amberL, Confirmed: C.blueL, Submitted: C.greenL }[status]);
const LEVEL_COLOR = { overdue: C.rose, urgent: C.rose, tight: C.amber, waiting: C.blue, ok: C.green, done: C.green, unknown: C.t3 };

export default function RecommendersPanel({ accent = C.blue, onChange, user = null, snapshot = null, gradeLabel = null }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState(ROLE_LABELS[0]);
  const [type, setType] = useState('individual');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [openId, setOpenId] = useState(null);

  // The Portfolio snapshot backs the hours linkage. It is passed in when the
  // caller already has one (Portfolio fetches it once for every panel — see
  // src/lib/portfolioData.js); when it isn't, this panel fetches only the three
  // resources it needs rather than pulling the whole snapshot again.
  const [logs, setLogs] = useState({ clinicalHours: [], research: [], activities: [] });
  const [colleges, setColleges] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setEntries(await listItems('recommenders')); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let live = true;
    if (snapshot) {
      setLogs({
        clinicalHours: snapshot.clinicalHours || [],
        research: snapshot.research || [],
        activities: snapshot.activities || [],
      });
      setColleges(snapshot.colleges || []);
      return () => { live = false; };
    }
    // A failed log fetch degrades to "no hours found under that name", which is
    // an honest state the email generator already handles — it must never stop
    // the tracker itself from rendering.
    Promise.all([
      listItems('clinical_hours').catch(() => []),
      listItems('research_experience').catch(() => []),
      listItems('activities').catch(() => []),
      listItems('colleges').catch(() => []),
    ]).then(([clinicalHours, research, activities, cols]) => {
      if (!live) return;
      setLogs({ clinicalHours, research, activities });
      setColleges(cols);
    });
    return () => { live = false; };
  }, [snapshot]);

  const attention = useMemo(() => needsAttention(entries), [entries]);
  const letterPolicy = useMemo(() => {
    const tracked = trackedCombinedPrograms(colleges).map(t => t.program);
    return lettersPolicySummary(tracked);
  }, [colleges]);

  async function addEntry(e) {
    e?.preventDefault();
    if (!name.trim()) { toast.error('Recommender name is required.'); return; }
    try {
      const row = await createItem('recommenders', {
        name: name.trim(), relationship, type, status: STATUSES[0],
        due_date: dueDate || null, notes: notes.trim() || null,
      });
      setEntries(prev => [row, ...prev]);
      setName(''); setDueDate(''); setNotes('');
      setOpenId(row.id);
      showMedabrainToast('recommender_added', { name: row.name });
      onChange?.();
    } catch (err) { toast.error(err.message); }
  }

  async function patch(id, changes) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...changes } : e));
    try { await updateItem('recommenders', id, changes); } catch (err) { toast.error(err.message); }
  }

  /**
   * Advancing to "Asked" stamps the date, because that stamp is what the
   * follow-up nudge counts from — and a student who advances the status and is
   * then asked to enter a date separately will not enter the date.
   */
  async function cycleStatus(entry) {
    const idx = STATUSES.indexOf(entry.status);
    const status = STATUSES[(idx + 1) % STATUSES.length];
    const changes = { status };
    if (status === 'Asked' && !entry.asked_at) changes.asked_at = new Date().toISOString().slice(0, 10);
    await patch(entry.id, changes);
  }

  async function removeEntry(id) {
    if (!window.confirm('Remove this recommender?')) return;
    setEntries(prev => prev.filter(e => e.id !== id));
    try { await deleteItem('recommenders', id); onChange?.(); } catch (err) { toast.error(err.message); }
  }

  const individuals = entries.filter(e => e.type === 'individual');
  const committee = entries.filter(e => e.type === 'committee');
  const confirmedOrIn = entries.filter(e => ['Confirmed', 'Submitted'].includes(e.status)).length;
  const submitted = entries.filter(e => e.status === 'Submitted').length;

  const rowProps = {
    accent, logs, openId, setOpenId,
    onCycle: cycleStatus, onRemove: removeEntry, onPatch: patch,
    studentName: user?.name || null, gradeLabel,
  };

  return (
    <div style={CC({ gap: 20 })}>
      <PanelHero tourTag="portfolio-deep-recommenders" icon={UserCheck} color={accent} color2={C.violet}
        eyebrow="Portfolio" title="Letters of Recommendation"
        sub="Who's writing for you, how to ask them, and how much notice they're getting. Most applications need 2–3."
        stats={entries.length > 0 ? [{ value: entries.length, label: 'tracked' }] : []} />

      {/* ── The nudge, above everything ─────────────────────────────────────
          A lead-time warning under the list is a lead-time warning nobody
          reads. This is the one thing on the page that changes an outcome. */}
      {attention.length > 0 && (
        <div style={{
          ...glass({ padding: 16 }),
          background: `linear-gradient(120deg,${tint(C.rose, 0.07)},rgba(255,255,255,0.02) 55%)`,
          border: `1px solid ${tint(C.rose, 0.24)}`,
        }}>
          <SectionTitle icon={AlertTriangle} color={C.roseL}>
            {attention.length} letter{attention.length === 1 ? '' : 's'} need{attention.length === 1 ? 's' : ''} something now
          </SectionTitle>
          <div style={CC({ gap: 8 })}>
            {attention.map(({ entry, status }) => (
              <div key={entry.id} style={{
                ...glass2({ padding: 12 }),
                borderLeft: `3px solid ${LEVEL_COLOR[status.level] || C.amber}`,
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>
                  {entry.name} <span style={{ fontWeight: 400, color: C.t3 }}>· {entry.relationship}</span>
                </div>
                <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55, marginTop: 4 }}>{status.message}</div>
                <button type="button" onClick={() => setOpenId(entry.id)}
                  style={{ ...btnSm(C.s3, { color: C.t2, marginTop: 8 }) }}>
                  <Mail size={12} /> Open the email
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div style={G(3, 12, {}, true)}>
          <StatTile icon={Mail} value={entries.filter(e => e.status === 'Asked').length} label="Asked, awaiting answer" color={C.amber} />
          <StatTile icon={UserCheck} value={confirmedOrIn} label="Confirmed writers" color={C.blue} />
          <StatTile icon={CheckCircle2} value={submitted} label="Letters submitted" color={C.green} />
        </div>
      )}

      {/* ── Whether the programs they're tracking even read letters ───────── */}
      {letterPolicy.rows.length > 0 && (
        <div style={{
          ...glass({ padding: 16 }),
          background: `linear-gradient(120deg,${tint(C.violet, 0.06)},rgba(255,255,255,0.02) 55%)`,
          border: `1px solid ${tint(C.violet, 0.2)}`,
        }}>
          <SectionTitle icon={School} color={C.violetL}>Do your programs use letters?</SectionTitle>
          <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.55, marginBottom: 12 }}>
            Not all of them do, and finding out in October that you cultivated a recommender a
            program will never read is a real and avoidable loss. Where we have read the program's
            own page, this says what it says; where we have not, it says that instead of guessing.
          </p>
          <div style={CC({ gap: 8 })}>
            {letterPolicy.rows.map(({ program, policy }) => {
              const color = policy.used === false ? C.roseL : policy.used === true ? C.greenL : C.t3;
              return (
                <div key={program.id} style={{ ...glass2({ padding: 12 }), borderLeft: `3px solid ${color}` }}>
                  <div style={R({ gap: 8, flexWrap: 'wrap' })}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{programLabel(program)}</span>
                    <span style={pill(tint(color, 0.14), color, { fontSize: 9 })}>{policy.verdict}</span>
                    <span style={{ fontSize: 9.5, color: C.t4 }}>{policy.basis}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6, marginTop: 4 }}>{policy.note}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Who to ask ───────────────────────────────────────────────────── */}
      <Disclosure id="rec-roles" icon={BookOpen} color={accent} title="Who actually writes these"
        sub="Six kinds of letter, what each one can say that the others cannot, and the mistake students make with each.">
        <div style={CC({ gap: 8 })}>
          {RECOMMENDER_ROLES.filter(r => r.id !== 'other').map(r => (
            <div key={r.id} style={{ ...glass2({ padding: 12 }), borderLeft: `3px solid ${tint(accent, 0.5)}` }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{r.label}</div>
              <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.62, marginTop: 4 }}>
                <b style={{ color: C.t1 }}>What they can say:</b> {r.whatTheyCanSay}
              </div>
              <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.62, marginTop: 4 }}>
                <b style={{ color: C.t1 }}>Who counts:</b> {r.whoCounts}
              </div>
              <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.62, marginTop: 4 }}>
                <b style={{ color: C.t1 }}>Notice:</b> {r.leadDaysAdvice}
              </div>
              <div style={{ fontSize: 11.5, color: C.amberL, lineHeight: 1.62, marginTop: 4 }}>
                <b>Common mistake:</b> {r.commonMistake}
              </div>
            </div>
          ))}
        </div>
      </Disclosure>

      {/* ── Add ──────────────────────────────────────────────────────────── */}
      <div style={{ ...glass({ padding: 16 }), background: `linear-gradient(120deg,${tint(accent, 0.06)},rgba(255,255,255,0.02) 55%)`, border: `1px solid ${tint(accent, 0.2)}` }}>
        <SectionTitle icon={Plus} color={accent}>Add a Recommender</SectionTitle>
        <form onSubmit={addEntry} style={CC({ gap: 8 })}>
          <div style={R({ gap: 8, flexWrap: 'wrap' })}>
            <input style={inp({ flex: 1, minWidth: 160 })} placeholder="Name — exactly as it appears in your hours log" value={name} onChange={e => setName(e.target.value)} />
            <select style={inp({ width: 'auto' })} value={relationship} onChange={e => setRelationship(e.target.value)}>
              {ROLE_LABELS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div style={R({ gap: 8, flexWrap: 'wrap' })}>
            <select style={inp({ width: 'auto' })} value={type} onChange={e => setType(e.target.value)}>
              <option value="individual">Individual letter</option>
              <option value="committee">Pre-Health committee letter</option>
            </select>
            <div>
              <span style={lbl({ marginBottom: 4 })}>Letter due</span>
              <input type="date" style={inp({ width: 'auto' })} value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <input style={inp()} placeholder="Notes — what you'd want them to highlight (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
          <div style={{ ...R({ gap: 8, alignItems: 'flex-start' }), fontSize: 11, color: C.t4, lineHeight: 1.5 }}>
            <Info size={12} style={{ flexShrink: 0, marginTop: 4 }} />
            <span>
              Spell the name the same way you spelled it as the supervisor on your shadowing and
              hours entries — that is how we attach your logged hours to the ask.
            </span>
          </div>
          <button type="submit" style={{ ...btn(accent !== C.blue ? accent : C.blueGrad), alignSelf: 'flex-start' }}><Plus size={14} />Add recommender</button>
        </form>
      </div>

      {!loading && entries.length === 0 && (
        <div style={glass({ padding: 24, textAlign: 'center' })}>
          <Users size={22} color={C.t3} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.6, maxWidth: 460, margin: '0 auto' }}>
            No recommenders yet. Most applications need two or three, and the single biggest
            predictor of a good letter is how much notice you gave — {MIN_LEAD_DAYS} days minimum,
            {' '}{IDEAL_LEAD_DAYS} is better. Add the people now, even if you will not ask for a year.
          </div>
        </div>
      )}

      {committee.length > 0 && <Section title="Committee letter" items={committee} {...rowProps} />}
      {individuals.length > 0 && <Section title={`Individual letters (${individuals.length})`} items={individuals} {...rowProps} />}
    </div>
  );
}

function Section({ title, items, accent, ...rest }) {
  return (
    <div style={CC({ gap: 8 })}>
      <SectionTitle icon={Users} color={accent}>{title}</SectionTitle>
      {items.map(e => <Row key={e.id} entry={e} accent={accent} {...rest} />)}
    </div>
  );
}

function Row({ entry, accent, logs, openId, setOpenId, onCycle, onRemove, onPatch, studentName, gradeLabel }) {
  const sc = statusColor(entry.status) || C.t3;
  const stepIdx = STATUSES.indexOf(entry.status);
  const isOpen = openId === entry.id;
  const status = leadTimeStatus(entry);
  const role = roleFromRelationship(entry.relationship);
  const link = hoursForRecommender(entry, logs);
  const levelColor = LEVEL_COLOR[status.level] || C.t3;

  return (
    <div style={{
      ...glass2({ padding: 0, overflow: 'hidden' }),
      borderLeft: `3px solid ${sc}`,
      background: `linear-gradient(120deg,${tint(sc, 0.05)},rgba(255,255,255,0.02) 55%)`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', flexWrap: 'wrap' }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: tint(accent, 0.13), border: `1px solid ${tint(accent, 0.25)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <UserCheck size={15} color={accent} />
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{entry.name}</div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>
            {entry.relationship}
            {entry.due_date ? ` · due ${new Date(entry.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
            {link.totalHours > 0 && (
              <span style={{ color: C.greenL }}> · {link.totalHours} hrs logged together</span>
            )}
          </div>
          {entry.notes && <div style={{ fontSize: 11, color: C.t2, marginTop: 4 }}>{entry.notes}</div>}
          <div style={{ display: 'flex', gap: 4, marginTop: 8, maxWidth: 180 }}>
            {STATUSES.map((s, i) => (
              <span key={s} title={s} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= stepIdx ? (statusColor(s) === C.t3 ? C.t4 : statusColor(s)) : C.b1 }} />
            ))}
          </div>
          <div style={{ ...R({ gap: 4, alignItems: 'flex-start' }), marginTop: 8, fontSize: 11, color: levelColor === C.t3 ? C.t3 : levelColor, lineHeight: 1.5 }}>
            <Clock size={11} style={{ flexShrink: 0, marginTop: 4 }} />
            <span>{status.message}</span>
          </div>
        </div>
        <div style={{ ...R({ gap: 4 }), flexShrink: 0 }}>
          <button onClick={() => onCycle(entry)} style={pill(tint(sc, 0.15), sc, { cursor: 'pointer', border: `1px solid ${tint(sc, 0.3)}`, fontSize: 10 })}>{entry.status}</button>
          <button style={btnSm(C.s3, { color: C.t2 })} onClick={() => setOpenId(isOpen ? null : entry.id)}>
            <Mail size={12} />{isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button style={btnSm(C.roseDim, { color: C.rose })} onClick={() => onRemove(entry.id)}><Trash2 size={12} /></button>
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: '0px 16px 16px', borderTop: `1px solid ${C.b1}`, paddingTop: 12, ...CC({ gap: 12 }) }}>
          {/* Dates the nudge counts from. Editable here rather than only at
              creation, because the deadline is usually learned later than the
              recommender is chosen. */}
          <div style={autoGrid(160, 10)}>
            <div>
              <span style={lbl()}>Letter due</span>
              <input type="date" style={inp()} value={entry.due_date || ''}
                onChange={e => onPatch(entry.id, { due_date: e.target.value || null })} />
            </div>
            <div>
              <span style={lbl()}>Date you asked</span>
              <input type="date" style={inp()} value={entry.asked_at || ''}
                onChange={e => onPatch(entry.id, { asked_at: e.target.value || null })} />
            </div>
          </div>

          {/* What the ask is backed by. */}
          <div style={{ ...glass2({ padding: 12 }), background: C.s2 }}>
            <div style={{ ...R({ gap: 8, marginBottom: 8 }) }}>
              <Link2 size={12} color={link.totalHours ? C.greenL : C.t3} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: link.totalHours ? C.greenL : C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>
                {link.totalHours ? 'Backed by your hours log' : 'No logged hours found under this name'}
              </span>
            </div>
            {link.totalHours ? (
              <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.62 }}>
                {link.clinicalHours > 0 && (
                  <div>{link.clinicalHours} hours across {link.visits} visit{link.visits === 1 ? '' : 's'}
                    {link.sites.length ? ` at ${link.sites.join(', ')}` : ''}
                    {link.specialties.length ? ` · ${link.specialties.join(', ')}` : ''}</div>
                )}
                {link.shadowingHours > 0 && <div>{link.shadowingHours} hours observing</div>}
                {link.handsOnHours > 0 && <div>{link.handsOnHours} hours hands-on</div>}
                {link.research.length > 0 && <div>{link.research.length} research project{link.research.length === 1 ? '' : 's'} they mentored</div>}
                {link.activities.length > 0 && <div>{link.activities.length} activit{link.activities.length === 1 ? 'y' : 'ies'} they verified</div>}
                {link.firstDate && (
                  <div style={{ color: C.t3, marginTop: 4 }}>
                    {new Date(link.firstDate + 'T00:00:00').toLocaleDateString()} — {new Date((link.lastDate || link.firstDate) + 'T00:00:00').toLocaleDateString()}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.62 }}>
                We match your recommenders to your shadowing, hours and research logs by name. If
                you have worked with {entry.name}, check the supervisor or mentor name on those
                entries is spelled the same way. The ask is far stronger when it says how many
                hours, on which dates.
              </div>
            )}
          </div>

          <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.62 }}>
            <b style={{ color: C.t1 }}>{role.label}:</b> {role.whatTheyCanSay}
          </div>

          <EmailTabs entry={entry} logs={logs} studentName={studentName} gradeLabel={gradeLabel} accent={accent} />
        </div>
      )}
    </div>
  );
}

/**
 * The four emails, with a copy button on each.
 *
 * Copy-to-clipboard rather than a mailto: link on purpose — a mailto opens
 * whatever mail client the OS thinks is default, which on a school Chromebook
 * is frequently nothing at all, and a button that appears to do nothing is
 * worse than no button. Copy works everywhere and lands in the app they
 * actually use.
 */
function EmailTabs({ entry, logs, studentName, gradeLabel, accent }) {
  const templates = useMemo(
    () => emailTemplates(entry, logs, { studentName, gradeLabel }),
    [entry, logs, studentName, gradeLabel],
  );
  const [tab, setTab] = useState(templates[0].id);
  const [copied, setCopied] = useState(null);
  const active = templates.find(t => t.id === tab) || templates[0];

  function copy(text, which) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    }, () => toast.error('Could not copy to clipboard'));
  }

  return (
    <div style={CC({ gap: 8 })}>
      <div style={R({ gap: 4, flexWrap: 'wrap' })}>
        {templates.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            style={pill(tab === t.id ? tint(accent, 0.18) : C.b0, tab === t.id ? accent : C.t3, {
              cursor: 'pointer', border: `1px solid ${tab === t.id ? tint(accent, 0.3) : C.b1}`,
              fontSize: 10.5, fontWeight: tab === t.id ? 700 : 500,
            })}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.55 }}>{active.note}</div>

      <div style={{ ...glass2({ padding: 12 }), background: C.s2 }}>
        <div style={R({ gap: 8, marginBottom: 8, flexWrap: 'wrap' })}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))'}}>Subject</span>
          <span style={{ flex: 1, minWidth: 120, fontSize: 12, color: C.t1 }}>{active.subject}</span>
          <button type="button" onClick={() => copy(active.subject, 'subject')}
            style={btnSm(copied === 'subject' ? tint(C.green, 0.18) : C.s3, { color: copied === 'subject' ? C.greenL : C.t2, fontSize: 10.5 })}>
            {copied === 'subject' ? <Check size={11} /> : <ClipboardCopy size={11} />}
          </button>
        </div>
        <pre style={{
          margin: 0, fontSize: 11.5, color: C.t2, lineHeight: 1.65, fontFamily: C.FB,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 340, overflowY: 'auto',
        }}>{active.body}</pre>
        <button type="button" onClick={() => copy(active.body, 'body')}
          style={{ ...btnSm(copied === 'body' ? tint(C.green, 0.18) : C.s3, { color: copied === 'body' ? C.greenL : C.t2, marginTop: 8 }) }}>
          {copied === 'body' ? <Check size={12} /> : <ClipboardCopy size={12} />}
          {copied === 'body' ? 'Copied' : 'Copy the email'}
        </button>
      </div>
    </div>
  );
}
