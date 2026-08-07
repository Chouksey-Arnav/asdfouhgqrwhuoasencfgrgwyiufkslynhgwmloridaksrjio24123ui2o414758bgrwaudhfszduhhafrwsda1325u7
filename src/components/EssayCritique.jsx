import React from 'react';
import { Gavel, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { C, glass2, btnG, btnSm, R, CC, pill, tint } from '../lib/theme';
import { renderMarkdown } from '../lib/renderMarkdown';
import { scoreBand } from '../lib/essayCritique';

// Shared renderer for a Medabrain essay critique — used by both the Essay
// Workspace editor (a tracked draft) and the supplemental trainer (a practice
// answer), so a student cannot get a softer read by choosing one surface over
// the other. The scoring badge is deliberately not colour-flattering: a 5-6
// renders amber, not green, because "clear but forgettable" is not a pass on the
// one document a student gets a single shot at.
const TONE_COLORS = {
  critical: { fg: C.roseL, bg: C.roseDim, border: tint(C.rose, 0.3) },
  warn: { fg: C.amberL, bg: C.amberDim, border: tint(C.amber, 0.3) },
  good: { fg: C.greenL, bg: C.greenDim, border: tint(C.green, 0.3) },
  great: { fg: C.greenL, bg: C.greenDim, border: tint(C.green, 0.45) },
  neutral: { fg: C.t3, bg: 'rgba(255,255,255,0.04)', border: C.b1 },
};

export default function EssayCritique({ state, onRun, runLabel = 'Get Medabrain\'s critique', emptyHint = null, disabled = false }) {
  const { loading = false, error = null, critique = null } = state || {};

  if (loading) {
    return (
      <div style={{ ...glass2({ padding: 16 }), border: `1px solid ${tint(C.violet, 0.25)}` }}>
        <div style={R({ gap: 9, color: C.t2, fontSize: 12.5 })}>
          <Loader2 size={14} className="spin" color={C.violetL} />
          Medabrain is reading your draft properly — twice. This takes a few seconds.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...glass2({ padding: 16 }), border: `1px solid ${tint(C.rose, 0.3)}`, background: C.roseDim }}>
        <div style={R({ gap: 8, color: C.roseL, fontSize: 12.5, marginBottom: 10 })}>
          <AlertTriangle size={14} />{error}
        </div>
        <button style={btnG({ fontSize: 12, padding: '7px 14px' })} onClick={onRun} disabled={disabled}>
          <RefreshCw size={12} />Try again
        </button>
      </div>
    );
  }

  if (!critique) {
    return (
      <div style={{ ...glass2({ padding: 16 }), border: `1px solid ${tint(C.violet, 0.22)}` }}>
        <div style={CC({ gap: 10 })}>
          <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6 }}>
            {emptyHint || 'Medabrain will read the whole draft and tell you what an admissions reader would think and not say — the biggest problem, line-by-line issues with your actual sentences, a rubric score, what to cut, and the three moves that would improve it most. It grades against the students you\'re competing with, not against effort.'}
          </div>
          <div>
            <button
              style={{
                ...btnSm(tint(C.violet, 0.16), { color: C.violetL, border: `1px solid ${tint(C.violet, 0.3)}`, fontSize: 12.5, padding: '8px 15px', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer' }),
              }}
              onClick={onRun} disabled={disabled}
            >
              <Gavel size={13} />{runLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const band = scoreBand(critique.score);
  const tone = TONE_COLORS[band.tone] || TONE_COLORS.neutral;

  return (
    <div style={{ ...glass2({ padding: 16 }), border: `1px solid ${tone.border}` }}>
      <div style={R({ gap: 10, justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 12 })}>
        <div style={R({ gap: 8 })}>
          <Gavel size={13} color={C.violetL} />
          <span style={{ fontSize: 11, fontWeight: 700, color: C.violetL, textTransform: 'uppercase', letterSpacing: '.06em' }}>Medabrain's critique</span>
        </div>
        {critique.score != null && (
          <span style={pill(tone.bg, tone.fg, { border: `1px solid ${tone.border}`, fontSize: 11.5, fontWeight: 800 })}>
            {critique.score}/10 · {band.label}
          </span>
        )}
      </div>

      {critique.headline && (
        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1, lineHeight: 1.55, marginBottom: 12, paddingLeft: 11, borderLeft: `3px solid ${tone.fg}` }}>
          {critique.headline}
        </div>
      )}

      <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.68 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(critique.body) }} />

      <div style={R({ gap: 10, justifyContent: 'space-between', flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.b1}` })}>
        <span style={{ fontSize: 10.5, color: C.t4, lineHeight: 1.5, flex: 1, minWidth: 200 }}>
          Graded against the applicant pool, not against effort. If this reads harsh, that's the point — it's cheaper to hear it here than in April.
        </span>
        <button style={btnG({ fontSize: 12, padding: '7px 14px' })} onClick={onRun} disabled={disabled}>
          <RefreshCw size={12} />Re-critique
        </button>
      </div>
    </div>
  );
}
