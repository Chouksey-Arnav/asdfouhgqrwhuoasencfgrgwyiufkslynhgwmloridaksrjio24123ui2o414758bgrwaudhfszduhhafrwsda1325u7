// /api/auth/google — exchanges a Supabase Auth access token (minted client-side by
// supabase.auth.signInWithOAuth({ provider: 'google' }), see src/lib/supabaseClient.js)
// for this app's own session token. This is the one place the client-obtained Supabase
// token touches the server: we hand it to Supabase Auth to ask "who is this", then drive
// the exact same app_users/sessions flow every other sign-in path uses (see login.js,
// complete-signup.js) — the client still never talks to Supabase's data API directly.
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { serializeUser } from '../_lib/serializeUser.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  const accessToken = String(body?.accessToken || '').trim();
  if (!accessToken) return res.status(400).json({ error: 'Missing access token.' });

  try {
    const supabase = getSupabaseAdmin();

    const { data: authData, error: authErr } = await supabase.auth.getUser(accessToken);
    if (authErr || !authData?.user) {
      return res.status(401).json({ error: 'Could not verify your Google sign-in. Please try again.' });
    }

    const googleUser = authData.user;
    if (googleUser.app_metadata?.provider !== 'google') {
      return res.status(401).json({ error: 'Not a Google sign-in.' });
    }

    const email = String(googleUser.email || '').trim().toLowerCase();
    if (!email || !googleUser.email_confirmed_at) {
      return res.status(401).json({ error: "Your Google account's email isn't verified." });
    }

    const name = googleUser.user_metadata?.full_name || googleUser.user_metadata?.name || null;

    let { data: user, error: userErr } = await supabase.from('app_users').select('*').eq('email', email).maybeSingle();
    if (userErr) throw userErr;

    if (!user) {
      // Role is honoured only when this Google sign-in CREATES the account — it is a signup
      // parameter, not a session parameter. An existing account's role is never touched here, so
      // a student cannot re-run the OAuth flow with role='parent' to escalate into other people's
      // dashboards. Same rule as api/auth/complete-signup.js; see migration 0006's header.
      const role = body?.role === 'parent' ? 'parent' : 'student';
      const { data: created, error: createErr } = await supabase
        .from('app_users').insert({ email, name, role }).select('*').single();
      if (createErr) throw createErr;
      user = created;
    } else if (!user.name && name) {
      const { data: updated, error: updErr } = await supabase
        .from('app_users').update({ name }).eq('id', user.id).select('*').single();
      if (updErr) throw updErr;
      user = updated;
    }

    const { data: session, error: sessErr } = await supabase
      .from('sessions')
      .insert({ user_id: user.id, expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString() })
      .select('*')
      .single();
    if (sessErr) throw sessErr;

    return res.status(200).json({ token: session.id, user: serializeUser(user) });
  } catch (err) {
    console.error('google auth error:', err);
    return res.status(500).json({ error: 'Could not sign in with Google. Please try again.' });
  }
}
