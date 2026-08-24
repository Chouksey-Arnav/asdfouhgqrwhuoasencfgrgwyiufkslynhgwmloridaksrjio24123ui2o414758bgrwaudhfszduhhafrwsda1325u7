// ─────────────────────────────────────────────────────────────────────────────
// The MedEx Score, in full.
//
// The Home card carries the number and the one next action. This is where the
// number is DEFENDED — and that is the actual job of this panel, because a
// single score is the easiest thing in the whole app to disbelieve, and a
// student who disbelieves it quietly stops acting on it.
//
// So the order below is an argument, not a layout:
//
//   1. The dial, the seal, and the history        — what it is
//   2. What it is measured against                — what it means
//   3. The five pillars, openable to raw z        — where it comes from
//   4. What would move it, in points              — what to do
//   5. Every school on their list, scored         — "for every college, a score"
//   6. The apex slate                             — the reference that cannot be gamed
//   7. Why it is not a probability, and how wrong it might be
//
// Section 7 is last and is not optional. Everything above it is more persuasive
// than it deserves to be on its own.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useMemo } from 'react';
import {
  Activity, Layers, TrendingUp, GraduationCap, Sparkles, Scale, ChevronDown,
  ChevronRight, Target, ShieldAlert, Info, History, ArrowUpRight, CircleHelp,
} from 'lucide-react';
import { C, glass, glass2, pill, R, CC, tint, btnG, autoGrid } from '../../lib/theme';
import PanelHero, { SectionTitle } from '../ui/PanelHero';
import Disclosure, { HelpNote, HowItWorks } from '../ui/Disclosure';
import MedExRing, { bandColor } from './MedExRing';
import MedExHistoryChart from './MedExHistoryChart';
import SealCountdown from './SealCountdown';
import {
  MEDEX_COPY, MEDEX_COHORT_MEDIAN, MEDEX_MAX, BANDS, bandFor, weekLabel,
} from '../../lib/medex';

export default function MedExPanel({
  state = null,        // { loading, medex, seal, rows }
  onGoTo = null,       // (sectionKey) → the Portfolio section a mover is actioned in
  onOpenCalculator = null,
  isMobile = false,
  reducedMotion = false,
}) {
  const m = isMobile;
  const medex = state?.medex || null;
  const seal = state?.seal || null;
  const rows = state?.rows || [];
  const headline = medex?.headline || null;

  if (state?.loading || !medex?.available || !headline) {
    return <Loading m={m} />;
  }

  const scored = headline.showsScore;
  const color = scored ? bandColor(headline.band) : C.blue;
  const shown = seal?.sealedScore ?? headline.score;

  return (
    <div style={CC({ gap: 20 })}>
      <PanelHero tourTag="medex-panel" icon={Activity} color={color} color2={C.violet} m={m}
        eyebrow={MEDEX_COPY.name}
        title={MEDEX_COPY.tagline}
        sub={`One number, 0–${MEDEX_MAX}, for where your profile currently sits against the students who actually get admitted at ${headline.program.name}. It is built from the same five-layer model as the Admissions Calculator, so the two can never tell you different things — and it seals once a week rather than twitching every time you log an hour.`}
        stats={scored ? [
          { value: shown, label: `of ${MEDEX_MAX}`, color },
          { value: headline.atOrAboveCohort ? '✓' : headline.toCohort, label: headline.atOrAboveCohort ? 'at the admitted median' : 'to the admitted median', color: headline.atOrAboveCohort ? C.green : C.amber },
          { value: `${headline.coverage.loggedCount}/${headline.coverage.total}`, label: 'dimensions logged', color: C.blue },
        ] : []} />

      <HowItWorks id="medex-v1" color={color} m={m} title="How the MedEx Score works"
        steps={[
          { title: '850 is the median admitted student — not the 25th percentile', body: 'Every other admissions score benchmarks you against the bottom quarter of an admitted class, because it makes far more students look "qualified". Clearing a low bar quietly becomes likely, and likely is the most consequential word on the screen. 850 here means you look like the MIDDLE of the class that got in.' },
          { title: 'It is measured against a specific, named program', body: 'The most selective school on your own list. A score with no benchmark attached is a vanity number — the same portfolio genuinely is in a different position at a 3% program than at a 40% one, and one number that ignores that is lying to somebody.' },
          { title: 'It is not a probability, and it never converts to one', body: MEDEX_COPY.notAProbability },
          { title: 'It gets harder near the top, deliberately', body: 'The scale pays about 240 points per standard deviation below the cohort median and about 40 above it. Past the median you are competing inside a pool already filtered on everything a model can see, and separation there is decided by letters, essays and readers. Paying full points into that region would be inventing precision.' },
          { title: 'It seals weekly, and logging can move it down', body: MEDEX_COPY.canGoDown },
        ]} />

      {/* ── 1. What it is ──────────────────────────────────────────────── */}
      {scored ? (
        <div style={glass({ padding: m ? 16 : 22 })}>
          <div style={{ display: 'flex', gap: m ? 16 : 26, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <MedExRing
              score={shown} band={headline.band} range={headline.range}
              size={m ? 190 : 230} stroke={m ? 14 : 17}
              caption={`of ${MEDEX_MAX}`}
              reducedMotion={reducedMotion} idPrefix="medex-panel"
            />
            <div style={{ flex: 1, minWidth: 250, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>
                  {headline.band.label}
                </div>
                <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }}>{headline.band.blurb}</div>
              </div>

              <div style={glass2({ padding: 12 })}>
                <div style={R({ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' })}>
                  <span style={{ fontSize: 11, color: C.t3 }}>Our confidence in this number</span>
                  <span style={pill(tint(C.blue, 0.14), C.blueL, { fontFamily: C.FM, fontSize: 10.5 })}>
                    {headline.range.low}–{headline.range.high}
                  </span>
                </div>
                {/* `confidence` is {level,label,note}, not a string — rendering it
                    directly printed "[object Object]" to the student. */}
                {headline.confidence?.label && (
                  <div style={R({ gap: 4, marginTop: 8 })}>
                    <span style={pill(
                      tint(headline.confidence.level === 'high' ? C.green : headline.confidence.level === 'low' ? C.amber : C.blue, 0.15),
                      headline.confidence.level === 'high' ? C.greenL : headline.confidence.level === 'low' ? C.amberL : C.blueL,
                      { fontSize: 10 },
                    )}>{headline.confidence.label}</span>
                  </div>
                )}
                <div style={{ fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.5 }}>
                  {headline.confidence?.note || 'The band is the honest part — it is drawn on the dial too.'} Every reason it is that wide is listed at the bottom of this page.
                </div>
              </div>

              <SealCountdown banked={seal?.banked ?? null} accent={color} />
            </div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.b1}` }}>
            <SectionTitle icon={History} color={C.t3}>Your sealed weeks</SectionTitle>
            <MedExHistoryChart rows={rows} m={m} />
          </div>
        </div>
      ) : (
        <NoScore headline={headline} onGoTo={onGoTo} m={m} />
      )}

      {/* ── 2. What it is measured against ─────────────────────────────── */}
      <div style={glass({ padding: m ? 16 : 20 })}>
        <SectionTitle icon={Target} color={C.amberL}>Measured against</SectionTitle>
        <div style={R({ gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' })}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 15, letterSpacing: 'calc(-0.02px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD, lineHeight: 1.25 }}>
              {headline.program.name}
            </div>
            {headline.program.institution !== headline.program.name && (
              <div style={{ fontSize: 11.5, color: C.t3, marginTop: 4 }}>{headline.program.institution}</div>
            )}
            <div style={R({ gap: 4, flexWrap: 'wrap', marginTop: 8 })}>
              <span style={pill(C.s3, C.t2, { fontFamily: C.FM, fontSize: 10.5 })}>
                {headline.admitRate.published != null
                  ? `${(headline.admitRate.published * 100).toFixed(1)}% admitted`
                  : `~${Math.round(headline.admitRate.rate * 100)}% assumed`}
              </span>
              {headline.admitRate.isEstimate && (
                <span style={pill(tint(C.amber, 0.14), C.amberL, { fontSize: 10.5 })}>rate not published</span>
              )}
              {medex.benchmark.source === 'fallback' && (
                <span style={pill(tint(C.blue, 0.14), C.blueL, { fontSize: 10.5 })}>stand-in benchmark</span>
              )}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55, marginTop: 8 }}>{medex.benchmark.note}</div>
        {medex.benchmark.unresolved?.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <HelpNote color={C.amber} icon={Info}>
              We hold no admitted-student data for {medex.benchmark.unresolved.join(', ')}, so {medex.benchmark.unresolved.length === 1 ? 'it is' : 'they are'} not scored. That is usually a name typed by hand — re-adding {medex.benchmark.unresolved.length === 1 ? 'it' : 'them'} from the autocomplete fixes it.
            </HelpNote>
          </div>
        )}
      </div>

      {/* ── 3. Where it comes from ─────────────────────────────────────── */}
      {scored && (
        <div style={glass({ padding: m ? 16 : 20 })}>
          <SectionTitle icon={Layers} color={C.violetL}>What the score is made of</SectionTitle>
          <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginBottom: 12 }}>
            The weights are {headline.program.name}&rsquo;s own, not ours — this program reads as <strong style={{ color: C.t2 }}>{headline.program.emphasis}</strong>-emphasis. A pillar can be strong and still carry very little here, and that is worth more than a generic checklist.
          </div>
          <div style={CC({ gap: 8 })}>
            {headline.pillars.map(p => <PillarRow key={p.id} pillar={p} m={m} />)}
          </div>
        </div>
      )}

      {/* ── 4. What to do ──────────────────────────────────────────────── */}
      {scored && headline.movers.length > 0 && (
        <div style={glass({ padding: m ? 16 : 20 })}>
          <SectionTitle icon={TrendingUp} color={C.greenL}>What would move it</SectionTitle>
          <div style={CC({ gap: 8 })}>
            {headline.movers.map(mv => (
              <button key={mv.key} onClick={() => mv.pillar && onGoTo?.(mv.key)} style={{
                ...glass2({ padding: 12 }), textAlign: 'left', width: '100%',
                cursor: mv.pillar && onGoTo ? 'pointer' : 'default',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <span style={{
                  flexShrink: 0, minWidth: 46, textAlign: 'center', padding: '4px 4px', borderRadius: 8,
                  background: mv.points == null ? tint(C.blue, 0.13) : tint(C.green, 0.14),
                  color: mv.points == null ? C.blueL : C.greenL,
                  fontFamily: C.FM, fontWeight: 800, fontSize: 12,
                }}>{mv.points == null ? '±' : `+${mv.points}`}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: C.t1, lineHeight: 1.35 }}>{mv.label}</span>
                  {mv.detail && (
                    <span style={{ display: 'block', fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.5 }}>{mv.detail}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <HelpNote>{MEDEX_COPY.canGoDown}</HelpNote>
          </div>
        </div>
      )}

      {/* ── 5. Every college, scored ───────────────────────────────────── */}
      <div style={glass({ padding: m ? 16 : 20 })}>
        <SectionTitle icon={GraduationCap} color={C.blueL}>Your list, school by school</SectionTitle>
        {medex.colleges.rows.length === 0 ? (
          <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.55 }}>
            No schools on your list resolve to admitted-student data yet. Add them from the college autocomplete and each one gets its own MedEx Score here.
          </div>
        ) : (
          <div style={autoGrid(m ? 240 : 260, 10)}>
            {medex.colleges.rows.map(({ profile, result }) => (
              <CollegeCard key={profile.id} profile={profile} result={result}
                isBenchmark={profile.id === headline.program.id} />
            ))}
          </div>
        )}
      </div>

      {/* ── 6. The apex slate ──────────────────────────────────────────── */}
      {medex.apex && (
        <Disclosure id="medex-apex" icon={Sparkles} color={C.gold} m={m}
          title="Against the most selective programs in the country"
          sub={medex.apex.sentence}
          defaultOpen={false}>
          <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginBottom: 12 }}>
            This slate is fixed. It does not change when you edit your college list, which is exactly why it is here — it is the one reference nobody can improve by removing their reach program.
          </div>
          <ApexTable apex={medex.apex} m={m} />
        </Disclosure>
      )}

      {/* ── 7. The honesty section ─────────────────────────────────────── */}
      <div style={{
        ...glass({ padding: m ? 16 : 20 }),
        border: `1px solid ${tint(C.amber, 0.2)}`,
        background: `linear-gradient(140deg, ${tint(C.amber, 0.05)}, transparent 60%)`,
      }}>
        <SectionTitle icon={Scale} color={C.amberL}>What this number is not</SectionTitle>
        <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55, marginBottom: 12 }}>
          {MEDEX_COPY.notAProbability}
        </div>
        {onOpenCalculator && (
          <button onClick={onOpenCalculator} style={btnG({ fontSize: 12, padding: '8px 12px', marginBottom: 12 })}>
            Open the Admissions Calculator<ArrowUpRight size={12} />
          </button>
        )}

        {scored && headline.uncertainty?.reasons?.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 8 }}>
              Why the range is {headline.range.high - headline.range.low} points wide
            </div>
            <div style={CC({ gap: 8 })}>
              {headline.uncertainty.reasons.map(r => (
                <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{
                    flexShrink: 0, marginTop: 4, width: 6, height: 6, borderRadius: '50%',
                    background: r.fixable === false ? C.t4 : C.amber,
                  }} />
                  <span style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55 }}>{r.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {scored && headline.lottery && (
          <div style={{ marginTop: 12 }}>
            <HelpNote color={C.rose} icon={ShieldAlert}>
              {headline.program.name} resolves part of its cohort by explicit random selection. No amount of preparation removes that, and this score does not pretend otherwise.
            </HelpNote>
          </div>
        )}

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.b1}` }}>
          <BandLegend current={scored ? headline.band : null} />
        </div>
      </div>
    </div>
  );
}

/** One pillar, openable into the raw model dimensions underneath it. */
function PillarRow({ pillar, m }) {
  const [open, setOpen] = useState(false);
  const known = pillar.z != null;
  const col = !known ? C.t4 : pillar.atOrAboveCohort ? C.green : pillar.z > -0.8 ? C.amber : C.rose;
  const pct = Math.round(pillar.share * 100);

  return (
    <div style={glass2({ padding: 0, overflow: 'hidden' })}>
      <button onClick={() => setOpen(o => !o)} style={{
        all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'block',
        width: '100%', padding: m ? 11 : 13,
      }}>
        <div style={R({ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' })}>
          <span style={R({ gap: 8 })}>
            {open ? <ChevronDown size={13} color={C.t3} /> : <ChevronRight size={13} color={C.t3} />}
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{pillar.label}</span>
          </span>
          <span style={R({ gap: 8, flexWrap: 'wrap' })}>
            <span style={pill(C.s2, C.t3, { fontFamily: C.FM, fontSize: 10 })}>{pct}% of this score</span>
            {known && (
              <span style={pill(tint(col, 0.15), col, { fontFamily: C.FM, fontSize: 10.5 })}>
                {pillar.z >= 0 ? '+' : ''}{pillar.z.toFixed(2)}σ
              </span>
            )}
          </span>
        </div>

        {/* Position bar: center is the admitted median, which is the only
            reference point that makes a z legible to a non-statistician. */}
        {known && (
          <div style={{ marginTop: 8, position: 'relative', height: 6, borderRadius: 4, background: C.b1 }}>
            <div style={{ position: 'absolute', left: '50%', top: -3, bottom: -3, width: 1.5, background: C.t3, opacity: 0.6 }} />
            <div style={{
              position: 'absolute', top: 0, bottom: 0, borderRadius: 4, background: col,
              left: `${50 + Math.min(0, clampZ(pillar.z)) * 16.5}%`,
              width: `${Math.abs(clampZ(pillar.z)) * 16.5}%`,
            }} />
          </div>
        )}
        <div style={{ fontSize: 10.5, color: C.t3, marginTop: 8, lineHeight: 1.45 }}>
          {!known
            ? 'This program does not weight anything in this pillar, so it is not part of your score here.'
            // "Worth 0 points against not counting it at all" is technically the
            // truth and reads as a bug. A pillar can sit slightly off the median
            // and still round to no net swing, and that is worth saying plainly.
            : pillar.swing === 0
              ? `${pillar.atOrAboveCohort ? 'At or above' : 'Just below'} the median admitted student — close enough that at this program's weighting it is not moving your total either way.`
              : pillar.atOrAboveCohort
                ? `At or above the median admitted student. Worth ${pillar.swing > 0 ? `+${pillar.swing}` : pillar.swing} points to your total.`
                : `Below the median admitted student. ${pillar.swing < 0 ? `Costing you ${Math.abs(pillar.swing)} points` : `Worth +${pillar.swing} points`} against not counting it at all.`}
        </div>
      </button>

      {open && (
        <div style={{ padding: m ? '0 11px 11px' : '0 13px 13px', borderTop: `1px solid ${C.b1}`, paddingTop: 12 }}>
          <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55, marginBottom: 8 }}>{pillar.blurb}</div>
          {pillar.dimensions.map(d => (
            <div key={d.key} style={R({ justifyContent: 'space-between', gap: 8, padding: '4px 0px', flexWrap: 'wrap' })}>
              <span style={{ fontSize: 11.5, color: C.t2, textTransform: 'capitalize' }}>{d.key}</span>
              <span style={R({ gap: 4 })}>
                <span style={{ fontSize: 10.5, color: C.t4, fontFamily: C.FM }}>weight {(d.weight * 100).toFixed(0)}%</span>
                <span style={{
                  fontSize: 10.5, fontFamily: C.FM,
                  color: d.z == null ? C.t4 : d.z >= 0 ? C.greenL : C.t3,
                }}>{d.z == null ? '—' : `${d.z >= 0 ? '+' : ''}${d.z.toFixed(2)}σ`}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** One school on the student's list. */
function CollegeCard({ profile, result, isBenchmark }) {
  const scored = result.showsScore;
  const band = scored ? result.band : null;
  const col = scored ? bandColor(band) : C.t3;

  return (
    <div style={{
      ...glass2({ padding: 12 }),
      border: `1px solid ${isBenchmark ? tint(col, 0.35) : C.b1}`,
      background: isBenchmark ? tint(col, 0.06) : C.surf2,
    }}>
      <div style={R({ justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' })}>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FD, lineHeight: 1.3 }}>
            {profile.name}
          </span>
          <span style={{ display: 'block', fontSize: 10, color: C.t4, marginTop: 4, fontFamily: C.FM }}>
            {profile.admitRate?.value != null
              ? `${(profile.admitRate.value * 100).toFixed(1)}% admitted`
              : `~${Math.round((profile.admitRate?.assumed ?? 0.25) * 100)}% assumed`}
          </span>
        </span>
        <span style={{
          flexShrink: 0, fontSize: 20, letterSpacing: 'calc(-0.28px + var(--msp-letter-spacing))', fontWeight: 900, fontFamily: C.FD, color: col,
          lineHeight: 1, fontVariantNumeric: 'tabular-nums',
        }}>{scored ? result.score : '—'}</span>
      </div>

      <div style={R({ gap: 4, flexWrap: 'wrap', marginTop: 8 })}>
        {isBenchmark && <span style={pill(tint(col, 0.16), col, { fontSize: 9.5 })}>benchmark</span>}
        {scored
          ? <span style={pill(C.s2, C.t3, { fontSize: 9.5 })}>{band.label}</span>
          : <span style={pill(tint(C.amber, 0.14), C.amberL, { fontSize: 9.5 })}>
              {result.gates ? 'requirement not met' : 'not enough logged'}
            </span>}
      </div>

      {!scored && (
        <div style={{ fontSize: 10.5, color: C.t3, marginTop: 8, lineHeight: 1.45 }}>
          {result.gates
            ? result.headline
            : 'Add a little more to your portfolio and this school gets a score too.'}
        </div>
      )}
    </div>
  );
}

function ApexTable({ apex, m }) {
  // Ranked by score, not by the slate's own selectivity order.
  //
  // The slate is stored most-selective-first because that is what picks the
  // "most selective program you match". Rendered in that order, though, this
  // table is twenty-nine near-identical bars in an order the student cannot see
  // the logic of — the same portfolio scores within a few points at schools of
  // similar selectivity, so it reads as a broken chart. Sorted by score it
  // becomes the thing the section actually promises: where you are strongest,
  // in order.
  const rows = useMemo(
    () => apex.rows.filter(r => r.result.showsScore)
      .sort((a, b) => b.result.score - a.result.score)
      .slice(0, 18),
    [apex],
  );
  if (!rows.length) {
    return <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.55 }}>{apex.sentence}</div>;
  }
  return (
    <div style={CC({ gap: 4 })}>
      {rows.map(({ profile, result }) => {
        const col = bandColor(result.band);
        const pctOfCohort = Math.min(100, Math.round((result.score / MEDEX_COHORT_MEDIAN) * 100));
        return (
          <div key={profile.id} style={R({ gap: 8, flexWrap: 'nowrap' })}>
            <span style={{
              flex: 1, minWidth: 0, fontSize: 11.5, color: C.t2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{profile.name}</span>
            <span style={{ flexShrink: 0, width: m ? 60 : 96, height: 6, borderRadius: 4, background: C.b1, position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4,
                width: `${pctOfCohort}%`, background: col,
              }} />
            </span>
            <span style={{
              flexShrink: 0, width: 34, textAlign: 'right', fontSize: 11.5,
              fontFamily: C.FM, fontWeight: 700, color: result.atOrAboveCohort ? C.greenL : C.t3,
            }}>{result.score}</span>
          </div>
        );
      })}
      <div style={{ fontSize: 10.5, color: C.t4, marginTop: 4, lineHeight: 1.45 }}>
        Bars are your score as a share of 850 — the admitted median at each program. A full bar means you look like the middle of that class.
      </div>
    </div>
  );
}

function BandLegend({ current }) {
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 8 }}>
        The bands
      </div>
      <div style={CC({ gap: 4 })}>
        {BANDS.map((b, i) => {
          const next = BANDS[i + 1];
          const isCurrent = current?.id === b.id;
          const col = bandColor(b);
          return (
            <div key={b.id} style={{
              display: 'flex', gap: 8, alignItems: 'center',
              padding: isCurrent ? '5px 8px' : '5px 0', borderRadius: 8,
              background: isCurrent ? tint(col, 0.09) : 'transparent',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: col, flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, fontWeight: isCurrent ? 800 : 600, color: isCurrent ? C.t1 : C.t2, minWidth: 92 }}>{b.label}</span>
              <span style={{ fontSize: 10.5, color: C.t4, fontFamily: C.FM }}>
                {b.min}–{next ? next.min - 1 : MEDEX_MAX}
              </span>
              {isCurrent && <span style={pill(tint(col, 0.16), col, { fontSize: 9.5, marginLeft: 'auto' })}>you</span>}
            </div>
          );
        })}
      </div>
    </>
  );
}

function NoScore({ headline, onGoTo, m }) {
  const gated = !!headline.gates;
  const col = gated ? C.amber : C.blue;
  return (
    <div style={{
      ...glass({ padding: m ? 16 : 22 }),
      border: `1px solid ${tint(col, 0.26)}`,
      background: `linear-gradient(140deg, ${tint(col, 0.07)}, transparent 62%)`,
    }}>
      <div style={R({ gap: 8, marginBottom: 8 })}>
        {gated ? <ShieldAlert size={15} color={col} /> : <CircleHelp size={15} color={col} />}
        <span style={{ fontSize: 14.5, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{headline.headline}</span>
      </div>
      <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55, marginBottom: 12 }}>{headline.explanation}</div>
      <div style={CC({ gap: 8 })}>
        {(headline.whatWouldChange || []).map(item => (
          <button key={item.key || item.label} onClick={() => item.key && onGoTo?.(item.key)} style={{
            ...glass2({ padding: 12 }), textAlign: 'left', width: '100%',
            cursor: item.key && onGoTo ? 'pointer' : 'default',
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <ChevronRight size={13} color={col} style={{ flexShrink: 0, marginTop: 4 }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{item.label}</span>
              <span style={{ display: 'block', fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.5 }}>
                {item.ask || item.remedy}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Loading({ m }) {
  return (
    <div style={CC({ gap: 16 })}>
      <div style={{ ...glass({ padding: m ? 16 : 22 }), height: 96 }} className="msp-shimmer" />
      <div style={{ ...glass({ padding: m ? 16 : 22 }), height: 280 }} className="msp-shimmer" />
      <div style={{ ...glass({ padding: m ? 16 : 22 }), height: 180 }} className="msp-shimmer" />
    </div>
  );
}

const clampZ = (z) => Math.max(-3, Math.min(3, z));
