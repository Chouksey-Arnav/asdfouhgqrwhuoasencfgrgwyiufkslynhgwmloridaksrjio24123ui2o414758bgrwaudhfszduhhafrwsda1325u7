// Shared shape for app_users rows returned to the client. Never include password_hash.
export function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    gradeLevel: user.grade_level,
    testTrack: user.test_track,
    onboardingComplete: user.onboarding_complete,
    hasPassword: !!user.password_hash,
    // Decides which application the browser renders (see AuthGate) and which endpoints will
    // answer this session (see requireStudent/requireParent in api/_lib/session.js). Defaulted
    // rather than read straight through, because this code also runs against deployments where
    // migration 0006 has not been applied by hand yet and the column simply is not there.
    role: user.role === 'parent' ? 'parent' : 'student',
  };
}
