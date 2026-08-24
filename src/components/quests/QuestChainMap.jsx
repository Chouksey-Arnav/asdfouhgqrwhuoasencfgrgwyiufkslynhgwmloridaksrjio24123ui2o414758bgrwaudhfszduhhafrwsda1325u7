// ─────────────────────────────────────────────────────────────────────────────
// Quest chains, drawn as ladders.
//
// ── The problem this solves ─────────────────────────────────────────────────
// Sixty quests presented as sixty equal options is a menu nobody orders from.
// The catalog has a shape — most quests sit on an ordered road from a five-day
// warm-up to an eight-week capstone — and until that shape is drawn, it exists
// only in the data file.
//
// A chain map answers the question a student has the moment they claim
// something, which is "what now", and it answers it with a road they can see the
// end of. The finale's XP is quoted on the header for exactly that reason: a
// ladder with a visible prize at the top is climbed, and one with only a next
// rung is stepped off.
//
// ── Nothing here is locked ──────────────────────────────────────────────────
// The rung after the last finished one is marked "next" and given the button.
// Everything above it is still perfectly takeable — a ladder that refused to let
// a student skip to the top would punish the ones who arrive already good at
// this, and there are plenty of those. "Next" is a recommendation with a strong
// opinion, not a gate.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, ChevronRight, Loader2, Trophy } from 'lucide-react';
import { C, glass, glass2, pill, R, CC, tint, btn, onTint, lbl } from '../../lib/theme';
import { QUEST_TIERS, questXP } from '../../lib/quests';
import { questIcon } from './questIcons';

const STATE_META = {
  done:    { label: 'Done',    color: '#10b981' },
  running: { label: 'Running', color: '#3b82f6' },
  next:    { label: 'Next',    color: '#f59e0b' },
  open:    { label: null,      color: '#64748b' },
};

function Rung({ row, chainColor, onTake, busyId, isLast, m }) {
  const quest = row.quest;
  if (!quest) return null;
  const meta = STATE_META[row.state] || STATE_META.open;
  const Icon = questIcon(quest.icon);
  const tier = QUEST_TIERS[quest.tier] || QUEST_TIERS.standard;
  const dim = row.state === 'open';

  return (
    <div style={{ display: 'flex', gap: m ? 10 : 12, alignItems: 'stretch' }}>
      {/* The rail: node + connector. This is what makes it read as a road rather
          than a list — and the connector is colored only up to where the
          student has actually got to. */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 26 }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          background: row.state === 'done' ? C.green : row.state === 'open' ? C.s2 : tint(meta.color, 0.2),
          border: `1.5px solid ${row.state === 'open' ? C.b1 : tint(meta.color, 0.5)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: row.state === 'next' ? `0 0 14px ${tint(meta.color, 0.45)}` : 'none',
        }}>
          {row.state === 'done'
            ? <Check size={12} color={onTint(C.green)} strokeWidth={3} />
            : <span style={{ fontSize: 10, fontWeight: 800, fontFamily: C.FM, color: row.state === 'open' ? C.t4 : meta.color }}>{row.step}</span>}
        </div>
        {!isLast && (
          <div style={{
            flex: 1, width: 2, minHeight: 14,
            background: row.state === 'done' ? tint(C.green, 0.5) : C.b1,
            marginTop: 4,
          }} />
        )}
      </div>

      {/* The rung itself */}
      <div style={{
        ...glass2({ padding: m ? 11 : 13 }), flex: 1, minWidth: 0, marginBottom: isLast ? 0 : 9,
        border: `1px solid ${row.state === 'next' ? tint(meta.color, 0.35) : row.state === 'done' ? tint(C.green, 0.24) : C.b1}`,
        background: row.state === 'next'
          ? `linear-gradient(135deg, ${tint(meta.color, 0.09)}, transparent 72%)`
          : row.state === 'done' ? tint(C.green, 0.05) : C.surf2,
        opacity: dim ? 0.68 : 1,
      }}>
        <div style={R({ gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' })}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: tint(chainColor, 0.13), border: `1px solid ${tint(chainColor, 0.26)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon size={14} color={chainColor} /></div>

          <div style={{ flex: 1, minWidth: 130 }}>
            <div style={R({ gap: 4, flexWrap: 'wrap' })}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: dim ? C.t2 : C.t1, fontFamily: C.FD }}>{quest.title}</span>
              <span style={pill(tint(tier.color, 0.14), tier.color, { fontSize: 8.5, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', padding: '4px 8px' })}>{tier.label}</span>
              {meta.label && (
                <span style={pill(tint(meta.color, 0.14), meta.color, { fontSize: 8.5, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', padding: '4px 8px' })}>{meta.label}</span>
              )}
            </div>
            <div style={{ fontSize: 10.5, color: C.t3, marginTop: 4, lineHeight: 1.45 }}>{quest.blurb}</div>
          </div>

          <div style={{ ...R({ gap: 8 }), flexShrink: 0 }}>
            <span style={pill(tint(C.amber, 0.13), C.amberL, { fontSize: 9.5, fontFamily: C.FM, fontWeight: 800 })}>+{row.xp}</span>
            {row.state === 'next' && onTake && (
              <button
                onClick={() => onTake(quest.id)}
                disabled={busyId === quest.id}
                style={{ ...btn(`linear-gradient(135deg, ${chainColor}, ${tint(chainColor, 0.7)})`, { fontSize: 11, padding: '4px 12px', color: onTint(chainColor) }), opacity: busyId === quest.id ? 0.6 : 1 }}
              >{busyId === quest.id ? <Loader2 size={11} className="spin" /> : null}Take it on</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** One chain. Used on the board and, collapsed, in the picker. */
export function ChainCard({ chain, onTake, busyId = null, m = false }) {
  const [open, setOpen] = React.useState(chain.completed > 0 && !chain.complete);
  const Icon = questIcon(chain.icon);

  return (
    <div style={{
      ...glass({ padding: m ? 14 : 17 }),
      border: `1px solid ${tint(chain.color, chain.complete ? 0.4 : 0.22)}`,
      background: chain.complete
        ? `linear-gradient(150deg, ${tint(C.green, 0.08)}, transparent 70%)`
        : `linear-gradient(150deg, ${tint(chain.color, 0.06)}, transparent 70%)`,
    }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
        aria-expanded={open}
      >
        <div style={R({ gap: 12, flexWrap: 'wrap' })}>
          <div style={{
            width: m ? 36 : 42, height: m ? 36 : 42, borderRadius: 12, flexShrink: 0,
            background: tint(chain.color, 0.15), border: `1px solid ${tint(chain.color, 0.32)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon size={m ? 17 : 20} color={chain.color} /></div>

          <div style={{ flex: 1, minWidth: 170 }}>
            <div style={R({ gap: 8, flexWrap: 'wrap' })}>
              <span style={{ fontSize: m ? 14 : 15, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: 'calc(-0.02em + var(--msp-letter-spacing))' }}>{chain.label}</span>
              <span style={pill(tint(chain.color, 0.13), chain.color, { fontSize: 9.5, fontFamily: C.FM, fontWeight: 800 })}>
                {chain.completed}/{chain.of}
              </span>
            </div>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.45 }}>{chain.blurb}</div>
          </div>

          <div style={{ ...R({ gap: 8 }), flexShrink: 0 }}>
            <span style={{ ...pill(tint(C.gold, 0.13), C.goldL, { fontSize: 10, fontFamily: C.FM, fontWeight: 800 }), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Trophy size={10} />{chain.finaleXP.toLocaleString()} at the top
            </span>
            <ChevronRight size={14} color={C.t3} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .18s' }} />
          </div>
        </div>

        {/* The ladder as a single bar when collapsed — enough to see where you
            are without expanding, which is most of what anybody wants. */}
        <div style={{ marginTop: 12, height: 6, borderRadius: 4, background: C.s2, overflow: 'hidden', display: 'flex', gap: 4 }}>
          {chain.steps.map((s) => (
            <div key={s.id} style={{
              flex: 1, height: '100%',
              background: s.state === 'done' ? chain.color
                : s.state === 'running' ? tint(chain.color, 0.5)
                  : s.state === 'next' ? tint(chain.color, 0.25) : 'transparent',
            }} />
          ))}
        </div>
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          style={{ overflow: 'hidden', marginTop: 12 }}
        >
          {chain.steps.map((row, i) => (
            <Rung
              key={row.id} row={row} chainColor={chain.color}
              onTake={onTake} busyId={busyId}
              isLast={i === chain.steps.length - 1} m={m}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

/** Every chain. The board's "roads" section. */
export default function QuestChainMap({ chains = [], onTake, busyId = null, m = false }) {
  if (!chains.length) return null;
  return (
    <div style={CC({ gap: 12 })}>
      {chains.map((chain) => (
        <ChainCard key={chain.id} chain={chain} onTake={onTake} busyId={busyId} m={m} />
      ))}
    </div>
  );
}
