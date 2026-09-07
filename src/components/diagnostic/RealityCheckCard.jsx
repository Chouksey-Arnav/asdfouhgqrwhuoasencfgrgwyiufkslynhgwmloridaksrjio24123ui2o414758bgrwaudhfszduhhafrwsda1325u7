// ─────────────────────────────────────────────────────────────────────────────
// The reality check card — years, cost, exams, competitiveness, the day, and
// the most common reason people leave.
//
// Teens interested in medicine get the recruiting version of this conversation
// constantly and the attrition data essentially never. This card is the second
// one. See data/pathwayRealityChecks.js for the tone rule that governs it: the
// point is not to discourage anyone, it is that a decision made with the
// numbers in front of you is the kind that survives a hard second year.
//
// The "why people leave" row is last and deliberately not hidden behind a
// disclosure — it is the single most useful line on the card and the one most
// systematically withheld from this audience.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Clock, DollarSign, FileCheck2, Users, Sunrise, LogOut, Sparkles, ChevronDown } from 'lucide-react';
import { C, glass, glass2, lbl, pill, R, CC } from '../../lib/theme';
import { realityFor, REALITY_AS_OF } from '../../data/pathwayRealityChecks';

function Row({ icon: Ic, label, value, detail, color, expandable = false }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={glass2({ padding: '12px 16px' })}>
      <div style={R({ gap: 8, alignItems: 'flex-start' })}>
        <Ic size={15} color={color} style={{ flexShrink: 0, marginTop: 4 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* lbl() applies the shared eyebrow treatment (small-caps via CSS), so the
              label reads as a kicker without the literal all-caps string that costs
              word-shape recognition — see verifyCopy.mjs. */}
          <div style={lbl({ marginBottom: 0 })}>{label}</div>
          <div style={{ fontSize: 13, color: C.t1, lineHeight: 1.55, marginTop: 4, fontWeight: 600 }}>{value}</div>
          {detail && (expandable ? (
            <>
              {open && <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, marginTop: 8 }}>{detail}</div>}
              <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', padding: 0, marginTop: 8, cursor: 'pointer', color: C.t3, fontSize: 11, fontFamily: C.FB, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {open ? 'Less' : 'The detail'}<ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
              </button>
            </>
          ) : (
            <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, marginTop: 4 }}>{detail}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RealityCheckCard({ pathwayKey, accent = C.blue, m = false }) {
  const r = realityFor(pathwayKey);
  if (!r) return null;

  return (
    <div style={glass({ padding: m ? 14 : 18, borderLeft: `3px solid ${accent}55` })}>
      <div style={R({ justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 })}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>The reality of {r.label}</div>
        <span style={pill(C.s3, C.t3, { fontSize: 10 })}>U.S. · approx. · {REALITY_AS_OF}</span>
      </div>
      <p style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6, margin: '0 0 14px', maxWidth: 620 }}>
        You get the brochure for this career constantly. This is the other half — what the training
        actually costs in years and dollars, what the day is like, and why people who chose it leave.
        None of it is here to talk you out of anything; it is here so that if you do this, you chose it.
      </p>

      <div style={CC({ gap: 8 })}>
        <Row icon={Clock} color={C.blueL} label="Years after high school" value={r.yearsAfterHS} detail={r.yearsDetail} />
        <Row icon={DollarSign} color={C.amberL} label="Typical total cost" value={r.typicalCost} detail={r.costDetail} expandable />
        <Row icon={FileCheck2} color={C.violetL} label="Exams that gate this path" value={r.exams.join(' · ')} />
        <Row icon={Users} color={C.cyanL} label="How competitive" value={r.competitiveness} />
        <Row icon={Sunrise} color={C.tealL || C.greenL} label="Day length & call" value={r.dayLength} />
        {/* Last, and never behind a toggle. */}
        <Row icon={LogOut} color={C.roseL} label="Most common reason people leave" value={r.leaveReason} />
        <div style={{ ...glass2({ padding: '12px 16px', background: `${accent}0e`, border: `1px solid ${accent}28` }) }}>
          <div style={R({ gap: 8, alignItems: 'flex-start' })}>
            <Sparkles size={15} color={accent} style={{ flexShrink: 0, marginTop: 4 }} />
            <div>
              <div style={lbl({ marginBottom: 0 })}>And why people stay</div>
              <div style={{ fontSize: 13, color: C.t1, lineHeight: 1.55, marginTop: 4 }}>{r.upside}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
