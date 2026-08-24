import React from 'react';

// ── The one boundary above everything else ──────────────────────────────────
//
// AuthGate and App each guard specific sections internally, but nothing sat above
// AuthGate itself. React's rule for an uncaught render error is to unmount the
// whole tree, so any throw between clicking "Log in" and the next paint — a bad
// server response shape, a null field on a half-migrated user record, anything —
// took the entire page down to a blank white screen with nothing but a console
// error to explain it. That is what "the login button gives me a blank screen"
// looks like from the outside, whatever the underlying bug turns out to be.
//
// This does not fix any particular bug. It makes sure the NEXT one, whatever it
// is, ends on a screen that says so and offers a way back, instead of a blank
// tab — which is the difference between a bug report and a support ticket.
//
// Deliberately styled with plain inline CSS rather than the app's theme tokens:
// this is the backstop for when something in the app itself has gone wrong, so
// it must not depend on any of the app's own modules to render.
export default class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('MSP root error boundary:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 16, padding: 40, textAlign: 'center',
          background: '#0b0f19', color: '#e6e9f0', fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ fontSize: 22, letterSpacing: 'calc(-0.4px + var(--msp-letter-spacing))', lineHeight: 'calc(1.35 * var(--msp-line-scale))', fontWeight: 700 }}>Oops! Loading issue.</div>
          <div style={{ maxWidth: 420, lineHeight: 1.55, color: '#a3acc2', fontSize: 14 }}>
            Try reloading — if it keeps happening, contact our support team at{' '}
            <a href="mailto:medschoolprepsupport@gmail.com" style={{ color: '#8ab4ff' }}>medschoolprepsupport@gmail.com</a>.
          </div>
          <button
            type="button"
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 14,
            }}
          >
            Reload the page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
