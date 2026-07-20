// Shared helper for spending an email_verifications row issued by api/auth/verify-otp.
// Consuming is atomic (the update is scoped to consumed = false) so the same token
// can never complete a signup or password reset twice, even under concurrent requests.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function consumeVerificationToken(supabase, { token, email, purpose }) {
  if (!token || !UUID_RE.test(token)) return false;

  const { data: row } = await supabase
    .from('email_verifications')
    .select('id, expires_at')
    .eq('id', token)
    .eq('email', email)
    .eq('purpose', purpose)
    .eq('consumed', false)
    .maybeSingle();
  if (!row || new Date(row.expires_at) < new Date()) return false;

  const { data: updated } = await supabase
    .from('email_verifications')
    .update({ consumed: true })
    .eq('id', token)
    .eq('consumed', false)
    .select('id')
    .maybeSingle();
  return !!updated;
}
