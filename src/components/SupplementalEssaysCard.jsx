import React, { useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Brain, Loader2, Plus, PenLine, ChevronDown, ChevronUp, Info, Check, X } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, btnG, inp, R, CC, pill, tint } from '../lib/theme';
import { resolveSupplements, CONFIDENCE_LABELS } from '../lib/supplementalPrompts';
import { buildEssayCriticPrompt, critiqueEssay, wordCount } from '../lib/essayCritique';
import EssayCritique from './EssayCritique';

// ─────────────────────────────────────────────────────────────────────────────
// "You have Duke on your list — want to see what Duke actually asks?"
//
// The Essay Workspace used to be a blank textarea: it tracked essays a student
// already knew they owed, and had no opinion about the ones they didn't. A
// student with Duke on their college list found out about Duke's 250-word "why
// Duke" plus its four optional identity essays in October, inside the Common
// App, with a deadline attached.
//
// This card closes that loop end to end: it reads their real college list,
// offers the supplements for a school on it, and then — the part that actually
// builds the skill — lets them answer each prompt right here, under the real
// word limit, and get graded on it by the same critic that grades their real
// drafts. Practice that is graded softer than the real thing teaches students to
// be worse, so the mock answers go through the identical rubric.
// ─────────────────────────────────────────────────────────────────────────────

const KIND_LABELS = {
  why_school: 'Why this school', why_major: 'Why this major', community: 'Community',
  identity: 'Identity & perspective', activity: 'Activity elaboration',
  intellectual: 'Intellectual curiosity', creative: 'Creative', short: 'Short answer',
};

const TONE_FG = { good: C.greenL, warn: C.amberL, critical: C.roseL };

export default function SupplementalEssaysCard({
  colleges = [], user = null, gradeLabel = null, portfolioCtx = null,
  accent = C.violet, onCreateEssay = null, existingEssays = [],
}) {
  const [dismissed, setDismissed] = useState(false);
  const [activeId, setActiveId] = useState(colleges[0]?.id || null);
  const [resolved, setResolved] = useState({});   // collegeId -> { loading, error, data }
  const [openKey, setOpenKey] = useState(null);   // which prompt's practice composer is open
  const [answers, setAnswers] = useState({});     // promptKey -> draft text
  const [grades, setGrades] = useState({});       // promptKey -> { loading, error, critique }
  const [saving, setSaving] = useState(null);     // promptKey mid-save

  const activeCollege = useMemo(
    () => colleges.find(c => c.id === activeId) || colleges[0] || null,
    [colleges, activeId]
  );
  const view = activeCollege ? resolved[activeCollege.id] : null;

  const load = useCallback(async (college) => {
    if (!college) return;
    setResolved(prev => ({ ...prev, [college.id]: { loading: true, error: null, data: null } }));
    try {
      const data = await resolveSupplements(college.name);
      setResolved(prev => ({ ...prev, [college.id]: { loading: false, error: null, data } }));
    } catch (err) {
      setResolved(prev => ({ ...prev, [college.id]: { loading: false, error: err.message, data: null } }));
    }
  }, []);

  function selectCollege(id) {
    setActiveId(id);
    setOpenKey(null);
    const college = colleges.find(c => c.id === id);
    if (college && !resolved[id]) load(college);
  }

  async function gradeAnswer(key, supp, essay) {
    const text = (answers[key] || '').trim();
    if (wordCount(text) < 20) { toast.error('Write at least a couple of real sentences first — there\'s nothing to critique yet.'); return; }
    setGrades(prev => ({ ...prev, [key]: { loading: true, error: null, critique: null } }));
    try {
      const system = buildEssayCriticPrompt({
        user, gradeLabel,
        title: `${supp.school} supplemental — ${KIND_LABELS[essay.kind] || 'supplemental essay'}`,
        prompt: essay.prompt,
        wordLimit: essay.wordLimit || null,
        collegeName: supp.school,
        mode: 'mock',
        portfolio: portfolioCtx,
        draftWordCount: wordCount(text),
      });
      const critique = await critiqueEssay({ draft: text, system });
      setGrades(prev => ({ ...prev, [key]: { loading: false, error: null, critique } }));
    } catch (err) {
      setGrades(prev => ({ ...prev, [key]: { loading: false, error: err.message, critique: null } }));
    }
  }

  async function saveToWorkspace(key, supp, essay, { withContent }) {
    if (!onCreateEssay) return;
    setSaving(key);
    try {
      await onCreateEssay({
        title: `${supp.school} — ${KIND_LABELS[essay.kind] || 'Supplemental'}`,
        prompt: essay.prompt,
        word_limit: essay.wordLimit || 250,
        college_id: activeCollege?.id || null,
        content: withContent ? (answers[key] || '') : '',
      });
      toast.success('Added to your Essay Workspace');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(null);
    }
  }

  if (!colleges.length || dismissed) return null;

  // ── The offer — Medabrain asking first, before any network call ────────────
  // Deliberately a question rather than an auto-expanded list: the answer costs a
  // model call for uncurated schools, and a student who didn't ask for a wall of
  // essay prompts shouldn't be handed one.
  if (!view) {
    const name = activeCollege?.name || 'your school';
    return (
      <div style={{ ...glass({ padding: 18 }), background: `linear-gradient(120deg,${tint(C.violet, 0.1)},rgba(255,255,255,0.02) 55%)`, border: `1px solid ${tint(C.violet, 0.28)}` }}>
        <div style={R({ gap: 10, alignItems: 'flex-start' })}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg,${C.violet},${C.indigo})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Brain size={15} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, color: C.t1, lineHeight: 1.6, fontWeight: 600 }}>
              You have <strong>{name}</strong> on your college list. Want to see the supplemental essays {name} asks for?
            </div>
            <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.6, marginTop: 6 }}>
              I'll pull up the prompts, you can answer them right here under the real word limit, and I'll grade what you write the same way I'd grade a draft you were about to submit.
            </div>
            {colleges.length > 1 && (
              <div style={{ marginTop: 12 }}>
                <select style={inp({ width: 'auto', maxWidth: '100%', fontSize: 12.5 })} value={activeCollege?.id || ''} onChange={e => setActiveId(e.target.value)}>
                  {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div style={R({ gap: 8, marginTop: 12, flexWrap: 'wrap' })}>
              <button style={btn(`linear-gradient(135deg,${C.violet},${C.indigo})`, { fontSize: 12.5, padding: '9px 16px' })} onClick={() => load(activeCollege)}>
                Yes — show me {activeCollege?.name?.split(' ')[0] || 'them'}'s supplements
              </button>
              <button style={btnG({ fontSize: 12.5, padding: '9px 16px' })} onClick={() => setDismissed(true)}>Not now</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...glass({ padding: 18 }), border: `1px solid ${tint(C.violet, 0.24)}` }}>
      <div style={R({ gap: 10, justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 14 })}>
        <div style={R({ gap: 9 })}>
          <Brain size={15} color={C.violetL} />
          <span style={{ fontSize: 13.5, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>
            Supplemental essays{view.data ? ` — ${view.data.school}` : ''}
          </span>
        </div>
        <div style={R({ gap: 8 })}>
          {colleges.length > 1 && (
            <select style={inp({ width: 'auto', fontSize: 12 })} value={activeCollege?.id || ''} onChange={e => selectCollege(e.target.value)}>
              {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3, padding: 4 }} onClick={() => setDismissed(true)} title="Hide"><X size={15} /></button>
        </div>
      </div>

      {view.loading && (
        <div style={R({ gap: 8, color: C.t3, fontSize: 12.5 })}>
          <Loader2 size={14} className="spin" />Pulling up {activeCollege?.name}'s prompts…
        </div>
      )}

      {view.error && (
        <div style={CC({ gap: 10 })}>
          <div style={{ fontSize: 12.5, color: C.roseL }}>{view.error}</div>
          <div><button style={btnG({ fontSize: 12, padding: '7px 14px' })} onClick={() => load(activeCollege)}>Try again</button></div>
        </div>
      )}

      {view.data && (
        <div style={CC({ gap: 12 })}>
          {view.data.summary && <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6 }}>{view.data.summary}</div>}

          {view.data.essays.length === 0 && (
            <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6 }}>
              Medabrain doesn't have supplemental prompts for {view.data.school} — many large public universities require none at all. Check the school's application page to be sure, and if they do ask for one, add it as an essay below and paste the prompt in.
            </div>
          )}

          {view.data.essays.map((essay, i) => {
            const key = `${activeCollege.id}:${essay.id || i}`;
            const isOpen = openKey === key;
            const conf = CONFIDENCE_LABELS[essay.confidence] || CONFIDENCE_LABELS.representative;
            const answer = answers[key] || '';
            const wc = wordCount(answer);
            const limit = essay.wordLimit || 0;
            const over = limit > 0 && wc > limit;
            const alreadyTracked = existingEssays.some(e => (e.prompt || '').trim() === essay.prompt.trim());

            return (
              <div key={key} style={{ ...glass2({ padding: 14 }), borderLeft: `3px solid ${essay.required ? C.violet : C.b2}` }}>
                <div style={R({ gap: 6, flexWrap: 'wrap', marginBottom: 8 })}>
                  <span style={pill(tint(accent, 0.14), accent, { fontSize: 10 })}>{KIND_LABELS[essay.kind] || 'Supplemental'}</span>
                  <span style={pill('rgba(255,255,255,0.05)', essay.required ? C.t2 : C.t4, { fontSize: 10 })}>{essay.required ? 'Required' : 'Optional'}</span>
                  {limit > 0 && <span style={pill('rgba(255,255,255,0.05)', C.t3, { fontSize: 10 })}>{limit} words</span>}
                  <span style={pill('rgba(255,255,255,0.05)', TONE_FG[conf.tone] || C.t3, { fontSize: 10 })}>{conf.label}</span>
                  {alreadyTracked && <span style={pill(C.greenDim, C.greenL, { fontSize: 10 })}><Check size={9} style={{ marginRight: 3 }} />In your workspace</span>}
                </div>

                <div style={{ fontSize: 13, color: C.t1, lineHeight: 1.6 }}>{essay.prompt}</div>

                <div style={R({ gap: 8, marginTop: 12, flexWrap: 'wrap' })}>
                  <button
                    style={btnSm(tint(C.violet, 0.15), { color: C.violetL, border: `1px solid ${tint(C.violet, 0.28)}`, fontSize: 12 })}
                    onClick={() => setOpenKey(isOpen ? null : key)}
                  >
                    <PenLine size={12} />{isOpen ? 'Close' : 'Answer it now'}{isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {onCreateEssay && (
                    <button style={btnG({ fontSize: 12, padding: '6px 13px' })} disabled={saving === key} onClick={() => saveToWorkspace(key, view.data, essay, { withContent: false })}>
                      <Plus size={12} />Add to my essays
                    </button>
                  )}
                </div>

                {isOpen && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.b1}` }}>
                    <div style={R({ justifyContent: 'space-between', marginBottom: 7 })}>
                      <span style={{ fontSize: 11, color: C.t3 }}>Write it here — real prompt, real limit, real grading.</span>
                      <span style={{ fontSize: 11, color: over ? C.roseL : C.t3 }}>{wc}{limit > 0 ? ` / ${limit}` : ''} words</span>
                    </div>
                    <textarea
                      style={{ ...inp(), minHeight: 170, resize: 'vertical', lineHeight: 1.6 }}
                      value={answer}
                      onChange={e => setAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder="Answer the prompt as if you were submitting it…"
                    />
                    {over && (
                      <div style={R({ gap: 6, marginTop: 7, fontSize: 11, color: C.roseL })}>
                        <Info size={11} />{wc - limit} words over. On the real form this gets cut off, not politely flagged.
                      </div>
                    )}

                    <div style={R({ gap: 8, marginTop: 12, flexWrap: 'wrap' })}>
                      <button
                        style={btn(`linear-gradient(135deg,${C.violet},${C.indigo})`, { fontSize: 12.5, padding: '9px 16px', opacity: grades[key]?.loading ? 0.6 : 1 })}
                        disabled={grades[key]?.loading}
                        onClick={() => gradeAnswer(key, view.data, essay)}
                      >
                        {grades[key]?.loading ? <Loader2 size={13} className="spin" /> : <Brain size={13} />}
                        Grade this — honestly
                      </button>
                      {onCreateEssay && wc > 0 && (
                        <button style={btnG({ fontSize: 12, padding: '9px 15px' })} disabled={saving === key} onClick={() => saveToWorkspace(key, view.data, essay, { withContent: true })}>
                          <Plus size={12} />Save this draft to my essays
                        </button>
                      )}
                    </div>

                    {(grades[key]?.loading || grades[key]?.error || grades[key]?.critique) && (
                      <div style={{ marginTop: 12 }}>
                        <EssayCritique
                          state={grades[key]}
                          onRun={() => gradeAnswer(key, view.data, essay)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div style={R({ gap: 7, alignItems: 'flex-start', paddingTop: 4 })}>
            <Info size={11} color={C.t4} style={{ marginTop: 3, flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, color: C.t4, lineHeight: 1.55 }}>
              {(CONFIDENCE_LABELS[view.data.essays[0]?.confidence] || CONFIDENCE_LABELS.curated).note}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
