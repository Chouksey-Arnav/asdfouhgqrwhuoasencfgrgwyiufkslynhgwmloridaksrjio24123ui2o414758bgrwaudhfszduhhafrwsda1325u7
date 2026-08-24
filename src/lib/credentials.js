// ─────────────────────────────────────────────────────────────────────────────
// Everything the credential database has to DO: search it, name a credential
// the way the student's own state names it, work out whether a given student is
// old enough, and decide which résumé heading a record belongs under.
//
// The data lives in src/data/credentials/. This file is the only place that
// interprets it, so the interpretation cannot drift between the picker, the
// résumé export, and the verify script.
// ─────────────────────────────────────────────────────────────────────────────
import {
  CREDENTIALS, getCredential, credentialType, CREDENTIAL_TYPES, CREDENTIAL_TYPE_KEYS,
  credentialFinderUrl,
} from '../data/credentials/index.js';

const norm = (s) => String(s || '').trim().toLowerCase();

// ── State-aware naming ───────────────────────────────────────────────────────

/**
 * What this credential is called in a given state.
 *
 * A student in Ohio holds an STNA. Their certificate says STNA, the registry that issued it says
 * STNA, and a résumé that says "CNA" does not match the verification a reader would run. So the
 * state name is what we show and what we export — while the underlying credential id stays `cna`,
 * so the two students are still the same row in our own data.
 *
 * Returns the base name when we have not recorded anything for that state. That is a real
 * distinction and the UI says which one it is: `matched` is false when we are falling back.
 */
export function credentialName(credential, stateCode) {
  const c = typeof credential === 'string' ? getCredential(credential) : credential;
  if (!c) return { name: '', matched: false, base: '', stateCode: null };
  const base = c.officialName;
  const state = (stateCode || '').toUpperCase();
  const stateName = c.stateNames?.[state];
  return {
    name: stateName || base,
    base,
    matched: !!stateName,
    stateCode: stateName ? state : null,
    // True when the credential renames itself somewhere, so the UI can offer the state picker
    // only where it would change something.
    varies: Object.keys(c.stateNames || {}).length > 0,
    note: stateName ? c.stateNote || '' : '',
  };
}

/** The state codes a given credential has a recorded name for. */
export function statesFor(credential) {
  const c = typeof credential === 'string' ? getCredential(credential) : credential;
  return Object.keys(c?.stateNames || {}).sort();
}

// ── Age gates ────────────────────────────────────────────────────────────────

/**
 * Can a student of this age hold this credential today?
 *
 * The interesting case is the EMT, and it is the reason this returns a shape rather than a
 * boolean. A 16-year-old is not blocked from the EMT course, and is not blocked from the exam.
 * They are blocked from the certificate, they get Assessment-EMT status instead, it converts at
 * 18 without re-testing, and some states will certify them at state level anyway. "No" would be
 * four different kinds of wrong at once.
 *
 * `status` is one of:
 *   'ok'          — nothing in the way.
 *   'provisional' — you can train and usually test, but the credential is held or issued
 *                   provisionally (the under-18 EMT case, and the graduate-first national certs).
 *   'too-young'   — there is a real floor and this student is under it, with no side route.
 *   'unknown'     — we have no age on file. Says so rather than guessing.
 */
export function ageGateFor(credential, age) {
  const c = typeof credential === 'string' ? getCredential(credential) : credential;
  if (!c) return { status: 'unknown', headline: '', detail: '', blocking: false };

  const gate = c.ageGate;
  const min = c.minAge?.value ?? null;

  // The explicit gate wins wherever a record carries one — it is the hand-written case.
  if (gate) {
    if (age == null) {
      return {
        status: 'unknown',
        headline: `${gate.hardMinFor} requires you to be ${gate.hardMin}.`,
        detail: `${gate.published} ${gate.underageNote} ${gate.stateCaveat}`,
        underageStatus: gate.underageStatus,
        blocking: false,
        basis: gate.basis,
      };
    }
    if (age < gate.hardMin) {
      return {
        status: 'provisional',
        headline: `You are under ${gate.hardMin}, so you cannot hold ${c.abbreviation} certification yet — but you are not shut out.`,
        detail: `${gate.published} ${gate.underageNote} ${gate.stateCaveat}`,
        underageStatus: gate.underageStatus,
        // Not blocking: the student should still log the course and the Assessment status.
        blocking: false,
        basis: gate.basis,
      };
    }
    return { status: 'ok', headline: '', detail: gate.stateCaveat || '', blocking: false, basis: gate.basis };
  }

  if (min == null) return { status: 'unknown', headline: '', detail: '', blocking: false };

  if (age == null) {
    return {
      status: 'unknown',
      headline: `Typical minimum age: ${min}${c.minAge.basis === 'state-varies' ? ', and it varies by state' : ''}.`,
      detail: c.minAge.note || '',
      blocking: false,
      basis: c.minAge.basis,
    };
  }

  if (age < min) {
    const varies = c.minAge.basis !== 'issuer-published';
    return {
      status: varies ? 'provisional' : 'too-young',
      headline: varies
        ? `Usually ${min}+, but this one varies — check your own state or provider before you rule it out.`
        : `${c.issuers[0] || 'The issuing body'} requires you to be ${min}.`,
      detail: c.minAge.note || '',
      blocking: !varies,
      basis: c.minAge.basis,
    };
  }

  return { status: 'ok', headline: '', detail: '', blocking: false, basis: c.minAge.basis };
}

/**
 * A starting guess at a student's age from their year in school, used to seed the age field so the
 * gates say something useful before anyone types anything. It is a guess and the UI says so — a
 * 17-year-old sophomore and a 13-year-old freshman both exist, and the EMT gate is exact enough
 * that being wrong about it matters.
 */
export function typicalAgeForGrade(gradeStage) {
  return { freshman: 14, sophomore: 15, junior: 16, senior: 17, gap: 16 }[gradeStage] ?? null;
}

/**
 * The separate wall: bodies that will not award the credential until the student has a diploma.
 * Distinct from age — a 19-year-old who left school early hits this and a 17-year-old senior in a
 * CTE program often does not.
 */
export function provisionalNote(credential) {
  const c = typeof credential === 'string' ? getCredential(credential) : credential;
  return c?.provisional?.applies ? c.provisional : null;
}

// ── Search ───────────────────────────────────────────────────────────────────

/**
 * Rank the database against what the student typed.
 *
 * The ranking is the product here. Typing "cna" has to lead with the CNA and not with "Certified
 * Nursing Assistant" buried under "Certified Clinical Medical Assistant"; typing "stna" has to
 * find the CNA even though the letters S-T-N-A appear nowhere in its official name; typing "cpt"
 * has to lead with phlebotomy rather than with the personal trainer, because in this app's context
 * that is overwhelmingly what is meant.
 *
 * State-aware: when the student has told us their state, that state's name for a credential is
 * searched too and is what comes back as the label.
 */
export function searchCredentials(query, { limit = 14, stateCode = null, types = null } = {}) {
  const q = norm(query);
  const pool = types ? CREDENTIALS.filter(c => types.includes(c.type)) : CREDENTIALS;
  if (!q) return [];

  const scored = [];
  for (const item of pool) {
    const official = norm(item.officialName);
    const abbr = norm(item.abbreviation);
    const stateName = norm(item.stateNames?.[(stateCode || '').toUpperCase()] || '');
    const aliases = item.aliases || [];

    let score = 0;
    if (abbr === q) score = 200;                                   // exact abbreviation wins outright
    else if (aliases.includes(q)) score = 170;
    else if (stateName && stateName.startsWith(q)) score = 160;    // your state's own word for it
    else if (official.startsWith(q)) score = 140;
    else if (abbr.startsWith(q)) score = 120;
    else if (official.includes(q)) score = 90;
    else if (stateName.includes(q)) score = 85;
    else if (aliases.some(a => a.startsWith(q))) score = 70;
    else if (aliases.some(a => a.includes(q))) score = 45;
    else if (norm(item.summary).includes(q)) score = 25;
    else if ((item.issuers || []).some(i => norm(i).includes(q))) score = 20;

    if (!score) continue;
    // A tie between a credential and a skill goes to the credential: the field is labeled
    // "Skill or certification" and the certifications are the ones with a wrong-name problem.
    if (item.type === 'skill') score -= 4;
    scored.push({ item, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.item.officialName.localeCompare(b.item.officialName))
    .slice(0, limit)
    .map(s => s.item);
}

/** Exact lookup by id, official name, or any state name — used to re-link a stored row. */
export function findCredential(nameOrId) {
  if (!nameOrId) return null;
  const byId = getCredential(nameOrId);
  if (byId) return byId;
  const n = norm(nameOrId);
  return CREDENTIALS.find(c =>
    norm(c.officialName) === n
    || norm(c.abbreviation) === n
    || Object.values(c.stateNames || {}).some(s => norm(s) === n)
  ) || null;
}

// ── Presentation helpers ─────────────────────────────────────────────────────

/**
 * The one-line qualifier under a credential in the picker: what type it is, what it costs, and
 * whether a CTE program hands it over free. Written to be scannable, not complete.
 */
export function credentialSubtitle(c) {
  const t = credentialType(c.type);
  const bits = [t.short];
  if (c.issuers?.[0]) bits.push(c.issuers[0]);
  return bits.join(' · ');
}

export function credentialMeta(c) {
  if (c.type === 'skill') return '';
  if (c.cteCommon) return 'often free in CTE';
  if (c.cost && c.cost.low === 0) return 'often free';
  if (c.cost && c.cost.high) return `~$${c.cost.low}–${c.cost.high}`;
  return c.renewalMonths ? `renews ${c.renewalMonths}mo` : '';
}

/** Which heading this record belongs under on an exported résumé. The point of the whole type field. */
export function resumeHeading(credentialOrType) {
  const key = typeof credentialOrType === 'string' ? credentialOrType : credentialOrType?.type;
  return credentialType(key).resumeHeading;
}

/**
 * The advisory shown when a student files a course completion card. Returned rather than thrown:
 * they are allowed to log it, they just get told once what it is.
 */
export function miscategorizationWarning(credential) {
  const c = typeof credential === 'string' ? getCredential(credential) : credential;
  if (!c || credentialType(c.type).isCertification) return null;
  if (c.type === 'skill') return null;
  return c.notACertification || CREDENTIAL_TYPES['course-completion'].blurb;
}

/** Registry link for a record — the confirmed CTID where we have one, a real search where we don't. */
export function registryLink(credential) {
  const c = typeof credential === 'string' ? getCredential(credential) : credential;
  if (!c) return null;
  if (c.registry?.ctid) {
    return { url: `https://credentialfinder.org/credential/${c.registry.ctid}`, mapped: true };
  }
  return { url: credentialFinderUrl(c.registry?.query || c.officialName), mapped: false };
}

// ── Expiry ───────────────────────────────────────────────────────────────────

/** earned_date + renewalMonths → expiry (YYYY-MM-DD), or '' when the credential never expires. */
export function computeExpiry(earnedDate, months) {
  if (!earnedDate || !months) return '';
  const d = new Date(earnedDate + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Rolling forward off a long month (Jan 31 + 24mo) overflows into the next one; clamp back to
  // the last day of the intended month.
  if (d.getDate() !== day) d.setDate(0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Grouping for the picker ──────────────────────────────────────────────────

/**
 * Group a result list by credential type, in the canonical type order, so the menu always reads
 * State credential → National cert → Course card → Skill. The header IS the teaching: a student
 * who sees BLS sitting under "Course completion card" has learned the distinction without being
 * lectured about it.
 */
export function groupByType(items) {
  const buckets = new Map(CREDENTIAL_TYPE_KEYS.map(k => [k, []]));
  for (const item of items) {
    if (!buckets.has(item.type)) buckets.set(item.type, []);
    buckets.get(item.type).push(item);
  }
  return [...buckets.entries()]
    .filter(([, list]) => list.length > 0)
    .map(([key, list]) => ({ key, label: CREDENTIAL_TYPES[key].label, items: list }));
}
