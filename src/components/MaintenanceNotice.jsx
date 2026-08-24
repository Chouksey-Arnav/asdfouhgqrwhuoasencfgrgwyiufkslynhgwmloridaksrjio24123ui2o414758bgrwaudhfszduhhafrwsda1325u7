import React from 'react';

export default function MaintenanceNotice() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '2rem',
      background: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    }}>
      <div style={{ maxWidth: 480 }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>
          We&apos;re temporarily down
        </h1>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#cbd5e1' }}>
          MedSchoolPrep is currently facing an issue and is unavailable while
          we work to resolve it. Please check back in the next couple of
          days — thanks for your patience.
        </p>
      </div>
    </div>
  );
}
