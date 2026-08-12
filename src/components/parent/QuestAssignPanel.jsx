// ─────────────────────────────────────────────────────────────────────────────
// The parent's half of quests: pick one, watch it, take it back if it was wrong.
//
// ── Why this is the first thing a parent can DO here ────────────────────────
// Migrations 0006–0010 built a careful read-only window, and 0011 added a way to
// say something. This adds the only thing in the product a parent can actually
// put in front of their child — and it is deliberately narrow: a quest from a
// fixed catalog, with a note, that the student can decline.
//
// A parent cannot write a custom quest. That is not a missing feature. A
// free-text "quest" box would become a chore list inside a study app within a
// week, the app would have no way to measure it, and the student would have no
// way to earn XP from it — which turns the whole system into a place where
// homework is assigned. Every quest here is something the app can SEE happen and
// therefore something it can pay for.
//
// ── What the panel is honest about ──────────────────────────────────────────
// Two things, stated on the screen rather than in a help page:
//   1. Progress is reported by the student's device (see migration 0014).
//   2. They can decline, and the parent will see that they did.
// A dashboard that implied either of those was otherwise would be setting a
// parent up to be surprised by their own child in the worst possible way.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Swords, Plus, Loader2, Info, X, ShieldOff, History,
} from 'lucide-react';
import { C, glass, glass2, pill, R, CC, tint, btn, btnG, onTint } from '../../lib/theme';
import * as QuestAPI from '../../lib/questApi';
import {
  evaluateAll, questHeadline, toneFor, recommendQuests, getQuest, questColor,
  QUEST_TIERS, TERMINAL_STATUSES,
} from '../../lib/quests';
import { questIcon } from '../quests/questIcons';
import QuestPicker from '../quests/QuestPicker';

const MAX_PARENT_ACTIVE = 3;

/**
 * The summary → recommender signal shape.
 *
 * Everything the recommender reads is optional, so a student who has never synced simply gets the
 * starter set. Mapping it here rather than inside the recommender keeps src/lib/quests.js free of
 * any knowledge of the parent-summary schema, which is versioned separately.
 */
function signalsFrom(summary) {
  if (!summary) return {};
  const q = summary.coursework?.quizzes || {};
  return {
    gradeLevel: summary.student?.gradeLevel,
    activeDaysLast7: summary.effort?.activeDaysLast7,
    activeDaysLast28: summary.effort?.activeDaysLast28,
    cardReviewsLast28: summary.effort?.cardReviewsLast28,
    lessonsVerified: summary.coursework?.lessonsVerified,
    quizzesTaken: q.taken,
    averageScore: q.averageScore,
    satTestsTaken: summary.testing?.testsTaken,
    // The summary reports full tests, not raw question volume — so a student with tests behind
    // them is treated as having real volume, and one with none is treated as starting cold. It is
    // a coarse proxy and the recommender's copy never claims otherwise.
    satQuestions: (summary.testing?.testsTaken || 0) * 98,
  };
}

/** One live quest, from the parent's side: progress, pace, and a way to withdraw. */
function ParentQuestRow({ quest, ev, onWithdraw, busy, hue }) {
  const def = getQuest(quest.questId);
  const color = questColor(def) || hue;
  const tone = toneFor(ev);
  const Icon = questIcon(def?.icon);
  const mine = quest.assignedBy === 'parent';

  return (
    <div style={{
      ...glass2({ padding: 14 }),
      border: `1px solid ${tint(ev.done ? tone.color : color, 0.28)}`,
      background: `linear-gradient(135deg, ${tint(ev.done ? tone.color : color, 0.07)}, transparent 72%)`,
    }}>
      <div style={R({ gap: 12, alignItems: 'flex-start' })}>
        <div style={{
          width: 34, height: 34, borderRadius: 11, flexShrink: 0,
          background: tint(color, 0.15), border: `1px solid ${tint(color, 0.3)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon size={16} color={color} /></div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={R({ gap: 7, flexWrap: 'wrap' })}>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{quest.title}</span>
            <span style={pill(
              mine ? tint(C.violet, 0.15) : tint(C.t3, 0.14),
              mine ? C.violetL : C.t3,
              { fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' },
            )}>{mine ? 'You asked' : 'They chose'}</span>
            <span style={pill(tint(C.amber, 0.13), C.amberL, { fontSize: 9.5, fontFamily: C.FM, fontWeight: 800 })}>{quest.xp} XP</span>
          </div>

          {quest.note && mine && (
            <div style={{ fontSize: 11, color: C.t3, marginTop: 4, fontStyle: 'italic' }}>“{quest.note}”</div>
          )}

          <div style={{ marginTop: 9, height: 6, borderRadius: 4, background: tint(C.t3, 0.14), overflow: 'hidden' }}>
            <div style={{ width: `${ev.pct}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${color}, ${tone.color})` }} />
          </div>
          <div style={{ ...R({ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }), marginTop: 6 }}>
            <span style={{ fontSize: 11, color: C.t2, fontFamily: C.FM }}>
              {ev.progress}/{ev.target}
              {ev.minActiveDays > 0 && <span style={{ color: C.t3 }}> · {ev.activeDays}/{ev.minActiveDays} days</span>}
            </span>
            <span style={{ fontSize: 11, color: tone.color, fontWeight: 600 }}>{questHeadline(ev)}</span>
          </div>
        </div>

        {mine && !ev.done && (
          <button
            onClick={onWithdraw} disabled={busy}
            title="Withdraw this quest" aria-label="Withdraw this quest"
            style={{ ...btnG({ padding: 6, borderRadius: 8, flexShrink: 0 }), opacity: busy ? 0.5 : 0.7 }}
          >{busy ? <Loader2 size={12} className="spin" /> : <X size={12} />}</button>
        )}
      </div>
    </div>
  );
}

export default function QuestAssignPanel({ students = [], hueFor, m = false }) {
  const [byStudent, setByStudent] = useState({});   // studentId → quest rows
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [pickerFor, setPickerFor] = useState(null); // studentId
  const [pickBusy, setPickBusy] = useState(null);
  const [pickError, setPickError] = useState(null);
  const [rowBusy, setRowBusy] = useState(null);

  const load = useCallback(async () => {
    const { students: rows, available: ok } = await QuestAPI.listForParent();
    setByStudent(Object.fromEntries(rows.map((s) => [s.studentId, s.quests || []])));
    setAvailable(ok);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const assign = async (questId, note) => {
    setPickBusy(questId);
    setPickError(null);
    try {
      await QuestAPI.assign({ questId, studentId: pickerFor, note });
      await load();
      setPickerFor(null);
      toast.success('Quest set. They will see it the next time they open the app.');
    } catch (err) {
      setPickError(err?.message || 'Could not set that quest.');
    } finally {
      setPickBusy(null);
    }
  };

  const withdraw = async (quest) => {
    setRowBusy(quest.id);
    try {
      await QuestAPI.withdraw(quest.id);
      await load();
      toast.success('Withdrawn.');
    } catch (err) {
      toast.error(err?.message || 'Could not withdraw that.');
    } finally {
      setRowBusy(null);
    }
  };

  if (loading) {
    return (
      <div style={{ ...R({ gap: 9, justifyContent: 'center' }), padding: 40, color: C.t3, fontSize: 13 }}>
        <Loader2 size={15} className="spin" />Loading quests…
      </div>
    );
  }

  return (
    <div style={CC({ gap: 18 })}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>Quests</div>
        <div style={{ fontSize: 12.5, color: C.t3, marginTop: 4, lineHeight: 1.6 }}>
          The one thing here you can put in front of them. Pick from a fixed set of multi-week commitments —
          each one caps how much a single day can contribute, so none of them can be crammed the night before.
          They earn a large amount of XP for finishing, they can see who asked, and they can say no.
        </div>
      </div>

      {!available && (
        <div style={{ ...R({ gap: 9 }), ...glass2({ padding: 14 }), border: `1px solid ${tint(C.amber, 0.26)}` }}>
          <ShieldOff size={14} color={C.amberL} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}>
            Quests are not switched on for this deployment yet.
          </div>
        </div>
      )}

      {students.length === 0 && (
        <div style={{ ...glass({ padding: 24, textAlign: 'center' }) }}>
          <div style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.6 }}>
            Connect to a student first — quests are set on a connection, not on an account.
          </div>
        </div>
      )}

      {students.map((s) => {
        const hue = hueFor ? hueFor(s.studentId) : C.violet;
        const name = s.summary?.student?.name || 'Your student';
        const all = byStudent[s.studentId] || [];
        const live = all.filter((q) => !TERMINAL_STATUSES.has(q.status));
        // `null`, not `[]` — this device holds none of the student's evidence, so the engine must
        // read the reported figures off the row rather than deriving zero from an empty event
        // list. Everything else it computes (pace, urgency, days left) is calendar maths and is
        // identical to what the student sees.
        const rows = evaluateAll(live, null);
        const history = all.filter((q) => TERMINAL_STATUSES.has(q.status)).slice(0, 6);
        const mineActive = live.filter((q) => q.assignedBy === 'parent').length;
        const activeIds = live.map((q) => q.questId);
        const recommended = recommendQuests(signalsFrom(s.summary), activeIds).slice(0, 6);

        return (
          <div key={s.studentId} style={glass({ ...CC({ gap: 14 }), borderColor: tint(hue, 0.26) })}>
            <div style={R({ gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' })}>
              <div style={R({ gap: 9 })}>
                <Swords size={15} color={hue} />
                <span style={{ fontSize: 15, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{name}</span>
                <span style={pill(tint(hue, 0.13), hue, { fontSize: 10.5, fontWeight: 700 })}>
                  {live.length} running · {mineActive}/{MAX_PARENT_ACTIVE} from you
                </span>
              </div>
              <button
                onClick={() => { setPickError(null); setPickerFor(s.studentId); }}
                disabled={mineActive >= MAX_PARENT_ACTIVE || !available}
                title={mineActive >= MAX_PARENT_ACTIVE ? `You have already set ${MAX_PARENT_ACTIVE} quests — leave them room to choose their own.` : undefined}
                style={{
                  ...btn(`linear-gradient(135deg, ${hue}, ${tint(hue, 0.65)})`, { fontSize: 12, padding: '8px 15px', color: onTint(hue) }),
                  opacity: (mineActive >= MAX_PARENT_ACTIVE || !available) ? 0.45 : 1,
                  cursor: (mineActive >= MAX_PARENT_ACTIVE || !available) ? 'not-allowed' : 'pointer',
                }}
              ><Plus size={13} />Set a quest</button>
            </div>

            {/* Running */}
            {rows.length === 0 ? (
              <div style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.6, padding: '4px 0' }}>
                Nothing running. The suggestions below are ranked from what their dashboard already shows —
                the top one is usually the right one.
              </div>
            ) : (
              <div style={CC({ gap: 10 })}>
                {rows.map(({ assignment, ev }) => (
                  <ParentQuestRow
                    key={assignment.id} quest={assignment} ev={ev} hue={hue}
                    busy={rowBusy === assignment.id}
                    onWithdraw={() => withdraw(assignment)}
                  />
                ))}
              </div>
            )}

            {/* Suggestions — the top three, inline, so setting one is a single tap */}
            {recommended.length > 0 && mineActive < MAX_PARENT_ACTIVE && available && (
              <div style={{ borderTop: `1px solid ${C.b1}`, paddingTop: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: C.t3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 9 }}>
                  Suggested for {name.split(' ')[0]}
                </div>
                <div style={CC({ gap: 8 })}>
                  {recommended.slice(0, 3).map((r) => {
                    const color = questColor(r.quest);
                    const Icon = questIcon(r.quest.icon);
                    const tier = QUEST_TIERS[r.quest.tier];
                    return (
                      <div key={r.id} style={{ ...R({ gap: 11, alignItems: 'flex-start' }), padding: '10px 12px', borderRadius: 10, background: tint(color, 0.06), border: `1px solid ${tint(color, 0.2)}` }}>
                        <Icon size={14} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={R({ gap: 6, flexWrap: 'wrap' })}>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{r.quest.title}</span>
                            <span style={pill(tint(tier.color, 0.14), tier.color, { fontSize: 9, fontWeight: 800, textTransform: 'uppercase' })}>{tier.label}</span>
                          </div>
                          <div style={{ fontSize: 11, color: C.t2, marginTop: 3, lineHeight: 1.5 }}>{r.reason}</div>
                        </div>
                        <button
                          onClick={() => { setPickerFor(s.studentId); setPickError(null); }}
                          style={{ ...btnG({ fontSize: 11, padding: '5px 11px', flexShrink: 0 }) }}
                        >Set</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Closed */}
            {history.length > 0 && (
              <div style={{ borderTop: `1px solid ${C.b1}`, paddingTop: 12 }}>
                <div style={{ ...R({ gap: 6 }), fontSize: 10.5, fontWeight: 800, color: C.t3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 9 }}>
                  <History size={11} />Recently closed
                </div>
                <div style={CC({ gap: 6 })}>
                  {history.map((h) => (
                    <div key={h.id} style={{ ...R({ gap: 8, flexWrap: 'wrap' }), fontSize: 11.5, color: C.t3 }}>
                      <span style={{ color: h.status === 'claimed' ? C.greenL : C.t3, fontWeight: 700 }}>
                        {h.status === 'claimed' ? 'Completed' : h.status === 'declined' ? 'Declined' : h.status === 'expired' ? 'Ran out of time' : 'Dropped'}
                      </span>
                      <span style={{ color: C.t2 }}>{h.title}</span>
                      <span>· reached {h.progress}/{h.target}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* What this screen will not pretend ------------------------------------ */}
      {students.length > 0 && (
        <div style={{ ...glass({ padding: 16 }), border: `1px solid ${C.b1}` }}>
          <div style={{ ...R({ gap: 7 }), fontSize: 10.5, fontWeight: 800, color: C.t3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 9 }}>
            <Info size={11} />Worth knowing
          </div>
          <div style={{ ...CC({ gap: 8 }), fontSize: 12, color: C.t2, lineHeight: 1.6 }}>
            <div><b style={{ color: C.t1 }}>They can decline.</b> A quest that cannot be refused is an instruction, and this app does not let anyone instruct. A declined quest shows up here as declined — it does not quietly disappear.</div>
            <div><b style={{ color: C.t1 }}>Progress comes from their device.</b> The app measures the work where it happens and reports the total here. It is the same number they see on their own progress bar, not an independent audit.</div>
            <div><b style={{ color: C.t1 }}>Three at once, at most.</b> Filling their board leaves them nothing to choose, and a quest nobody chose is the kind that gets declined.</div>
            <div><b style={{ color: C.t1 }}>You cannot mark one complete.</b> Only the work does that.</div>
          </div>
        </div>
      )}

      {pickerFor && (
        <QuestPicker
          open
          onClose={() => setPickerFor(null)}
          onPick={assign}
          audience="parent"
          studentName={(students.find((s) => s.studentId === pickerFor)?.summary?.student?.name) || null}
          activeIds={(byStudent[pickerFor] || []).filter((q) => !TERMINAL_STATUSES.has(q.status)).map((q) => q.questId)}
          recommended={recommendQuests(
            signalsFrom(students.find((s) => s.studentId === pickerFor)?.summary),
            (byStudent[pickerFor] || []).filter((q) => !TERMINAL_STATUSES.has(q.status)).map((q) => q.questId),
          )}
          busyId={pickBusy}
          error={pickError}
          m={m}
        />
      )}
    </div>
  );
}
