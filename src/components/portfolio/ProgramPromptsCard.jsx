import React, { useState } from 'react';
import { Stethoscope, AlertTriangle, ExternalLink, Plus, Check, Loader2, CalendarClock } from 'lucide-react';
import { C, glass, glass2, btnSm, R, CC, pill, tint, onTint } from '../../lib/theme';
import { SectionTitle } from '../ui/PanelHero';
import { HelpNote } from '../ui/Disclosure';
import { essayRowForProgramPrompt, isPromptStarted } from '../../lib/programEssayPrompts';

// ─────────────────────────────────────────────────────────────────────────────
// The essays your tracked programs ask for.
//
// This card exists to move one fact from October to March: a combined-degree
// program is a SECOND application, with its own essays, usually on an EARLIER
// deadline than anything else on the student's list. Both halves of that fact
// were already in the app — the catalog knows, the college list knows the
// program is tracked — and the essay workspace was the one place they were
// never joined. See src/lib/programEssayPrompts.js.
//
// The design rule that shapes everything below: a program whose prompts are not
// published gets a card too. Knowing there is a second application at all is
// most of the value, and it is precisely the fact a student would otherwise
// miss. What such a card never does is show a plausible-looking prompt — a
// fabricated BS/MD question is worse than no question, because the student
// drafts against it and discovers in October that they wrote the wrong essay.
// ─────────────────────────────────────────────────────────────────────────────

export default function ProgramPromptsCard({
  cards = [], essays = [], accent = C.blue, isMobile = false, onCreateEssay = null,
}) {
  const [busy, setBusy] = useState(null);
  if (!cards.length) return null;

  const earliest = cards.find(c => c.deadline?.iso);

  async function start(card, prompt) {
    if (!onCreateEssay) return;
    const key = `${card.key}:${prompt.id}`;
    setBusy(key);
    try { await onCreateEssay(essayRowForProgramPrompt(card, prompt)); }
    finally { setBusy(null); }
  }

  return (
    <div style={{
      ...glass({ padding: isMobile ? 15 : 18 }),
      background: `linear-gradient(120deg,${tint(accent, 0.07)},rgba(255,255,255,0.02) 55%)`,
      border: `1px solid ${tint(accent, 0.26)}`,
    }}>
      <SectionTitle icon={Stethoscope} color={accent}>
        The essays your tracked programs ask for
      </SectionTitle>

      <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.65, margin: '0 0 13px' }}>
        These come from the combined-degree and direct-admit programs you saved in Combined Degrees — not from your
        general college list. Each one is a <b style={{ color: C.t1 }}>separate application</b> on top of the
        university's own, and its round is usually earlier than the November date everything else runs on.
        {earliest?.deadline?.iso && (
          <> The soonest of yours is <b style={{ color: C.t1 }}>{earliest.title}</b>, {earliest.deadline.label}
            {earliest.deadline.precision !== 'exact' ? ' (approximate — confirm on the program page)' : ''}.</>
        )}
      </p>

      <div style={CC({ gap: 11 })}>
        {cards.map(card => (
          <div key={card.key} style={{ ...glass2({ padding: 14 }), borderLeft: `3px solid ${card.binding ? C.rose : accent}` }}>
            <div style={R({ gap: 8, flexWrap: 'wrap', marginBottom: 7 })}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.t1, lineHeight: 1.4 }}>{card.title}</span>
              {card.roundLabel && <span style={pill(tint(accent, 0.14), accent, { fontSize: 9 })}>{card.roundLabel}</span>}
              {card.binding && <span style={pill(C.roseDim, C.roseL, { fontSize: 9 })}>binding</span>}
            </div>

            {card.deadline?.iso && (
              <div style={R({ gap: 6, marginBottom: 8 })}>
                <CalendarClock size={11} color={card.deadline.urgency === 'critical' || card.deadline.urgency === 'urgent' ? C.amberL : C.t3} />
                <span style={{ fontSize: 11, color: C.t3 }}>
                  Application due {card.deadline.label}
                  {card.deadline.precision !== 'exact' && ' — approximate, confirm on the program page'}
                  {card.deadline.daysOut != null && ` · ${card.deadline.daysOut} days out`}
                </span>
              </div>
            )}

            {card.prompts.length > 0 ? (
              <div style={CC({ gap: 8 })}>
                {card.prompts.map(prompt => {
                  const started = isPromptStarted(essays, card, prompt);
                  const key = `${card.key}:${prompt.id}`;
                  return (
                    <div key={prompt.id} style={{ ...glass2({ padding: '10px 12px' }), background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.65 }}>“{prompt.text}”</div>
                      <div style={R({ gap: 8, marginTop: 9, flexWrap: 'wrap' })}>
                        <span style={{ fontSize: 10, color: C.t4 }}>
                          No word limit published — we set 500 as a working target; confirm the real one.
                        </span>
                        <span style={{ flex: 1 }} />
                        {started ? (
                          <span style={pill(tint(C.green, 0.12), C.greenL, { fontSize: 9.5 })}><Check size={9} /> in your essays</span>
                        ) : onCreateEssay && (
                          <button style={btnSm(tint(accent, 0.16), { color: onTint(accent), fontSize: 11 })}
                            disabled={busy === key} onClick={() => start(card, prompt)}>
                            {busy === key ? <Loader2 size={11} className="spin" /> : <Plus size={11} />}Start this one
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // The honest empty state, and the one that does the most work.
              <div style={{ ...glass2({ padding: '10px 12px' }), display: 'flex', gap: 8, alignItems: 'flex-start', border: `1px solid ${tint(C.amber, 0.22)}` }}>
                <AlertTriangle size={12} color={C.amberL} style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>
                  {card.required
                    ? 'This program requires its own supplemental application, and its prompts are not published outside the applicant portal. We will not invent them — open the program page and copy the real ones in as soon as the portal opens.'
                    : 'We do not have this program’s supplemental requirements on file. Check the program page before you plan your autumn around the university’s own deadlines.'}
                </div>
              </div>
            )}

            {card.note && (
              <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.6, marginTop: 9, fontStyle: 'italic' }}>{card.note}</div>
            )}

            {card.url && (
              <a href={card.url} target="_blank" rel="noopener noreferrer"
                style={{ ...btnSm(C.s3, { color: C.t3, fontSize: 11, marginTop: 10 }), textDecoration: 'none', display: 'inline-flex' }}>
                <ExternalLink size={11} />The program's own page
              </a>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <HelpNote>
          Starting one of these creates a tracked essay linked to that school, with the prompt already filled in. Nothing
          here is submitted anywhere — and every word limit shown as unconfirmed really is unconfirmed.
        </HelpNote>
      </div>
    </div>
  );
}
