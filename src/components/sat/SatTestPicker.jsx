import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Play, Shuffle, ExternalLink, FileText, Check, Award, Sparkles, ChevronDown, PenLine,
} from 'lucide-react';
import { C, glass2, btnG, R, CC, tint, pill } from '../../lib/theme';
import { SatCard, satBtn } from './satUi';
import { FRESH_MIX, OFFICIAL_BLUEBOOK_TEST, OFFICIAL_LINEAR_TESTS } from '../../data/sat/forms';
import { formPickerRows } from '../../lib/sat/forms';

// ─────────────────────────────────────────────────────────────────────────────
// Choosing which full-length test to sit.
//
// The panel used to have a single "Start full test" button that built a test
// from the clock. This replaces it with a catalog, for two reasons a student
// feels immediately:
//
//   · A test you can name is a test you can plan around and compare against.
//     "I'm sitting Form C on Saturday" is a study plan; "I'll press the button
//     again" is not.
//   · It puts the OFFICIAL tests in the same list as ours, ranked above them,
//     which is where they belong. The most useful thing this panel can do for a
//     student's score is send them to Bluebook — so it does, in the same list,
//     rather than burying the link in a resources tab.
//
// Every row states what it costs a student to pick it: how many of its
// questions they have already seen, and whether it overlaps earlier forms. A
// picker that hid that would be worse than no picker, because it would let them
// mistake a re-run for a fresh measurement.
// ─────────────────────────────────────────────────────────────────────────────

const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function SatTestPicker({
  attempts, seenIds, accent = C.sky, isMobile = false, disabled = false,
  onStart, onLogOfficial,
}) {
  const [logging, setLogging] = useState(null);   // an official test being logged
  const [showLinear, setShowLinear] = useState(false);

  const rows = useMemo(() => formPickerRows({ attempts, seenIds }), [attempts, seenIds]);

  const officialLogged = useMemo(() => {
    const by = {};
    for (const a of attempts) {
      const id = a.meta?.official?.testId;
      if (id && a.status === 'complete') (by[id] ||= []).push(a);
    }
    return by;
  }, [attempts]);

  return (
    <div style={CC({ gap: 16 })}>
      {/* ── Official first. They are better than ours and saying so is the ──
          ── only honest ordering. ────────────────────────────────────────── */}
      <SatCard title="Official College Board tests" icon={Award} iconColor={C.gold} m={isMobile}>
        <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55, marginBottom: 12 }}>
          These are written by the people who write the real exam, and they are free. Sit them in
          College Board&rsquo;s own app or on paper, then bring the score back here — logged scores
          chart alongside your in-app tests and feed the same projection.
        </div>

        <OfficialRow
          test={OFFICIAL_BLUEBOOK_TEST}
          accent={C.gold}
          logged={officialLogged[OFFICIAL_BLUEBOOK_TEST.id] || []}
          onLog={() => setLogging(OFFICIAL_BLUEBOOK_TEST)}
          primary
        />

        <button
          onClick={() => setShowLinear(v => !v)}
          style={{ ...btnG({ marginTop: 12, width: '100%', justifyContent: 'space-between' }) }}
        >
          <span style={R({ gap: 8 })}>
            <FileText size={13} />
            {OFFICIAL_LINEAR_TESTS.length} printable official tests (PDF, linear)
          </span>
          <ChevronDown size={14} style={{ transform: showLinear ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>

        {showLinear && (
          <div style={{ ...CC({ gap: 8 }), marginTop: 8 }}>
            <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.55 }}>
              Linear, not adaptive: everyone gets the same Module 2, so these cannot show you which
              module you would have routed into. Use them for content practice, and Bluebook or an
              in-app form when you want a realistic score.
            </div>
            {OFFICIAL_LINEAR_TESTS.map(t => (
              <OfficialRow
                key={t.id}
                test={t}
                accent={C.gold}
                logged={officialLogged[t.id] || []}
                onLog={() => setLogging(t)}
                compact
              />
            ))}
          </div>
        )}
      </SatCard>

      {/* ── In-app forms ──────────────────────────────────────────────────── */}
      <SatCard title="Tests in this app" icon={Play} iconColor={accent} m={isMobile}>
        <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55, marginBottom: 12 }}>
          Each form is a fixed, full-length adaptive test — the same questions in the same order
          every time, so a score on Form B this month is comparable with your Form B last month.
          Forms are laid out so the early ones share no questions at all.
        </div>

        <div style={CC({ gap: 8 })}>
          {rows.map(row => (
            <FormRow
              key={row.id} row={row} accent={accent} disabled={disabled}
              onStart={() => onStart(row.id)}
            />
          ))}

          <div style={{
            ...glass2({ padding: 12 }),
            borderColor: tint(C.teal, 0.22),
          }}>
            <div style={{ ...R({ gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }) }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={R({ gap: 8 })}>
                  <Shuffle size={13} color={C.teal} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{FRESH_MIX.label}</span>
                </div>
                <div style={{ fontSize: 11.5, color: C.t2, marginTop: 4, lineHeight: 1.55 }}>
                  {FRESH_MIX.blurb}
                </div>
              </div>
              <button
                onClick={() => onStart(FRESH_MIX.id)}
                disabled={disabled}
                style={satBtn(C.teal, { opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'pointer' })}
              >
                <Play size={13} /> Start
              </button>
            </div>
          </div>
        </div>
      </SatCard>

      {logging && (
        <LogOfficialScore
          test={logging}
          accent={C.gold}
          isMobile={isMobile}
          onCancel={() => setLogging(null)}
          onSave={async (payload) => {
            await onLogOfficial(logging, payload);
            setLogging(null);
          }}
        />
      )}
    </div>
  );
}

// ── One in-app form ─────────────────────────────────────────────────────────
function FormRow({ row, accent, disabled, onStart }) {
  const { freshness, seen } = row;
  const allNew = freshness.reused === 0;
  const seenPct = seen.total ? Math.round(seen.ratio * 100) : 0;

  return (
    <div style={{ ...glass2({ padding: 12 }) }}>
      <div style={{ ...R({ gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }) }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={R({ gap: 8, flexWrap: 'wrap' })}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{row.label}</span>
            {row.sittings > 0 ? (
              <span style={pill(tint(C.green, 0.14), C.green, { fontSize: 10.5 })}>
                <Check size={10} style={{ marginRight: 4 }} />
                {row.bestComposite ?? '—'} · {fmtDate(row.lastTakenAt)}
              </span>
            ) : (
              <span style={pill(tint(accent, 0.14), accent, { fontSize: 10.5 })}>Not taken</span>
            )}
            {allNew && (
              <span style={pill(tint(C.teal, 0.14), C.teal, { fontSize: 10.5 })}>
                <Sparkles size={10} style={{ marginRight: 4 }} /> All-new questions
              </span>
            )}
          </div>

          <div style={{ fontSize: 11.5, color: C.t2, marginTop: 4, lineHeight: 1.55 }}>
            {row.blurb}
          </div>

          {/* The honest line. Two different things can make a form stale — it
              overlaps an earlier FORM, or this student has already answered its
              questions somewhere else in the app — and they are worth saying
              separately, because only the second one is about them. */}
          <div style={{ fontSize: 10.5, color: C.t3, marginTop: 8, fontFamily: C.FM }}>
            {!allNew && `${Math.round(freshness.ratio * 100)}% of this form is unused by earlier forms · `}
            {seen.seen === 0
              ? 'none of these questions are ones you have answered before'
              : `you have already answered ${seen.seen} of its ${seen.total} questions (${seenPct}%)`}
          </div>
        </div>

        <button
          onClick={onStart}
          disabled={disabled}
          style={satBtn(accent, { opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'pointer' })}
        >
          <Play size={13} /> {row.sittings > 0 ? 'Retake' : 'Start'}
        </button>
      </div>
    </div>
  );
}

// ── One official test ───────────────────────────────────────────────────────
function OfficialRow({ test, accent, logged, onLog, primary = false, compact = false }) {
  const best = logged.reduce(
    (b, a) => (!b || (a.result?.composite || 0) > (b.result?.composite || 0) ? a : b),
    null,
  );
  return (
    <div style={{
      ...glass2({ padding: compact ? 11 : 14 }),
      ...(primary ? { borderColor: tint(accent, 0.3) } : null),
    }}>
      <div style={{ ...R({ gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }) }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={R({ gap: 8, flexWrap: 'wrap' })}>
            <span style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: C.t1 }}>{test.label}</span>
            <span style={pill(tint(accent, 0.14), accent, { fontSize: 10 })}>Official</span>
            {best && (
              <span style={pill(tint(C.green, 0.14), C.green, { fontSize: 10.5 })}>
                <Check size={10} style={{ marginRight: 4 }} />
                {best.result.composite} · {fmtDate(best.finishedAt || best.startedAt)}
              </span>
            )}
          </div>
          {!compact && (
            <div style={{ fontSize: 11.5, color: C.t2, marginTop: 4, lineHeight: 1.55 }}>{test.blurb}</div>
          )}
          {!compact && test.why && (
            <div style={{ fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.55 }}>{test.why}</div>
          )}
        </div>

        <div style={R({ gap: 8, flexWrap: 'wrap' })}>
          <a
            href={test.url} target="_blank" rel="noopener noreferrer"
            style={{ ...btnG({ textDecoration: 'none', padding: '8px 12px', fontSize: 12 }) }}
          >
            <ExternalLink size={12} /> {test.delivery === 'paper' ? 'PDF' : 'Open'}
          </a>
          {test.answersUrl && (
            <a
              href={test.answersUrl} target="_blank" rel="noopener noreferrer"
              style={{ ...btnG({ textDecoration: 'none', padding: '8px 12px', fontSize: 12 }) }}
            >
              Answers
            </a>
          )}
          {test.scoringUrl && (
            <a
              href={test.scoringUrl} target="_blank" rel="noopener noreferrer"
              style={{ ...btnG({ textDecoration: 'none', padding: '8px 12px', fontSize: 12 }) }}
            >
              Scoring
            </a>
          )}
          <button onClick={onLog} style={{ ...btnG({ padding: '8px 12px', fontSize: 12, color: accent, borderColor: tint(accent, 0.35) }) }}>
            <PenLine size={12} /> Log score
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Recording a score from a test taken elsewhere ───────────────────────────
//
// Section scores, not a composite. The composite is the sum, so asking for it
// directly would let a student enter 1350 with no section split, and every
// downstream surface in this tab — the projection, the section chips, the
// "which half is holding you back" copy — is built on the split.
function LogOfficialScore({ test, accent, isMobile, onCancel, onSave }) {
  const [rw, setRw] = useState('');
  const [math, setMath] = useState('');
  const [label, setLabel] = useState('');
  const [takenOn, setTakenOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const rwN = Number(rw);
  const mathN = Number(math);
  const validScore = (n) => Number.isFinite(n) && n >= 200 && n <= 800 && n % 10 === 0;
  const ok = validScore(rwN) && validScore(mathN);
  const composite = ok ? rwN + mathN : null;

  const field = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: `1px solid ${C.b2}`, background: C.surf2, color: C.t1,
    fontSize: 13, fontFamily: C.FM, outline: 'none',
  };
  const labelStyle = { fontSize: 10.5, fontWeight: 700, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 4, display: 'block' };

  async function save() {
    if (!ok) { toast.error('Section scores must be between 200 and 800, in steps of 10.'); return; }
    setSaving(true);
    try {
      await onSave({
        rw: rwN,
        math: mathN,
        composite,
        label: label.trim() || null,
        takenAt: new Date(`${takenOn}T12:00:00`).getTime(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SatCard title={`Log your score — ${test.label}`} icon={PenLine} iconColor={accent} m={isMobile}>
      <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55, marginBottom: 12 }}>
        Enter the two section scores from your score report. They are recorded as a full-length
        test, so they show up in your score history and become the basis of your projection —
        an official score is better evidence than anything measured in here.
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 12,
      }}>
        <div>
          <label style={labelStyle} htmlFor="official-rw">Reading &amp; writing</label>
          <input
            id="official-rw" style={field} inputMode="numeric" placeholder="200–800"
            value={rw} onChange={e => setRw(e.target.value.replace(/[^0-9]/g, ''))}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="official-math">Math</label>
          <input
            id="official-math" style={field} inputMode="numeric" placeholder="200–800"
            value={math} onChange={e => setMath(e.target.value.replace(/[^0-9]/g, ''))}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="official-date">Date taken</label>
          <input
            id="official-date" type="date" style={field}
            value={takenOn} onChange={e => setTakenOn(e.target.value)}
          />
        </div>
        {test.delivery === 'bluebook' && (
          <div>
            <label style={labelStyle} htmlFor="official-which">Which Bluebook test? (optional)</label>
            <input
              id="official-which" style={field} placeholder="e.g. Practice Test 7"
              value={label} onChange={e => setLabel(e.target.value)}
            />
          </div>
        )}
      </div>

      <div style={{ ...R({ gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }), marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: composite ? C.t1 : C.t4, fontFamily: C.FM }}>
          {composite ? `Composite ${composite}` : 'Composite —'}
        </div>
        <div style={R({ gap: 8, flexWrap: 'wrap' })}>
          <button onClick={onCancel} style={btnG()}>Cancel</button>
          <button
            onClick={save}
            disabled={!ok || saving}
            style={satBtn(accent, { opacity: ok && !saving ? 1 : 0.45, cursor: ok && !saving ? 'pointer' : 'not-allowed' })}
          >
            <Check size={13} /> {saving ? 'Saving…' : 'Save score'}
          </button>
        </div>
      </div>
    </SatCard>
  );
}
