import React from 'react';

// ── The safety net for the crash React's error boundaries can't see ─────────────────────────
//
// RootErrorBoundary and App.jsx's per-tab ErrorBoundary only catch errors thrown DURING React's
// render/commit/lifecycle — that's how error boundaries work. An error thrown from a setInterval
// callback, a stale promise's .then(), or an event handler never reaches either of them: by
// default the browser just logs it to the console and the page is left exactly as it was. If
// whatever broke was needed for the next paint to make sense, the result is a UI that's silently
// stuck — the sidebar still shows the tab you clicked, but the content area never fills in, and
// nothing short of a manual reload gets it moving again. That is the "I have to press Ctrl+R"
// report this component exists to close: it is the one place in the app that hears about
// *every* uncaught error, from any source, and turns it into a screen that says so instead of a
// silent freeze.
//
// Deliberately outside React's tree and mounted above RootErrorBoundary (see main.jsx) with
// plain inline styles, same reasoning as RootErrorBoundary and PwaUpdatePrompt: this has to be
// able to render even if the rest of the app's styling system is the thing that broke.
const SUPPORT_EMAIL = 'medschoolprepsupport@gmail.com';

export default class GlobalCrashGuard extends React.Component {
  constructor(props) {
    super(props);
    this.state = { caught: false };
    this.handleWindowError = this.handleWindowError.bind(this);
    this.handleRejection = this.handleRejection.bind(this);
  }

  componentDidMount() {
    window.addEventListener('error', this.handleWindowError);
    window.addEventListener('unhandledrejection', this.handleRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handleRejection);
  }

  handleWindowError(event) {
    // Cross-origin script errors surface as an opaque "Script error." with no useful info —
    // nothing actionable happened in OUR code, so don't scare the student over it.
    if (!event?.error && event?.message === 'Script error.') return;
    console.error('MSP global error guard:', event?.error || event?.message);
    this.setState({ caught: true });
  }

  handleRejection(event) {
    console.error('MSP global error guard (unhandled rejection):', event?.reason);
    this.setState({ caught: true });
  }

  render() {
    if (!this.state.caught) return this.props.children;
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 16, padding: 40, textAlign: 'center',
        background: '#0b0f19', color: '#e6e9f0', fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Oops! Loading issue.</div>
        <div style={{ maxWidth: 440, lineHeight: 1.6, color: '#a3acc2', fontSize: 14 }}>
          Something on this page got stuck. Try reloading — if it keeps happening, contact our
          support team at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: '#8ab4ff' }}>{SUPPORT_EMAIL}</a>.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => { window.location.href = '/prep'; }}
            style={{
              padding: '10px 20px', borderRadius: 8, border: '1px solid #2a3352', cursor: 'pointer',
              background: 'transparent', color: '#e6e9f0', fontWeight: 600, fontSize: 14,
            }}
          >
            Go to Prep
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 14,
            }}
          >
            Reload the page
          </button>
        </div>
      </div>
    );
  }
}
