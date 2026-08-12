// ─────────────────────────────────────────────────────────────────────────────
// The quest-completion takeover.
//
// ── Why a takeover, when there is already a reward chest ────────────────────
// The chest (App.jsx's openChest) is the REVEAL — it opens, XP flies out, a
// cosmetic sometimes drops. It is the same ceremony a daily check-in gets, and
// it is the right one for the moment the reward is taken.
//
// This is the different beat that comes first: the moment a three-week
// commitment is finished. Those are not the same event and collapsing them
// loses the one worth having. A student who reviewed six hundred flashcards
// across eighteen days should be told, in the middle of the screen, what they
// just did — the number of days, the number of times they showed up — before
// anybody mentions XP. The XP is the payment; the sentence is the point.
//
// Mounted at the app root (not inside a tab), like LessonCompleteOverlay, so it
// fires wherever the student happened to be when the last card landed.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, X, CalendarCheck, Users, Trophy } from 'lucide-react';
import { C, glass, pill, R, tint, btn, btnG, onTint } from '../../lib/theme';
import Portal from '../ui/Portal';
import { getQuest, questColor, QUEST_TIERS, QUEST_METRICS } from '../../lib/quests';
import { questIcon } from './questIcons';

export default function QuestCompleteOverlay({
  quest,            // the assignment row
  ev,               // evaluate() output at the moment it completed
  onClaim,
  onClose,
  busy = false,
  reducedMotion = false,
  m = false,
}) {
  // Escape closes. The reward is not lost by closing — a completed quest stays
  // claimable forever (see expireLapsed in api/parent/quests.js), so this
  // overlay never has to trap anybody to protect them from losing XP.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!quest || !ev) return null;

  const def = getQuest(quest.questId);
  const color = questColor(def) || C.violet;
  const Icon = questIcon(def?.icon);
  const tier = QUEST_TIERS[quest.tier] || QUEST_TIERS.standard;
  const metric = QUEST_METRICS[ev.spec.metric] || {};
  const days = Math.max(1, Math.round((Date.now() - ev.startedAt) / (24 * 60 * 60 * 1000)));

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 420, background: 'rgba(2,6,23,0.8)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}
        role="dialog" aria-modal="true" aria-label={`${quest.title} complete`}
      >
        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { scale: 0.9, y: 20, opacity: 0 }}
          animate={reducedMotion ? { opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          style={{
            ...glass({ padding: m ? 24 : 32 }), width: '100%', maxWidth: 460, textAlign: 'center',
            border: `1px solid ${tint(color, 0.4)}`,
            background: `linear-gradient(160deg, ${tint(color, 0.16)}, ${C.surf} 62%)`,
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle, ${tint(color, 0.3)}, transparent 68%)`, pointerEvents: 'none' }} />

          <button onClick={onClose} aria-label="Close" style={{ ...btnG({ padding: 6, borderRadius: 8 }), position: 'absolute', top: 12, right: 12 }}><X size={14} /></button>

          <div style={{ position: 'relative' }}>
            <motion.div
              initial={reducedMotion ? {} : { scale: 0.5, rotate: -12 }}
              animate={reducedMotion ? {} : { scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.08 }}
              style={{
                width: 76, height: 76, borderRadius: 24, margin: '0 auto 18px',
                background: `linear-gradient(135deg, ${color}, ${tint(color, 0.6)})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 12px 40px ${tint(color, 0.5)}`,
              }}
            ><Icon size={34} color="#fff" /></motion.div>

            <div style={{ fontSize: 10.5, fontWeight: 800, color, letterSpacing: '.14em', textTransform: 'uppercase' }}>
              {tier.label} quest complete
            </div>
            <h2 style={{ fontSize: m ? 22 : 26, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: '-.03em', margin: '8px 0 0' }}>
              {quest.title}
            </h2>

            {/* The sentence. Days first, XP last. */}
            <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.65, marginTop: 12, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
              {ev.target} {metric.label || 'steps'}, across <b style={{ color: C.t1 }}>{ev.activeDays} separate days</b> of work in {days} days.
              {ev.spec.dailyCap > 0 && ' There was no way to rush this one.'}
            </div>

            {quest.assignedBy === 'parent' && (
              <div style={{ ...R({ gap: 7, justifyContent: 'center' }), marginTop: 12, fontSize: 11.5, color: C.violetL }}>
                <Users size={12} />{quest.assignerName || 'A parent'} asked for this one — they will see it is done.
              </div>
            )}

            <div style={{ ...R({ gap: 8, justifyContent: 'center', flexWrap: 'wrap' }), marginTop: 16 }}>
              <span style={{ ...pill(tint(C.green, 0.14), C.greenL, { fontSize: 11, fontWeight: 700 }), display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <CalendarCheck size={11} />{ev.activeDays} active days
              </span>
              <span style={{ ...pill(tint(C.amber, 0.14), C.amberL, { fontSize: 11, fontWeight: 800, fontFamily: C.FM }), display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Trophy size={11} />+{ev.xp} XP
              </span>
            </div>

            <motion.button
              whileHover={reducedMotion ? {} : { scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={onClaim} disabled={busy}
              style={{
                ...btn(`linear-gradient(135deg, ${C.green}, ${C.greenL})`, { marginTop: 22, fontSize: 14, padding: '12px 28px', color: onTint(C.green) }),
                opacity: busy ? 0.6 : 1,
              }}
            ><Gift size={16} />Claim {ev.xp} XP</motion.button>

            <div style={{ fontSize: 10.5, color: C.t3, marginTop: 11 }}>
              Not now? It stays claimable — nothing expires once it is finished.
            </div>
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
