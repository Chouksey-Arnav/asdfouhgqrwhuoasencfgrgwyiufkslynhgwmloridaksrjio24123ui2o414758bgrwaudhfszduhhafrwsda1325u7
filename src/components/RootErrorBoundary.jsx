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
          justifyContent: 'center', gap: 18, padding: 40, textAlign: 'center',
          background: '#0b0f19', color: '#e6e9f0', fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Something went wrong</div>
          <div style={{ maxWidth: 420, lineHeight: 1.6, color: '#a3acc2', fontSize: 14 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </div>
          <button
            type="button"
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
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
