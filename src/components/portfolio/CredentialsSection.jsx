import React, { useState, useMemo, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, BadgeCheck, ExternalLink, AlertTriangle, ShieldCheck, CalendarClock,
  Info, MapPin, GraduationCap, Sparkles, Send, Database,
} from 'lucide-react';
import { C, glass, glass2, btn, btnSm, inp, R, CC, G, pill, tint } from '../../lib/theme';
import { createItem, deleteItem } from '../../lib/dataApi';
import { SectionTitle, StatTile } from '../ui/PanelHero';
import SuggestInput from '../ui/SuggestInput';
import { showMedabrainToast } from '../../lib/medabrainComments';
import { US_STATES } from '../../data/constants';
import {
  CREDENTIALS, POPULAR_CREDENTIAL_IDS, ISSUING_BODIES, getCredential,
  CREDENTIAL_TYPES, credentialType,
} from '../../data/credentials/index.js';
import {
  searchCredentials, findCredential, credentialName, ageGateFor, provisionalNote,
  credentialSubtitle, credentialMeta, computeExpiry, miscategorizationWarning,
  registryLink, typicalAgeForGrade,
} from '../../lib/credentials';
import SectionIntro from './SectionIntro';

export const isCertExpired = (d) => !!d && new Date(d + 'T00:00:00') < new Date(new Date().toDateString());
// "Expiring soon" = within 60 days — enough runway to actually book a renewal.
export const isCertExpiringSoon = (d) => {
  if (!d || isCertExpired(d)) return false;
  return (new Date(d + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000 <= 60;
};

// ─────────────────────────────────────────────────────────────────────────────
// Skills & Certifications, on top of the credential database rather than a
// free-text field with suggestions.
//
// The naming in this domain is genuinely messy and getting it wrong is exactly
// the error the most knowledgeable student notices first. Three things are
// happening here that a plain type-ahead cannot do:
//
//  1. TYPE. A CNA (state occupational credential), a CCMA (private national
//     certification) and an AHA BLS card (course completion card — the AHA says
//     it does not certify individuals) are three different objects. The picker
//     groups by type, the record shows its type, and a course card gets told
//     once, quietly, that it is not a certification. That last one is the whole
//     product: listing BLS under "Certifications" on an application is a small
//     error that reads badly to the reader who has the same card.
//  2. STATE. A CNA is an STNA in Ohio, an LNA in New Hampshire, a NAC in
//     Washington. The student picks their state once and from then on sees and
//     exports their own state's name, while we store the shared credential id.
//  3. AGE. The gates are what students hit constantly, and the EMT is the big
//     one: NREMT will not certify under 18, an under-18 gets Assessment-EMT
//     which converts at 18, and some states will still certify at state level.
//     That is four facts, and "you must be 18" is wrong about all of them.
//
// Freeform entry is never blocked. It is flagged for review instead, so the
// database improves rather than the field filling with typos.
// ─────────────────────────────────────────────────────────────────────────────

const STATE_KEY = 'credentialStateCode';
const AGE_KEY = 'credentialAge';

const TYPE_COLOR = {
  'state-occupational': C.blue,
  'national-certification': C.violet,
  'course-completion': C.amber,
  skill: C.teal,
};

function TypeChip({ type, small = false }) {
  const t = credentialType(type);
  const color = TYPE_COLOR[type] || C.t3;
  return (
    <span style={pill(tint(color, 0.14), color, { fontSize: small ? 9 : 10, whiteSpace: 'nowrap' })}>{t.badge}</span>
  );
}

/** Everything we know about the credential the student just picked, before they commit to it. */
function CredentialBrief({ credential, stateCode, age, accent }) {
  const naming = credentialName(credential, stateCode);
  const gate = ageGateFor(credential, age);
  const prov = provisionalNote(credential);
  const warn = miscategorizationWarning(credential);
  const reg = registryLink(credential);
  const t = credentialType(credential.type);
  const color = TYPE_COLOR[credential.type] || accent;

  const facts = [];
  if (credential.trainingHours?.value) {
    facts.push({
      k: 'Training',
      v: credential.trainingHours.max
        ? `${credential.trainingHours.value}–${credential.trainingHours.max} hours`
        : `~${credential.trainingHours.value} hours`,
      basis: credential.trainingHours.basis,
    });
  }
  if (credential.cost) {
    facts.push({
      k: 'Cost',
      v: credential.cost.low === 0 && credential.cost.high === 0 ? 'Free'
        : credential.cost.low === 0 ? `Free–$${credential.cost.high}`
          : `$${credential.cost.low}–$${credential.cost.high}`,
      basis: credential.cost.basis,
    });
  }
  if (credential.minAge?.value) {
    facts.push({ k: 'Typical minimum age', v: `${credential.minAge.value}`, basis: credential.minAge.basis });
  }
  if (credential.renewalMonths) {
    facts.push({ k: 'Renews', v: `every ${credential.renewalMonths} months`, basis: 'issuer-published' });
  }

  return (
    <div style={{ ...glass2({ padding: 15 }), background: `linear-gradient(130deg, ${tint(color, 0.07)}, transparent 60%)`, border: `1px solid ${tint(color, 0.24)}` }}>
      <div style={R({ gap: 8, flexWrap: 'wrap', marginBottom: 7 })}>
        <TypeChip type={credential.type} />
        {credential.cteCommon && <span style={pill(tint(C.green, 0.13), C.greenL, { fontSize: 9.5 })}>often free in high school CTE</span>}
        {naming.matched && <span style={pill(tint(C.blue, 0.13), C.blueL, { fontSize: 9.5 })}><MapPin size={9} style={{ marginRight: 3 }} />{naming.stateCode} name</span>}
      </div>

      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1, fontFamily: C.FD, lineHeight: 1.45 }}>{naming.name}</div>
      {naming.matched && naming.name !== naming.base && (
        <div style={{ fontSize: 10.5, color: C.t3, marginTop: 3 }}>Nationally this is the {naming.base}. We store both, and export the name on your certificate.</div>
      )}
      {!naming.matched && naming.varies && (
        <div style={{ fontSize: 10.5, color: C.t3, marginTop: 3 }}>This credential is renamed in several states. We have nothing recorded for {stateCode || 'your state'}, so this is the national name — check your own certificate.</div>
      )}

      <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.65, marginTop: 8 }}>{credential.summary}</div>
      {credential.issuerNote && (
        <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.6, marginTop: 7 }}>{credential.issuerNote}</div>
      )}

      {/* The "this is not a certification" line. Said once, without scolding. */}
      {warn && (
        <div style={{ ...glass2({ padding: 11, marginTop: 11 }), display: 'flex', gap: 8, alignItems: 'flex-start', background: tint(C.amber, 0.08), border: `1px solid ${tint(C.amber, 0.25)}` }}>
          <Info size={13} color={C.amberL} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>
            <strong style={{ color: C.amberL }}>Not a certification. </strong>{warn}
            {' '}It will be exported under <strong style={{ color: C.t1 }}>{t.resumeHeading}</strong>.
          </span>
        </div>
      )}

      {/* Age gate. The EMT case is why this is a block rather than a sentence. */}
      {gate.headline && (
        <div style={{ ...glass2({ padding: 11, marginTop: 9 }), display: 'flex', gap: 8, alignItems: 'flex-start', background: tint(gate.blocking ? C.rose : C.blue, 0.08), border: `1px solid ${tint(gate.blocking ? C.rose : C.blue, 0.25)}` }}>
          <GraduationCap size={13} color={gate.blocking ? C.rose : C.blueL} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>
            <strong style={{ color: gate.blocking ? C.rose : C.blueL }}>{gate.headline}</strong>
            {gate.detail && <div style={{ marginTop: 5 }}>{gate.detail}</div>}
            {gate.underageStatus && (
              <div style={{ marginTop: 5 }}>Log it as <strong style={{ color: C.t1 }}>{gate.underageStatus}</strong> until you convert — that is the accurate word for what you hold.</div>
            )}
          </div>
        </div>
      )}

      {/* The diploma wall, which is separate from the age wall. */}
      {prov && (
        <div style={{ ...glass2({ padding: 11, marginTop: 9 }), display: 'flex', gap: 8, alignItems: 'flex-start', background: C.s2 }}>
          <AlertTriangle size={13} color={C.t3} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>
            <strong style={{ color: C.t1 }}>Before you graduate: </strong>{prov.rule}
            {prov.note && <div style={{ marginTop: 5, color: C.t3 }}>{prov.note}</div>}
          </div>
        </div>
      )}

      {facts.length > 0 && (
        <div style={{ ...R({ gap: 14, flexWrap: 'wrap' }), marginTop: 12 }}>
          {facts.map(f => (
            <div key={f.k}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3 }}>{f.k}</div>
              <div style={{ fontSize: 12, color: C.t1, fontFamily: C.FM, marginTop: 2 }}>{f.v}</div>
              <div style={{ fontSize: 9.5, color: C.t3, marginTop: 1 }}>
                {f.basis === 'issuer-published' ? 'published by the issuer' : f.basis === 'state-varies' ? 'varies by state' : 'typical — our estimate'}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...R({ gap: 12, flexWrap: 'wrap' }), marginTop: 12 }}>
        {reg && (
          <a href={reg.url} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: accent, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Database size={10} />{reg.mapped ? 'Credential Registry record' : 'Look it up in the Credential Registry'}<ExternalLink size={9} />
          </a>
        )}
        {(credential.sources || []).map(s => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: C.t3, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {s.label}<ExternalLink size={9} />
          </a>
        ))}
      </div>
    </div>
  );
}

export default function CredentialsSection({
  accent = C.teal, entries = [], setEntries, loading = false, onChanged, isMobile = false,
  gradeStage = null,
}) {
  const [name, setName] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [earnedDate, setEarnedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');
  const [picked, setPicked] = useState(null);
  const [expiryAuto, setExpiryAuto] = useState(false);
  // Set once and remembered: two settings that change what the whole catalog says back to you.
  const [stateCode, setStateCode] = useState(() => localStorage.getItem(STATE_KEY) || '');
  const [age, setAge] = useState(() => {
    const stored = localStorage.getItem(AGE_KEY);
    return stored ? Number(stored) : null;
  });
  // Type the student assigned to a freeform entry the catalog does not have.
  const [freeformType, setFreeformType] = useState('');
  const [suggested, setSuggested] = useState(false);

  // Seed the age from their school year the first time, and label it as a guess in the UI.
  useEffect(() => {
    if (age == null && gradeStage) {
      const guess = typicalAgeForGrade(gradeStage);
      if (guess) setAge(guess);
    }
  }, [gradeStage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (stateCode) localStorage.setItem(STATE_KEY, stateCode); }, [stateCode]);
  useEffect(() => { if (age != null) localStorage.setItem(AGE_KEY, String(age)); }, [age]);

  const trackedIds = useMemo(
    () => new Set(entries.map(e => e.credential_id).filter(Boolean)),
    [entries]
  );

  const toOption = useCallback((item) => {
    const naming = credentialName(item, stateCode);
    return {
      key: item.id,
      label: naming.name,
      // The group header IS the teaching. A student who sees BLS sitting under "Course completion
      // card" has learned the distinction without being lectured about it.
      group: CREDENTIAL_TYPES[item.type].label,
      sub: credentialSubtitle(item),
      meta: trackedIds.has(item.id) ? 'Already added' : credentialMeta(item),
    };
  }, [trackedIds, stateCode]);

  const nameOptions = useCallback((q) => {
    const items = q.trim()
      ? searchCredentials(q, { stateCode })
      : POPULAR_CREDENTIAL_IDS.map(getCredential).filter(Boolean);
    return items.map(toOption);
  }, [toOption, stateCode]);

  const issuerOptions = useCallback((q) => {
    const needle = q.trim().toLowerCase();
    const preferred = picked?.issuers || [];
    const ordered = [...preferred, ...ISSUING_BODIES.filter(b => !preferred.includes(b))];
    return ordered
      .filter(b => !needle || b.toLowerCase().includes(needle))
      .slice(0, 12)
      .map(b => ({ key: b, label: b, group: preferred.includes(b) ? 'Issues this credential' : 'All issuing bodies' }));
  }, [picked]);

  function applyPick(item) {
    setPicked(item);
    setFreeformType('');
    setSuggested(false);
    if (!item) return;
    if (!issuingBody.trim() && item.issuers?.[0]) setIssuingBody(item.issuers[0]);
    if (item.renewalMonths && earnedDate && (!expiryDate || expiryAuto)) {
      setExpiryDate(computeExpiry(earnedDate, item.renewalMonths));
      setExpiryAuto(true);
    }
  }

  function pickFromMenu(opt) {
    applyPick(getCredential(opt.key));
  }

  function changeName(v) {
    setName(v);
    const match = findCredential(v);
    if (match?.id !== picked?.id) applyPick(match);
  }

  function changeEarnedDate(v) {
    setEarnedDate(v);
    if (picked?.renewalMonths && (!expiryDate || expiryAuto)) {
      setExpiryDate(computeExpiry(v, picked.renewalMonths));
      setExpiryAuto(true);
    }
  }

  function resetForm() {
    setName(''); setIssuingBody(''); setEarnedDate(''); setExpiryDate(''); setCertificateUrl('');
    setPicked(null); setExpiryAuto(false); setFreeformType(''); setSuggested(false);
  }

  async function addEntry(e) {
    e?.preventDefault();
    if (!name.trim()) { toast.error('Give the credential a name first.'); return; }
    const type = picked?.type || freeformType || null;
    try {
      const row = await createItem('skills_certifications', {
        name: name.trim(),
        issuing_body: issuingBody.trim() || null,
        earned_date: earnedDate || null,
        expiry_date: expiryDate || null,
        certificate_url: certificateUrl.trim() || null,
        credential_id: picked?.id || null,
        credential_type: type,
        // Only meaningful for a credential a state actually issues.
        state_code: picked && picked.type === 'state-occupational' && stateCode ? stateCode : null,
      });
      setEntries(prev => [row, ...prev]);
      resetForm();
      showMedabrainToast('skill_added', { name: row.name });
      onChanged?.();
    } catch (err) { toast.error(err.message); }
  }

  // Never blocked, always recorded. A freeform entry that goes nowhere means the catalog never
  // improves and quietly fills with misspellings of things it already contains.
  async function suggestCredential() {
    if (!name.trim()) return;
    try {
      await createItem('credential_suggestions', {
        name: name.trim(),
        issuing_body: issuingBody.trim() || null,
        credential_type: freeformType || null,
        state_code: freeformType === 'state-occupational' && stateCode ? stateCode : null,
        note: null,
      });
      setSuggested(true);
      toast.success('Sent for review — thanks. It stays on your portfolio either way.');
    } catch (err) { toast.error(err.message); }
  }

  async function removeEntry(id) {
    if (!window.confirm('Delete this credential?')) return;
    setEntries(prev => prev.filter(e => e.id !== id));
    try { await deleteItem('skills_certifications', id); } catch (err) { toast.error(err.message); }
  }

  const activeCount = entries.filter(e => !isCertExpired(e.expiry_date)).length;
  const expiredCount = entries.length - activeCount;
  const expiringSoon = entries.filter(e => isCertExpiringSoon(e.expiry_date)).length;
  // Rows added before the type existed. Shown as unclassified rather than silently guessed at.
  const unclassified = entries.filter(e => !e.credential_type).length;

  const isFreeform = !picked && name.trim().length > 1;
  const stateName = US_STATES.find(s => s.code === stateCode)?.name || null;

  return (
    <div style={CC({ gap: 18 })}>
      <SectionIntro icon={BadgeCheck} color={accent} color2={C.cyan} m={isMobile}
        title="Skills & Certifications"
        blurb={`Built on a real credential database of ${CREDENTIALS.length} entries, not a free-text box. Pick from the menu and we fill in the issuing body, the renewal cycle, the age rules, and — where it matters — your own state's name for the credential.`}
        stats={entries.length > 0 ? [
          { value: activeCount, label: 'active', color: C.greenL },
          ...(expiringSoon > 0 ? [{ icon: <CalendarClock size={11} />, value: expiringSoon, label: 'renew soon', color: C.amberL }] : []),
          ...(expiredCount > 0 ? [{ value: expiredCount, label: 'expired', color: C.rose }] : []),
        ] : []} />

      {/* ── The two settings that change what the catalog says back to you ──── */}
      <div style={{ ...glass2({ padding: 14 }), display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200, flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3, marginBottom: 5 }}>
            <MapPin size={10} style={{ marginRight: 4, verticalAlign: '-1px' }} />Your state
          </div>
          <select style={inp()} value={stateCode} onChange={e => setStateCode(e.target.value)}>
            <option value="">Not set — we'll show national names</option>
            {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
          <div style={{ fontSize: 10.5, color: C.t3, marginTop: 5, lineHeight: 1.55 }}>
            A CNA is an STNA in Ohio, an LNA in New Hampshire, a NAC in Washington. Set this and we show — and export — the name that is actually on your certificate.
          </div>
        </div>
        <div style={{ minWidth: 130 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3, marginBottom: 5 }}>
            <GraduationCap size={10} style={{ marginRight: 4, verticalAlign: '-1px' }} />Your age
          </div>
          <input type="number" min="10" max="25" style={inp({ width: 110 })} value={age ?? ''}
            placeholder="—" onChange={e => setAge(e.target.value ? Number(e.target.value) : null)} />
          <div style={{ fontSize: 10.5, color: C.t3, marginTop: 5, lineHeight: 1.55 }}>
            {gradeStage && age === typicalAgeForGrade(gradeStage)
              ? 'Guessed from your school year — correct it if it is wrong.'
              : 'Used to check the age rules, which is where students get stuck most often.'}
          </div>
        </div>
      </div>

      {entries.length > 0 && (
        <div style={G(3, 12, {}, isMobile)}>
          <StatTile icon={ShieldCheck} value={activeCount} label="Active credentials" color={C.green} />
          <StatTile icon={CalendarClock} value={expiringSoon} label="Expiring within 60 days" color={expiringSoon > 0 ? C.amber : accent} />
          <StatTile icon={AlertTriangle} value={expiredCount} label="Expired" color={expiredCount > 0 ? C.rose : C.t3} />
        </div>
      )}

      {unclassified > 0 && (
        <div style={{ ...glass2({ padding: 12 }), display: 'flex', gap: 9, alignItems: 'flex-start', background: C.s2 }}>
          <Info size={13} color={C.t3} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>
            {unclassified} {unclassified === 1 ? 'record was' : 'records were'} added before we tracked credential type, so {unclassified === 1 ? 'it is' : 'they are'} shown as unclassified. Delete and re-add from the menu to classify {unclassified === 1 ? 'it' : 'them'} — we will not re-file your records behind your back.
          </span>
        </div>
      )}

      {/* ── Add ─────────────────────────────────────────────────────────────── */}
      <div style={{ ...glass({ padding: 18 }), background: `linear-gradient(120deg,${tint(accent, 0.06)},rgba(255,255,255,0.02) 55%)`, border: `1px solid ${tint(accent, 0.2)}` }}>
        <SectionTitle icon={Plus} color={accent}>Add a Skill or Certification</SectionTitle>
        <form onSubmit={addEntry} style={CC({ gap: 11 })}>
          <div style={R({ gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' })}>
            <SuggestInput
              value={name} onChange={changeName} onPick={pickFromMenu}
              getOptions={nameOptions}
              placeholder="Start typing — CNA, STNA, BLS, EMT, phlebotomy, PCR, Epic…"
              emptyHint={`Most common first — or search all ${CREDENTIALS.length} credentials and skills${stateName ? `, named for ${stateName}` : ''}`}
              inputStyle={{ width: '100%' }} wrapperStyle={{ flex: 1, minWidth: 220 }}
            />
            <SuggestInput
              value={issuingBody} onChange={setIssuingBody}
              getOptions={issuerOptions}
              placeholder="Issuing body"
              inputStyle={{ width: '100%' }} wrapperStyle={{ flex: 1, minWidth: 200 }}
            />
          </div>

          {picked && <CredentialBrief credential={picked} stateCode={stateCode} age={age} accent={accent} />}

          {/* Not in the catalog. Allowed, typed by the student, and flagged for review. */}
          {isFreeform && (
            <div style={{ ...glass2({ padding: 14 }), background: C.s2, border: `1px dashed ${C.b2 || C.b1}` }}>
              <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, marginBottom: 9 }}>
                <strong style={{ color: C.t1 }}>Not in our database.</strong> That is fine — add it anyway. Tell us which kind it is so it lands under the right heading on your résumé, and we will check whether it belongs in the catalog.
              </div>
              <div style={R({ gap: 6, flexWrap: 'wrap', marginBottom: 10 })}>
                {Object.entries(CREDENTIAL_TYPES).map(([key, t]) => (
                  <button key={key} type="button" onClick={() => setFreeformType(key)}
                    title={t.blurb}
                    style={btnSm(freeformType === key ? tint(TYPE_COLOR[key], 0.2) : C.s3, {
                      fontSize: 11, color: freeformType === key ? TYPE_COLOR[key] : C.t2,
                      border: `1px solid ${freeformType === key ? tint(TYPE_COLOR[key], 0.45) : C.b1}`,
                    })}>{t.short}</button>
                ))}
              </div>
              {freeformType && (
                <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.6, marginBottom: 10 }}>{CREDENTIAL_TYPES[freeformType].blurb}</div>
              )}
              <button type="button" onClick={suggestCredential} disabled={suggested}
                style={{ ...btnSm(suggested ? C.s3 : tint(accent, 0.16), { fontSize: 11.5, color: suggested ? C.t3 : accent, display: 'inline-flex', alignItems: 'center', gap: 5 }) }}>
                <Send size={11} />{suggested ? 'Sent for review' : 'Suggest it for the database'}
              </button>
            </div>
          )}

          <div style={R({ gap: 10, flexWrap: 'wrap', alignItems: 'center' })}>
            <div>
              <div style={{ fontSize: 9.5, color: C.t3, marginBottom: 3 }}>Earned</div>
              <input type="date" style={inp({ width: 'auto' })} value={earnedDate} onChange={e => changeEarnedDate(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 9.5, color: C.t3, marginBottom: 3 }}>Expires</div>
              <input type="date" style={inp({ width: 'auto' })} value={expiryDate} onChange={e => { setExpiryDate(e.target.value); setExpiryAuto(false); }} />
            </div>
            {expiryAuto && expiryDate && <span style={pill(tint(accent, 0.12), accent, { fontSize: 10, alignSelf: 'flex-end', marginBottom: 9 })}>auto-filled · editable</span>}
          </div>
          <input style={inp()} placeholder="Certificate link (optional)" value={certificateUrl} onChange={e => setCertificateUrl(e.target.value)} />
          <button type="submit" style={{ ...btn(accent), alignSelf: 'flex-start' }}><Plus size={14} />Add to Portfolio</button>
        </form>
      </div>

      {!loading && entries.length === 0 && (
        <div style={glass({ padding: 24, textAlign: 'center' })}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: tint(accent, 0.12), border: `1px solid ${tint(accent, 0.28)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <BadgeCheck size={20} color={accent} />
          </div>
          <div style={{ fontSize: 13, color: C.t2 }}>Nothing logged yet. Start with whatever you already have — a BLS card counts.</div>
        </div>
      )}

      <div style={CC({ gap: 8 })}>
        {entries.map(e => {
          const expired = isCertExpired(e.expiry_date);
          const soon = isCertExpiringSoon(e.expiry_date);
          const sc = expired ? C.rose : soon ? C.amber : C.green;
          const cat = e.credential_id ? getCredential(e.credential_id) : null;
          return (
            <div key={e.id} style={{ ...glass2({ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }), borderLeft: `3px solid ${sc}`, background: `linear-gradient(120deg,${tint(sc, 0.05)},rgba(255,255,255,0.02) 55%)`, opacity: expired ? 0.7 : 1 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: tint(accent, 0.13), border: `1px solid ${tint(accent, 0.25)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><BadgeCheck size={15} color={accent} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={R({ gap: 7, flexWrap: 'wrap' })}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{e.name}</span>
                  {e.credential_type
                    ? <TypeChip type={e.credential_type} small />
                    : <span style={pill(C.s3, C.t3, { fontSize: 9 })}>unclassified</span>}
                  {e.state_code && <span style={pill(tint(C.blue, 0.12), C.blueL, { fontSize: 9 })}>{e.state_code}</span>}
                </div>
                <div style={{ fontSize: 11, color: C.t3, marginTop: 3 }}>
                  {[
                    e.issuing_body,
                    e.expiry_date ? `expires ${new Date(e.expiry_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : null,
                    e.credential_type ? `résumé: ${credentialType(e.credential_type).resumeHeading}` : null,
                  ].filter(Boolean).join(' · ')}
                </div>
                {cat?.notACertification && (
                  <div style={{ fontSize: 10.5, color: C.amberL, marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={10} />Course completion card, not a certification — filed accordingly.
                  </div>
                )}
                {e.certificate_url && <a href={e.certificate_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: accent, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>View certificate<ExternalLink size={10} /></a>}
              </div>
              <div style={{ ...R({ gap: 6 }), flexShrink: 0 }}>
                {expired && <span style={pill(C.roseDim, C.rose, { fontSize: 10 })}><AlertTriangle size={10} style={{ marginRight: 4 }} />Expired</span>}
                {soon && <span style={pill(C.amberDim, C.amberL, { fontSize: 10 })}><CalendarClock size={10} style={{ marginRight: 4 }} />Renew soon</span>}
                {!expired && !soon && <span style={pill(C.greenDim, C.greenL, { fontSize: 10 })}><ShieldCheck size={10} style={{ marginRight: 4 }} />Active</span>}
                <button style={btnSm(C.roseDim, { color: C.rose })} onClick={() => removeEntry(e.id)} aria-label="Delete credential"><Trash2 size={12} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
