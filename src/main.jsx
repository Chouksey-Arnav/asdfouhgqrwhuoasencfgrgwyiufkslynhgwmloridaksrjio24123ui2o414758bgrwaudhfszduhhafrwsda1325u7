import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AuthGate from './components/AuthGate.jsx';
import './index.css';

const container = document.getElementById('root');

// Drop the pre-JavaScript shell (see the comment on #seo-shell in index.html)
// before React's first render rather than leaving it to React's own container
// clear. Two reasons to be explicit: the removal is then a documented step
// someone can find when they wonder where the static HTML went, and it happens
// in this tick rather than in React's commit phase, so there is no frame where
// the shell and a mounting app are both in the DOM.
container?.querySelector('#seo-shell')?.remove();

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <AuthGate>
      {({ user, setUser, openLegal }) => (
        <App account={user} onAccountChange={setUser} onOpenLegal={openLegal} />
      )}
    </AuthGate>
  </React.StrictMode>
);
