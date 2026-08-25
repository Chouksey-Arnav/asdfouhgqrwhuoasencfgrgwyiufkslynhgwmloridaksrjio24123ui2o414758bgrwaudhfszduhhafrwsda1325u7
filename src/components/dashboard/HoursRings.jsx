// ─────────────────────────────────────────────────────────────────────────────
// Module 3 — Hours rings, by category, against the pathway's benchmark.
//
// Four rings: shadowing, clinical, volunteer, leadership. Each one is hours
// logged over the benchmark the active pathway declares (PATHS[…].benchmarks in
// src/data/constants.js), which is why a nursing student and a pharmacy student
// see different denominators for the same work.
//
// ── Why a denominator is the whole point ────────────────────────────────────
// "40 hours" is a number a student cannot act on. "40 of 100 clinical hours"
// is a position, and it is the exact sentence an admissions officer would use.
// Every ring here therefore renders as a fraction, never as a bare total and
// never as a percentage alone — the percentage is the ring, the fraction is the
// label, and a student can read either one.
//
// This is also the substance framing the achievements module is built on:
// progress toward something real, legible outside this app. A ring at 3/5 says
// something true about a portfolio. A badge saying "Hour Hero" says nothing to
// anyone.
//
// ── Why a met benchmark stays on screen ─────────────────────────────────────
// A category at or past its benchmark renders as complete rather than
// disappearing. Removing it would make the module quietly shrink as a student
// succeeds, which reads as losing something. It also hides the answer to "have
// I done enough shadowing?", which is a question students ask constantly.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Clock, Check, Plus } from 'lucide-react';
import { C, glass, glass2, R, CC, tint, btnG } from '../../lib/theme';
import { SectionTitle } from '../ui/PanelHero';
import { Arc } from '../ui/primitives';

// The four categories, their benchmark key, and the accent each one keeps
// everywhere it appears on the dashboard.
export const HOUR_CATEGORIES = [
  { key: 'shadowing',  benchKey: 'shadowingHours',  label: 'Shadowing',  color: C.cyan,   blurb: 'Observing a clinician at work' },
  { key: 'clinical',   benchKey: 'clinicalHours',   label: 'Clinical',   color: C.rose,   blurb: 'Hands-on, scribing, patient contact' },
  { key: 'volunteer',  benchKey: 'volunteerHours',  label: 'Volunteer',  color: C.green,  blurb: 'Service, in or out of healthcare' },
  { key: 'leadership', benchKey: 'leadershipHours', label: 'Leadership', color: C.violet, blurb: 'Roles where you were responsible' },
];

export default function HoursRings({
  hours = {}, benchmarks = {}, pathwayLabel = 'your pathway',
  onLogHours, accent = C.green, m = false,
}) {
  const rows = HOUR_CATEGORIES.map(cat => {
    const target = Number(benchmarks[cat.benchKey]) || 0;
    const done = Math.max(0, Number(hours[cat.key]) || 0);
    const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
    return { ...cat, done, target, pct, met: target > 0 && done >= target };
  }).filter(r => r.target > 0);

  const metCount = rows.filter(r => r.met).length;
  const totalLogged = rows.reduce((s, r) => s + r.done, 0);

  return (
    <div style={glass({ padding: m ? 18 : 22 })}>
      <div style={{ ...R({ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }) }}>
        <SectionTitle icon={Clock} color={accent} extra={{ marginBottom: 0 }}>Hours</SectionTitle>
        {rows.length > 0 && (
          // The one headline number, phrased the way the requirement is phrased.
          <span style={{ fontSize: 11.5, color: C.t3, fontFamily: C.FM }}>
            {metCount} of {rows.length} benchmarks met
          </span>
        )}
      </div>
      <p style={{ fontSize: 12.5, color: C.t3, margin: '8px 0 18px', lineHeight: 1.5 }}>
        Measured against {pathwayLabel}&apos;s own benchmarks — a different pathway would set different
        targets for the same work.
      </p>

      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: C.t3, lineHeight: 1.5 }}>
          Pick a pathway and this will show the hour benchmarks it expects.
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: m ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: m ? 10 : 12,
          }}>
            {rows.map(r => (
              <div key={r.key} style={{
                ...glass2({ padding: m ? 12 : 14 }),
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
                border: `1px solid ${r.met ? tint(r.color, 0.35) : C.b1}`,
              }}>
                <Arc
                  pct={r.pct} size={m ? 60 : 66} stroke={5}
                  color={r.met ? C.green : r.color}
                  label={r.met ? '✓' : `${r.pct}%`}
                />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{r.label}</div>
                  {/* The fraction. Always the fraction. */}
                  <div style={{ fontSize: 11.5, color: r.met ? C.greenL : C.t2, fontFamily: C.FM, marginTop: 4 }}>
                    {Math.round(r.done)} of {r.target} hrs
                  </div>
                  <div style={{ fontSize: 10, color: C.t3, marginTop: 4, lineHeight: 1.35 }}>{r.blurb}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...R({ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }), marginTop: 16 }}>
            <span style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.5 }}>
              {totalLogged === 0
                // The single highest-value sentence in this module. Most students
                // have hours they simply never wrote down, and a zeroed ring reads
                // as "you have done nothing" when it means "we have nothing logged".
                ? 'Nothing logged yet. Hours you have already done still count — log them retroactively.'
                : `${Math.round(totalLogged)} hours logged in total.`}
            </span>
            {onLogHours && (
              <button
                type="button" onClick={onLogHours}
                style={{ ...btnG({ fontSize: 12, padding: '8px 16px' }), display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <Plus size={13} />Log hours
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
