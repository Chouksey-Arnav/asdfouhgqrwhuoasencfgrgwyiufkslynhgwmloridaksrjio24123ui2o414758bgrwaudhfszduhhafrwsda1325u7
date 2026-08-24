// ─────────────────────────────────────────────────────────────────────────────
// The Home quest card.
//
// Home's job is one decision — what do I do next — so this is not a smaller copy
// of the board. It shows ONE quest (the engine picks it: claimable first, then
// the most urgent) plus a one-line tail for the rest, and it always ends in a
// button that either takes the reward or opens the surface where the work
// happens.
//
// ── The empty state is doing real work here ─────────────────────────────────
// A student with no quests is the common case on day one, and the card still
// renders: a quiet invitation with the honest pitch on it. That invitation is
// the single highest-traffic entry point into the whole system, and hiding the
// card when it is empty would mean quests are only ever discovered by students
// who already went looking for them.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Gift, Swords, Users, Plus, Route } from 'lucide-react';
import { C, glass, pill, R, CC, tint, btn, btnG, onTint } from '../../lib/theme';
import { questHeadline, toneFor, destinationFor, getQuest, questColor, featuredFor, summarize, chainFor } from '../../lib/quests';
import { questIcon } from './questIcons';

export default function QuestHomeCard({
  rows = [],          // evaluateAll() output
  onOpenBoard,
  onGo,
  onClaim,
  onBrowse,
  busyId = null,
  m = false,
}) {
  const stats = summarize(rows);
  const featured = featuredFor(rows, 'home');

  // ── Nothing running ──────────────────────────────────────────────────────
  if (!featured) {
    return (
      <div style={{
        ...glass({ padding: m ? 15 : 18 }),
        border: `1px solid ${tint(C.violet, 0.24)}`,
        background: `linear-gradient(135deg, ${tint(C.violet, 0.09)}, transparent 70%)`,
        ...R({ gap: 12, flexWrap: 'wrap' }),
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: tint(C.violet, 0.15), border: `1px solid ${tint(C.violet, 0.32)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Swords size={19} color={C.violetL} /></div>
        <div style={{ flex: 1, minWidth: 190 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>No quest running</div>
          <div style={{ fontSize: 11.5, color: C.t3, marginTop: 4, lineHeight: 1.5 }}>
            From five days to eight weeks, for up to 3,500 XP — the largest rewards in the app, and the only ones that cannot be crammed.
          </div>
        </div>
        <button
          onClick={onBrowse || onOpenBoard}
          style={{ ...btn(`linear-gradient(135deg, ${C.violet}, ${C.fuchsia})`, { fontSize: 12, padding: '8px 16px', color: onTint(C.violet) }), flexShrink: 0 }}
        ><Plus size={13} />Take one on</button>
      </div>
    );
  }

  const { assignment, ev } = featured;
  const def = getQuest(assignment.questId);
  const color = questColor(def) || C.violet;
  const tone = toneFor(ev);
  const Icon = questIcon(def?.icon);
  const dest = destinationFor(ev.spec.metric);
  const others = rows.length - 1;
  // Where this quest sits on its road. One chip, because "step 3 of 5" reframes
  // a single commitment as progress through something larger — which is the
  // whole reason the chains exist.
  const chain = chainFor(assignment.questId);

  return (
    <div style={{
      ...glass({ padding: m ? 15 : 18 }),
      border: `1px solid ${tint(ev.done ? tone.color : color, ev.done ? 0.44 : 0.26)}`,
      background: `linear-gradient(135deg, ${tint(ev.done ? tone.color : color, 0.1)}, transparent 70%)`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', right: -50, top: -50, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${tint(color, 0.16)}, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', ...R({ gap: 12, flexWrap: 'wrap' }) }}>
        <div style={{
          width: m ? 44 : 50, height: m ? 44 : 50, borderRadius: 16, flexShrink: 0,
          background: tint(color, 0.16), border: `1.5px solid ${tint(color, 0.36)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: ev.done ? `0 0 24px ${tint(tone.color, 0.4)}` : 'none',
        }}><Icon size={m ? 19 : 22} color={color} /></div>

        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={R({ gap: 8, flexWrap: 'wrap' })}>
            <span style={{ fontSize: 10, fontWeight: 800, color: color, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))'}}>Quest</span>
            {assignment.assignedBy === 'parent' && (
              <span style={{ ...pill(tint(C.violet, 0.14), C.violetL, { fontSize: 9.5, fontWeight: 700 }), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Users size={9} />{assignment.assignerName || 'Parent'} asked
              </span>
            )}
            {chain && (
              <span style={{ ...pill(tint(chain.color, 0.13), chain.color, { fontSize: 9.5, fontWeight: 700 }), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Route size={9} />{chain.label} {chain.step}/{chain.of}
              </span>
            )}
          </div>
          <div style={{ fontSize: m ? 15 : 16.5, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: 'calc(-0.02em + var(--msp-letter-spacing))', marginTop: 4 }}>{assignment.title}</div>
          <div style={{ fontSize: 11.5, color: tone.color, marginTop: 4, fontWeight: 600, lineHeight: 1.5 }}>{questHeadline(ev)}</div>

          <div style={{ marginTop: 8, height: 6, borderRadius: 4, background: tint(C.t3, 0.14), overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${ev.pct}%` }} transition={{ duration: 0.5 }}
              style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${color}, ${tone.color})` }}
            />
          </div>
          <div style={{ ...R({ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }), marginTop: 4 }}>
            <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM }}>{ev.progress}/{ev.target} · {ev.activeDays}/{ev.minActiveDays || ev.activeDays} days</span>
            <span style={{ fontSize: 10.5, color: C.amberL, fontFamily: C.FM, fontWeight: 700 }}>+{ev.xp} XP</span>
          </div>
        </div>

        <div style={{ ...CC({ gap: 8 }), flexShrink: 0, alignItems: 'stretch' }}>
          {ev.done ? (
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => onClaim?.(assignment)} disabled={busyId === assignment.id}
              style={{ ...btn(`linear-gradient(135deg, ${C.green}, ${C.greenL})`, { fontSize: 12.5, padding: '8px 16px', color: onTint(C.green) }), opacity: busyId === assignment.id ? 0.6 : 1 }}
            ><Gift size={13} />Claim +{ev.xp}</motion.button>
          ) : (
            <button
              onClick={() => onGo?.(dest)}
              style={btn(`linear-gradient(135deg, ${color}, ${tint(color, 0.7)})`, { fontSize: 12, padding: '8px 16px', color: onTint(color) })}
            >{dest.label}<ChevronRight size={12} /></button>
          )}
          <button onClick={onOpenBoard} style={btnG({ fontSize: 11, padding: '4px 12px' })}>
            {others > 0 ? `+${others} more` : 'All quests'}<ChevronRight size={11} />
          </button>
        </div>
      </div>

      {/* One line for the rest, so a three-quest board is not invisible from Home. */}
      {stats.claimable > 1 && (
        <div style={{ position: 'relative', marginTop: 12, fontSize: 11, color: C.greenL, fontWeight: 600 }}>
          {stats.claimable} quests are finished and waiting to be claimed — {stats.xpOnTable.toLocaleString()} XP on the table.
        </div>
      )}
    </div>
  );
}
