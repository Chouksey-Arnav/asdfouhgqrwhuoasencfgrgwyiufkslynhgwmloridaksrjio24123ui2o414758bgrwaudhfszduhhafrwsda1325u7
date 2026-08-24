import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FileDown, Lock, ShieldCheck, Sparkles, NotebookPen, Loader2, Check, AlertTriangle,
} from 'lucide-react';
import { C, glass, glass2, btn, btnG, R, CC, pill, tint, autoGrid } from '../../lib/theme';
import { listItems } from '../../lib/dataApi';
import { SectionTitle } from '../ui/PanelHero';
import {
  buildDossier, hasEnoughForDossier, DOSSIER_MODES,
} from '../../lib/portfolioDossier';
import { canExportFullDossier, canExportArchive, previewNotice } from '../../lib/entitlements';
import { exportPortfolioDossier } from '../../lib/exportPDF';

// ─────────────────────────────────────────────────────────────────────────────
// The export that turns four years of logging into a document.
//
// ── Why the free tier gets a real page and not a lock screen ────────────────
// The thing that makes this feature worth paying for is not a description of
// it. It is the moment a seventeen-year-old opens a PDF with their own name at
// the top, their own 214 hours across eleven sites, their own dates going back
// to a Saturday in tenth grade — and realises that the four years they have
// been logging are, in fact, a record. No feature list produces that. A blurred
// mock produces the opposite: it says "we have something, but you cannot see
// it", which reads as a threat rather than an offer.
//
// So the free preview generates page one of the genuine document from their
// genuine data, watermarked, ending with a line in their own numbers saying
// what the rest contains. It is the strongest version of the argument and it is
// also the honest one.
//
// ── The archive mode is a privacy boundary, not an upsell ───────────────────
// The personal archive contains the reflection journal — the one surface in
// this whole app a fifteen-year-old writes honestly in, and it is honest
// because nothing else can read it. This component will not render the archive
// option for a non-student audience, and buildDossier() throws independently if
// it is ever called that way anyway. Two layers, on purpose: a privacy boundary
// that lives only in a component is one that a future refactor routes around
// without noticing.
//
// Reflections are fetched ONLY when an archive export is actually requested,
// so a parent or counselor viewing this panel never causes that content to be
// read at all.
// ─────────────────────────────────────────────────────────────────────────────

export default function FourYearExport({
  accent = C.violet,
  user = null,
  snapshot = null,
  audience = 'student',
  gradeLabel = null,
  pathwayLabel = null,
  onExported = null,
}) {
  const [busy, setBusy] = useState(null);   // 'application' | 'archive' | 'preview'
  const [done, setDone] = useState(null);
  const [reflections, setReflections] = useState(null);   // null until an archive export needs them

  const full = canExportFullDossier(user);
  const canArchive = canExportArchive(user, audience);
  const ready = hasEnoughForDossier(snapshot || {});

  const stats = useMemo(() => {
    if (!snapshot) return null;
    try {
      // Always the application-mode build for the on-screen figures: this
      // component must never construct a document containing reflections for
      // the purpose of counting things.
      return buildDossier({ mode: 'application', audience: 'counselor', student: {}, snapshot }).stats;
    } catch { return null; }
  }, [snapshot]);

  useEffect(() => { if (done) { const t = setTimeout(() => setDone(null), 2500); return () => clearTimeout(t); } }, [done]);

  async function generate(mode, { preview = false } = {}) {
    if (!snapshot) { toast.error('Your record is still loading.'); return; }
    setBusy(preview ? 'preview' : mode);
    try {
      let entries = reflections;
      if (mode === 'archive') {
        if (!canArchive) throw new Error('The personal archive can only be generated from your own student account.');
        if (entries == null) {
          entries = await listItems('reflection_entries').catch(() => []);
          setReflections(entries);
        }
      }
      const dossier = buildDossier({
        mode,
        audience: mode === 'archive' ? 'student' : audience,
        student: { name: user?.name || null, gradeLabel, pathwayLabel, schoolName: user?.school || null },
        snapshot,
        reflections: mode === 'archive' ? (entries || []) : [],
      });
      exportPortfolioDossier(dossier, {
        preview,
        watermarkLabel: 'PREVIEW',
      });
      setDone(preview ? 'preview' : mode);
      onExported?.(mode, { preview });
    } catch (err) {
      toast.error(err.message || 'Could not build the export.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{
      ...glass({ padding: 16 }),
      background: `linear-gradient(120deg,${tint(accent, 0.08)},rgba(255,255,255,0.02) 55%)`,
      border: `1px solid ${tint(accent, 0.24)}`,
    }}>
      <SectionTitle icon={FileDown} color={accent}>Your Four-Year Record</SectionTitle>

      <p style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55, margin: '0px 0px 12px' }}>
        Everything you have logged since ninth grade, as one formatted document: your profile, every
        activity grouped with hour totals and date ranges, the shadowing log with specialties,
        supervisors and dates, certifications, awards, coursework, your recommenders, and a
        chronological four-year timeline. This is the thing you will need in October and cannot
        rebuild from memory — nobody remembers which Saturday in tenth grade they were at the clinic.
        {' '}Your log does.
      </p>

      {stats && (
        <div style={{ ...autoGrid(110, 8), marginBottom: 12 }}>
          <Fig value={Math.round(stats.totalHours).toLocaleString()} label="hours on record" color={accent} />
          <Fig value={stats.clinicalEntries} label="dated entries" color={C.greenL} />
          <Fig value={stats.sites} label="sites" color={C.blueL} />
          <Fig value={stats.supervisors} label="supervisors" color={C.cyanL} />
          <Fig value={stats.sectionCount} label="sections" color={C.t2} />
        </div>
      )}

      {!ready ? (
        <div style={{
          ...R({ gap: 8, alignItems: 'flex-start' }), ...glass2({ padding: 12 }),
          border: `1px solid ${tint(C.amber, 0.24)}`, background: tint(C.amber, 0.05),
        }}>
          <AlertTriangle size={14} color={C.amberL} style={{ flexShrink: 0, marginTop: 4 }} />
          <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>
            There is not enough on record yet for this to be worth generating — a document with
            three lines in it is not a record, it is a disappointment. Log a few activities and some
            hours first and come back; the value of this compounds with every entry.
          </span>
        </div>
      ) : (
        <div style={CC({ gap: 12 })}>
          {/* ── Application-ready ────────────────────────────────────────── */}
          <ModeCard
            spec={DOSSIER_MODES.application}
            icon={FileDown}
            color={C.blueL}
            locked={!full}
            busy={busy === 'application'}
            done={done === 'application'}
            onGenerate={() => generate('application')}
          />

          {/* ── Personal archive — student only ──────────────────────────── */}
          {audience === 'student' ? (
            <ModeCard
              spec={DOSSIER_MODES.archive}
              icon={NotebookPen}
              color={C.roseL}
              locked={!canArchive}
              busy={busy === 'archive'}
              done={done === 'archive'}
              onGenerate={() => generate('archive')}
              privacyLine="Your reflection journal and working document go in this version and nowhere else. A parent or counselor account cannot generate it, and it is not what you send to anyone."
            />
          ) : (
            <div style={{
              ...R({ gap: 8, alignItems: 'flex-start' }), ...glass2({ padding: 12 }),
              border: `1px solid ${C.b1}`,
            }}>
              <ShieldCheck size={14} color={C.t3} style={{ flexShrink: 0, marginTop: 4 }} />
              <span style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55 }}>
                There is a second version of this document that includes the student's private
                reflections. It can only be generated from their own account, and this account
                cannot produce it — that boundary is what makes the journal honest enough to be
                worth keeping.
              </span>
            </div>
          )}

          {/* ── The free preview ─────────────────────────────────────────── */}
          {!full && (
            <div style={{
              ...glass2({ padding: 12 }),
              border: `1px solid ${tint(accent, 0.3)}`,
              background: `linear-gradient(120deg,${tint(accent, 0.09)},rgba(255,255,255,0.02) 60%)`,
            }}>
              <div style={R({ gap: 8, marginBottom: 8 })}>
                <Sparkles size={14} color={accent} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>See page one, free</span>
              </div>
              <p style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.62, margin: '0px 0px 8px' }}>
                {stats ? previewNotice(stats) : 'This preview is page one of your real document.'}
                {' '}It is watermarked, and it is genuinely yours — your name, your hours, your dates,
                laid out properly.
              </p>
              <button type="button" disabled={busy === 'preview'} onClick={() => generate('application', { preview: true })}
                style={{ ...btn(accent, { fontSize: 12, opacity: busy === 'preview' ? 0.6 : 1 }) }}>
                {busy === 'preview' ? <Loader2 size={13} className="spin" />
                  : done === 'preview' ? <Check size={13} /> : <FileDown size={13} />}
                {done === 'preview' ? 'Downloaded' : 'Download the preview'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModeCard({ spec, icon: Icon, color, locked, busy, done, onGenerate, privacyLine }) {
  return (
    <div style={{ ...glass2({ padding: 12 }), borderLeft: `3px solid ${color}` }}>
      <div style={R({ gap: 8, flexWrap: 'wrap' })}>
        <Icon size={15} color={color} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{spec.label}</span>
        {locked && <span style={pill(C.b0, C.t3, { fontSize: 9 })}><Lock size={9} style={{ marginRight: 4 }} />Full access</span>}
      </div>
      <p style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.62, margin: '8px 0px 0px' }}>{spec.blurb}</p>
      {privacyLine && (
        <p style={{ fontSize: 11, color: C.roseL, lineHeight: 1.6, margin: '8px 0px 0px' }}>{privacyLine}</p>
      )}
      <button type="button" disabled={locked || busy} onClick={onGenerate}
        style={{
          ...(locked ? btnG({ fontSize: 12 }) : btn(color, { fontSize: 12 })),
          marginTop: 12, opacity: locked ? 0.55 : busy ? 0.6 : 1,
          cursor: locked ? 'not-allowed' : 'pointer',
        }}>
        {busy ? <Loader2 size={13} className="spin" /> : done ? <Check size={13} /> : locked ? <Lock size={13} /> : <FileDown size={13} />}
        {busy ? 'Building…' : done ? 'Downloaded' : locked ? 'Needs full access' : `Generate ${spec.label.toLowerCase()}`}
      </button>
    </div>
  );
}

function Fig({ value, label, color }) {
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 800, color, fontFamily: C.FM, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10, color: C.t3, marginTop: 4 }}>{label}</div>
    </div>
  );
}
