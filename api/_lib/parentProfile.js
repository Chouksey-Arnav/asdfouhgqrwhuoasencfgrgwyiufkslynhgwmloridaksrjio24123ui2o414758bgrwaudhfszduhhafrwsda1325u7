// The parent's declaration: who they are, who they say they are to the student, and the
// attestation they signed. Read by every parent endpoint that does anything on a student's
// behalf, written only by /api/parent/profile.
//
// ── What this is, and what it is not ────────────────────────────────────────
// It is NOT the authorization boundary. That is still, and only, the student: an invitation is
// sent to the student's own mailbox and nothing crosses until they click it (see
// api/_lib/session.js#getActiveLink and migration 0006). Nothing in this file could be forged in
// a way that grants access, because nothing in this file grants access.
//
// What it is: the answer to "who is asking?" — a question the product previously could not
// answer at all. An invitation used to arrive saying "a parent would like to follow your
// progress" above an email address, and the student had to make a consent decision on that. Now
// it arrives naming a person, their stated relationship, and the student's own name as the
// requester typed it — so a request from someone the student does not know is recognisable as
// one. That check happens in a human's head, and it is the only check that can actually catch
// impersonation; everything this module does is in service of making it possible.
//
// It also makes creating a parent account cost something. Every field here is required before
// the account can invite anyone or read anything.
import { getSupabaseAdmin } from './supabaseAdmin.js';

/** Postgres/PostgREST codes that mean "migration 0009 has not been applied here yet". */
const MISSING_SCHEMA = new Set(['42P01', '42883', 'PGRST202', 'PGRST205']);
export const isMissingSchema = (err) =>
  !!err && (MISSING_SCHEMA.has(err.code) || /does not exist|schema cache/i.test(err.message || ''));

/**
 * The attestation, stored verbatim alongside the boolean.
 *
 * Recording the words rather than just the fact is what makes the record worth having later:
 * "they ticked a box" is not evidence of anything a year after the box's wording changed.
 */
export const ATTESTATION_TEXT =
  'I confirm I am the parent or legal guardian of the student named above, that the details I '
  + 'have given are accurate, and I understand this student must approve my request before I can '
  + 'see anything, and can end my access at any time.';

const PROFILE_SELECT =
  'user_id, full_name, relationship, phone, postal_code, student_full_name, student_grade, '
  + 'attested, attested_at, attestation_text, completed_at, created_at, updated_at';

const str = (v, max) => {
  const s = String(v ?? '').trim().replace(/\s+/g, ' ');
  return s ? s.slice(0, max) : '';
};

// Deliberately loose. Households are international, phone formats are not a solved problem, and
// the number is here so a human can be reached about a dispute — not so a regex can adjudicate
// one. Rejecting a legitimate +44 (0)20 number would block a real guardian from a real child's
// dashboard, which is a far worse outcome than storing an oddly-formatted string.
const PHONE_RE = /^[+()\-.\s\d]{7,24}$/;

/**
 * Request body → the row shape, plus the per-field errors.
 *
 * Returns errors keyed by field rather than a single message, because this form is six inputs
 * long and "check your details" above six untouched-looking fields is how a form gets abandoned.
 *
 * @returns {{ values: object, errors: Record<string,string> }}
 */
export function normalizeProfileInput(body = {}) {
  const values = {
    full_name: str(body.fullName, 120),
    relationship: str(body.relationship, 40),
    phone: str(body.phone, 24),
    postal_code: str(body.postalCode, 16) || null,
    student_full_name: str(body.studentFullName, 120),
    student_grade: str(body.studentGrade, 40) || null,
    attested: body.attested === true,
  };

  const errors = {};
  if (values.full_name.length < 2) errors.fullName = 'Enter your full name.';
  if (values.relationship.length < 2) errors.relationship = 'Say how you are related to the student.';
  if (!values.phone) errors.phone = 'Enter a phone number we can reach you on.';
  else if (!PHONE_RE.test(values.phone)) errors.phone = 'That does not look like a phone number.';
  if (values.student_full_name.length < 2) errors.studentFullName = "Enter the student's full name.";
  // The one field whose absence is not a typo. Everything above can be corrected; this is the
  // difference between a form and an agreement.
  if (!values.attested) errors.attested = 'You have to confirm this before we can set up your dashboard.';

  return { values, errors };
}

/** Row → the client shape. Never exposes another account's anything; it is one row, keyed by id. */
export function serializeParentProfile(row) {
  if (!row) return null;
  return {
    fullName: row.full_name,
    relationship: row.relationship,
    phone: row.phone || '',
    postalCode: row.postal_code || '',
    studentFullName: row.student_full_name,
    studentGrade: row.student_grade || '',
    attested: !!row.attested,
    attestedAt: row.attested_at || null,
    completedAt: row.completed_at || null,
    updatedAt: row.updated_at || null,
  };
}

/**
 * The parent's profile row, or null.
 *
 * `schemaMissing` is a real, expected state rather than an error: migrations here are applied by
 * hand (see the header of any migration file), so a deployment can legitimately be running this
 * code against a database without 0009. Callers use it to decide whether the requirement applies
 * at all — see requireCompleteProfile below for why fail-open is the right call THERE and would
 * not be for a real authorization gate.
 */
export async function getParentProfile(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from('parent_profiles')
      .select(PROFILE_SELECT)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return { row: data || null, schemaMissing: false };
  } catch (err) {
    if (isMissingSchema(err)) return { row: null, schemaMissing: true };
    throw err;
  }
}

export const isProfileComplete = (row) => !!row?.completed_at && !!row?.attested;

/**
 * The gate every parent endpoint calls before doing work: sends the response and returns false
 * when the account has not finished its setup.
 *
 * ── Why this fails OPEN on a missing table ──────────────────────────────────
 * Because it is not the thing keeping a stranger out. Consent is: a student has to click a link
 * in their own inbox, and getActiveLink re-reads that consent on every single request. This gate
 * adds accountability and friction on top of it. On a deployment where 0009 has not been applied,
 * failing closed would break every existing parent's dashboard — locking real guardians out of
 * data their children already agreed to share — to enforce a check that was never the reason
 * their access was safe. Failing open leaves the pre-0009 behaviour exactly as it was.
 *
 * A gate that WAS the authorization boundary would have to fail closed, and none of the ones that
 * are (requireParent, getActiveLink) touch this table.
 */
export async function requireCompleteProfile(res, { supabase = getSupabaseAdmin(), userId }) {
  const { row, schemaMissing } = await getParentProfile(supabase, userId);
  if (schemaMissing) return true;
  if (isProfileComplete(row)) return true;
  res.status(403).json({
    error: 'Finish setting up your parent account first.',
    reason: 'profile_incomplete',
  });
  return false;
}

/**
 * Insert-or-update, with completed_at derived here rather than accepted from the client.
 *
 * The client sends fields; whether those fields amount to a finished account is a server
 * decision, because completed_at is what /api/parent/summary reads to decide whether to answer.
 */
export async function saveParentProfile(supabase, userId, values) {
  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    ...values,
    attested_at: values.attested ? now : null,
    attestation_text: values.attested ? ATTESTATION_TEXT : null,
    completed_at: values.attested ? now : null,
  };
  const { data, error } = await supabase
    .from('parent_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select(PROFILE_SELECT)
    .single();
  if (error) throw error;
  return data;
}
