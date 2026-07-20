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
  };
}
