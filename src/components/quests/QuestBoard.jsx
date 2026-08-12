// ─────────────────────────────────────────────────────────────────────────────
// The quest board — Progress → Quests, and the only screen that shows the whole
// picture: what is running, what it is worth, what was finished, and what was
// asked for and refused.
//
// ── Why the history is not hidden ───────────────────────────────────────────
// A finished quest list is the most motivating object in this app — it is the
// only place a student can see "I committed to a month of work and did it",
// which no streak number and no XP total says. And a DECLINED quest stays
// visible too, on both sides. That is deliberate and slightly uncomfortable:
// declining is a real answer (migration 0014), and hiding it would turn a
// refusal into a disappearance, which is how a parent ends up asking about it
// at dinner instead of in the app.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Trophy, History, Info, Swords, Flame, Gift, Loader2, ShieldOff,
} from 'lucide-react';
import { C, glass, glass2, pill, R, CC, tint, btn, onTint } from '../../lib/theme';
import PanelHero, { SectionTitle } from '../ui/PanelHero';
import EmptyState from '../ui/EmptyState';
import QuestCard from './QuestCard';
import QuestPicker from './QuestPicker';
import { evaluateAll, summarize, TERMINAL_STATUSES, getQuest, QUEST_TIERS } from '../../lib/quests';
import { questIcon } from './questIcons';

const HISTORY_LABEL = {
  claimed: { label: 'Completed', color: '#10b981' },
  expired: { label: 'Ran out of time', color: '#64748b' },
  declined: { label: 'Declined', color: '#f59e0b' },
  cancelled: { label: 'Dropped', color: '#64748b' },
};

function HistoryRow({ quest, m }) {
  const def = getQuest(quest.questId);
  const Icon = questIcon(def?.icon);
  const meta = HISTORY_LABEL[quest.status] || HISTORY_LABEL.cancelled;
  const color = quest.status === 'claimed' ? meta.color : C.t3;
  return (
    <div style={{ ...glass2({ padding: '10px 13px' }), ...R({ gap: 11 }), opacity: quest.status === 'claimed' ? 1 : 0.75 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 9, flexShrink: 0,
        background: tint(color, 0.13), border: `1px solid ${tint(color, 0.24)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon size={13} color={color} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{quest.title}</div>
        <div style={{ fontSize: 10.5, color: C.t3, marginTop: 2 }}>
          {meta.label}
          {quest.assignedBy === 'parent' && quest.assignerName && ` · asked by ${quest.assignerName}`}
          {quest.status !== 'claimed' && ` · reached ${quest.progress}/${quest.target}`}
        </div>
      </div>
      {quest.status === 'claimed' && (
        <span style={pill(tint(C.amber, 0.13), C.amberL, { fontSize: 10, fontFamily: C.FM, fontWeight: 800, flexShrink: 0 })}>+{quest.xp} XP</span>
      )}
    </div>
  );
}

export default function QuestBoard({
  quests = [],          // every row, any status
  events = [],
  available = true,     // false when the deployment has no quest schema yet
  loading = false,
  onAssign,             // (questId) → Promise
  onClaim,              // (row) → Promise
  onDecline,            // (row) → Promise
  onWithdraw,           // (row) → Promise
  onGo,                 // (destination) → void
  busyId = null,
  error = null,
  m = false,
}) {
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState(null);
  const [pickBusy, setPickBusy] = useState(null);

  const rows = useMemo(() => evaluateAll(quests, events), [quests, events]);
  const stats = useMemo(() => summarize(rows), [rows]);
  const history = useMemo(
    () => quests.filter((q) => TERMINAL_STATUSES.has(q.status)).slice(0, 25),
    [quests],
  );
  const lifetimeXP = useMemo(
    () => quests.filter((q) => q.status === 'claimed').reduce((s, q) => s + (q.xp || 0), 0),
    [quests],
  );
  const activeIds = useMemo(() => rows.map((r) => r.assignment.questId), [rows]);

  const pick = async (questId) => {
    setPickBusy(questId);
    setPickError(null);
    try {
      await onAssign?.(questId);
      setPicking(false);
    } catch (err) {
      setPickError(err?.message || 'Could not start that quest.');
    } finally {
      setPickBusy(null);
    }
  };

  return (
    <div style={CC({ gap: 20 })}>
      <PanelHero
        icon={Swords} color={C.violet} color2={C.amber}
        eyebrow="Quests"
        title="Quests"
        sub="Long commitments, paid properly. Every quest here caps how much one day can contribute, so none of them can be crammed — they can only be kept up."
        stats={[
          { icon: <Flame size={11} />, value: stats.active, label: 'running' },
          ...(stats.claimable ? [{ icon: <Gift size={11} />, value: stats.claimable, label: 'to claim', color: C.green }] : []),
          { icon: <Trophy size={11} />, value: lifetimeXP.toLocaleString(), label: 'XP earned', color: C.amber },
        ]}
        right={(
          <button
            onClick={() => { setPickError(null); setPicking(true); }}
            style={{ ...btn(`linear-gradient(135deg, ${C.violet}, ${C.fuchsia})`, { fontSize: 12.5, padding: '9px 16px', color: onTint(C.violet) }) }}
          ><Plus size={14} />Take on a quest</button>
        )}
        m={m}
      />

      {!available && (
        <div style={{ ...R({ gap: 9 }), ...glass2({ padding: 14 }), border: `1px solid ${tint(C.amber, 0.26)}` }}>
          <ShieldOff size={14} color={C.amberL} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }}>
            Quests are not switched on for this deployment yet. Nothing is lost — the board will fill in once it is.
          </div>
        </div>
      )}

      {error && (
        <div style={{ ...R({ gap: 9 }), ...glass2({ padding: 13 }), border: `1px solid ${tint(C.rose, 0.28)}` }}>
          <Info size={14} color={C.roseL} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: C.roseL, lineHeight: 1.5 }}>{error}</div>
        </div>
      )}

      {/* Running ------------------------------------------------------------- */}
      <div>
        <SectionTitle icon={Swords} color={C.violetL}>
          {stats.active > 0 ? `Running — ${stats.active}` : 'Running'}
          {stats.parentAssigned > 0 && ` · ${stats.parentAssigned} asked for`}
        </SectionTitle>

        {loading && !rows.length ? (
          <div style={{ ...R({ gap: 8, justifyContent: 'center' }), padding: 30, color: C.t3, fontSize: 12.5 }}>
            <Loader2 size={14} className="spin" />Loading your quests…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Swords}
            accent={C.violet}
            title="No quests running"
            body="A quest is a two-to-six week commitment that pays more XP than anything else in the app. Take one on, or wait for someone to ask."
            actionLabel="Browse quests"
            onAction={() => { setPickError(null); setPicking(true); }}
          />
        ) : (
          <div style={CC({ gap: 12 })}>
            <AnimatePresence initial={false}>
              {rows.map(({ assignment, ev }) => (
                <QuestCard
                  key={assignment.id}
                  quest={assignment} ev={ev}
                  busy={busyId === assignment.id}
                  onClaim={() => onClaim?.(assignment)}
                  onDecline={() => onDecline?.(assignment)}
                  onWithdraw={() => onWithdraw?.(assignment)}
                  onGo={onGo}
                  m={m}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* History -------------------------------------------------------------- */}
      {history.length > 0 && (
        <div>
          <SectionTitle icon={History} color={C.t3}>Finished & closed</SectionTitle>
          <div style={CC({ gap: 8 })}>
            {history.map((h) => <HistoryRow key={h.id} quest={h} m={m} />)}
          </div>
        </div>
      )}

      {/* How this works ------------------------------------------------------- */}
      <div style={{ ...glass({ padding: m ? 15 : 18 }), border: `1px solid ${C.b1}` }}>
        <SectionTitle icon={Info} color={C.t3}>How quests work</SectionTitle>
        <div style={{ ...CC({ gap: 9 }), fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>
          <div><b style={{ color: C.t1 }}>A day can only count so much.</b> Every quest caps what one calendar day contributes. A card quest capped at 25 a day cannot be finished in an afternoon, no matter how many cards you review — the extra still earns normal XP, it just does not move the quest.</div>
          <div><b style={{ color: C.t1 }}>Some also need a minimum number of days.</b> Hitting the target early does not finish a quest that still owes days of work. The card tells you both numbers.</div>
          <div><b style={{ color: C.t1 }}>Anyone can ask, nobody can order.</b> A quest a parent assigns shows their name and their note. Declining it is a real answer and it is visible to them — it is not a way to make it quietly vanish.</div>
          <div><b style={{ color: C.t1 }}>The XP is paid once.</b> Claim is deduped on the server, so claiming on your phone and your laptop pays exactly once.</div>
          <div style={{ ...R({ gap: 6, flexWrap: 'wrap' }), marginTop: 3 }}>
            {Object.values(QUEST_TIERS).map((t) => (
              <span key={t.id} style={pill(tint(t.color, 0.14), t.color, { fontSize: 10, fontWeight: 700 })}>{t.label} · {t.xp} XP</span>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {picking && (
          <QuestPicker
            open={picking}
            onClose={() => setPicking(false)}
            onPick={pick}
            activeIds={activeIds}
            audience="student"
            busyId={pickBusy}
            error={pickError}
            m={m}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
