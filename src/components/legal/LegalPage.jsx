// The renderer for both legal documents.
//
// One component, two documents: the Terms and the Privacy Policy are the same
// shape (title, intro, numbered sections of blocks), and the thing that makes a
// legal page trustworthy is that it looks the same every time you visit it. So
// the content lives in src/legal/*.js as data and this file is the only place
// that decides how any of it looks.
//
// Two deliberate choices worth keeping:
//
//  1. It is a self-contained page, not a modal or a drawer. It has its own URL,
//     it is linkable, it survives a refresh, and it can be sent to a parent.
//     "Where is your privacy policy" should have a URL as its answer.
//
//  2. It renders in the student's own theme, like every other surface. It used
//     to pin to the dark palette on the same reasoning AuthGate used to pin the
//     signed-out screens — that no preference has been expressed yet. Once the
//     landing page, the auth screens and the app all follow one theme, a legal
//     document that ignores it is the only thing on the site that changes
//     appearance when you open it, which is precisely the surprise the pinning
//     was meant to avoid. `P` is the live token object, mutated in place on a
//     theme change (see lib/theme.js), so nothing here may hoist it into a
//     module-level literal.

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, Shield, Link2, Check } from 'lucide-react';
import { C as P } from '../../lib/theme';
import { LEGAL, formatLegalDate } from '../../legal/legalConfig';
import { TERMS_DOC } from '../../legal/terms';
import { PRIVACY_DOC } from '../../legal/privacy';
import { LEGAL_VIEWS } from '../../lib/routes';

const DOCS = { terms: TERMS_DOC, privacy: PRIVACY_DOC };
const ICONS = { terms: FileText, privacy: Shield };

/** The version/date line for a doc — each document carries its own version. */
function docMeta(slug) {
  return slug === 'terms'
    ? { version: LEGAL.termsVersion, updated: LEGAL.lastUpdated, effective: LEGAL.effectiveDate }
    : { version: LEGAL.privacyVersion, updated: LEGAL.lastUpdated, effective: LEGAL.effectiveDate };
}

// ── Blocks ──────────────────────────────────────────────────────────────────
// A block is a string (paragraph) or a single-key object. Anything unrecognised
// renders as nothing rather than as "[object Object]" — a malformed block should
// be a missing paragraph in review, not garbage in front of a user.

function Paragraph({ children }) {
  return (
    <p style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.72, color: P.t2 }}>{children}</p>
  );
}

function Emphasis({ children }) {
  return (
    <p
      style={{
        margin: '0 0 16px',
        padding: '14px 16px',
        fontSize: 14.5,
        lineHeight: 1.7,
        color: P.t1,
        fontWeight: 600,
        background: P.surfHi,
        borderLeft: `3px solid ${P.blueL}`,
        borderRadius: '0 10px 10px 0',
      }}
    >
      {children}
    </p>
  );
}

function Note({ children }) {
  return (
    <div
      style={{
        margin: '0 0 18px',
        padding: '15px 17px',
        fontSize: 14.5,
        lineHeight: 1.7,
        color: P.t1,
        background: 'rgba(96,165,250,0.10)',
        border: '1px solid rgba(96,165,250,0.28)',
        borderRadius: 12,
      }}
    >
      {children}
    </div>
  );
}

function SubHeading({ children }) {
  return (
    <h3
      style={{
        margin: '24px 0 10px',
        fontSize: 16,
        fontWeight: 700,
        color: P.t1,
        fontFamily: P.FD,
        letterSpacing: '-0.01em',
      }}
    >
      {children}
    </h3>
  );
}

function BulletList({ items }) {
  return (
    <ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none' }}>
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            position: 'relative',
            padding: '0 0 0 20px',
            margin: '0 0 9px',
            fontSize: 15,
            lineHeight: 1.68,
            color: P.t2,
          }}
        >
          <span aria-hidden="true" style={{ position: 'absolute', left: 4, top: 0, color: P.blueL }}>
            •
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * Tables carry the load-bearing disclosures — the sub-processor list, the
 * lawful-basis grid, the retention schedule — so they get a real <table> with a
 * real <caption>, not a stack of divs. A screen reader user is exactly as
 * entitled to "which third parties get my essays" as anyone else, and on a phone
 * the whole thing scrolls horizontally inside its own box rather than pushing
 * the page sideways.
 */
function LegalTable({ caption, columns, rows, links }) {
  return (
    <div style={{ margin: '0 0 20px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table
        style={{
          width: '100%',
          minWidth: columns.length > 2 ? 560 : 380,
          borderCollapse: 'collapse',
          fontSize: 13.5,
          lineHeight: 1.6,
        }}
      >
        <caption
          style={{
            captionSide: 'top',
            textAlign: 'left',
            padding: '0 0 8px',
            fontSize: 13,
            fontWeight: 600,
            color: P.t3,
          }}
        >
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                scope="col"
                style={{
                  textAlign: 'left',
                  padding: '9px 12px',
                  color: P.t1,
                  fontWeight: 700,
                  fontSize: 12.5,
                  letterSpacing: '.03em',
                  textTransform: 'uppercase',
                  background: P.surfHi,
                  borderBottom: `1px solid ${P.b1}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td
                  key={c}
                  style={{
                    padding: '10px 12px',
                    color: c === 0 ? P.t1 : P.t2,
                    fontWeight: c === 0 ? 600 : 400,
                    verticalAlign: 'top',
                    borderBottom: `1px solid ${P.b1}`,
                  }}
                >
                  {cell}
                  {c === 0 && links?.[r] && (
                    <>
                      {' '}
                      <a
                        href={links[r]}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: P.blueL, fontWeight: 500, fontSize: 12 }}
                      >
                        policy ↗
                      </a>
                    </>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Block({ block }) {
  if (typeof block === 'string') return <Paragraph>{block}</Paragraph>;
  if (!block || typeof block !== 'object') return null;
  if (block.heading) return <SubHeading>{block.heading}</SubHeading>;
  if (block.emphasis) return <Emphasis>{block.emphasis}</Emphasis>;
  if (block.note) return <Note>{block.note}</Note>;
  if (block.list) return <BulletList items={block.list} />;
  if (block.table) return <LegalTable {...block.table} />;
  return null;
}

// ── Section ─────────────────────────────────────────────────────────────────

function Section({ section }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}#${section.id}`;
    // Anyone answering "where does it say that?" needs to send a link to the
    // exact clause, not to the top of a 24-section document.
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done).catch(() => {});
    else done();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}#${section.id}`);
  }

  return (
    <section id={section.id} style={{ margin: '0 0 40px', scrollMarginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '0 0 12px' }}>
        <h2
          style={{
            margin: 0,
            fontSize: 19,
            fontWeight: 800,
            color: P.t1,
            fontFamily: P.FD,
            letterSpacing: '-0.015em',
            lineHeight: 1.35,
          }}
        >
          {section.title}
        </h2>
        <button
          type="button"
          onClick={copyLink}
          aria-label={`Copy a link to "${section.title}"`}
          title="Copy link to this section"
          style={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            background: 'none',
            border: 'none',
            padding: 4,
            cursor: 'pointer',
            color: copied ? P.green || P.blueL : P.t3,
          }}
        >
          {copied ? <Check size={14} /> : <Link2 size={14} />}
        </button>
      </div>
      {section.body.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </section>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

/**
 * @param {{ slug: 'terms'|'privacy', onBack?: () => void, onNavigate?: (path: string) => void }} props
 */
export default function LegalPage({ slug, onBack, onNavigate }) {
  const doc = DOCS[slug] || TERMS_DOC;
  const meta = docMeta(slug);
  const Icon = ICONS[slug] || FileText;
  const other = slug === 'terms' ? 'privacy' : 'terms';

  // A deep link (/legal/privacy#children) has to land on the clause, but the
  // browser resolves the fragment before React has rendered anything, so its
  // own scroll restoration finds no such element and gives up. Do it once the
  // sections exist.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) { window.scrollTo(0, 0); return; }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    const previous = document.title;
    document.title = `${doc.title} — ${LEGAL.serviceName}`;
    return () => { document.title = previous; };
  }, [doc.title]);

  const toc = useMemo(
    () => doc.sections.map((s) => ({ id: s.id, title: s.title })),
    [doc.sections],
  );

  function go(path) {
    if (onNavigate) onNavigate(path);
    else window.location.assign(path);
  }

  return (
    // `flex: 1` and `width: 100%` are load-bearing, not belt-and-braces:
    // index.css makes #root a flex container with `overflow: hidden`, so a
    // plain block child becomes a flex item that shrinks to its content —
    // leaving the document in a 780px column pinned to the left of an
    // otherwise-empty screen. This element is also the scroll container, since
    // #root itself never scrolls.
    <div style={{ flex: 1, width: '100%', height: '100%', background: P.bg, color: P.t1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '20px 20px 80px' }}>
        {/* Back */}
        <button
          type="button"
          onClick={() => (onBack ? onBack() : window.history.back())}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            background: 'none',
            border: 'none',
            padding: '8px 0',
            marginBottom: 12,
            color: P.t3,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Header */}
        <header style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Icon size={22} color={P.blueL} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: P.t3,
              }}
            >
              {LEGAL.serviceName}
            </span>
          </div>
          <h1
            style={{
              margin: '0 0 10px',
              fontSize: 32,
              lineHeight: 1.15,
              fontWeight: 800,
              fontFamily: P.FD,
              letterSpacing: '-0.025em',
              color: P.t1,
            }}
          >
            {doc.title}
          </h1>
          <p style={{ margin: '0 0 14px', fontSize: 13.5, color: P.t3, fontFamily: P.FM }}>
            Version {meta.version} · Effective {formatLegalDate(meta.effective)} · Last updated{' '}
            {formatLegalDate(meta.updated)}
          </p>
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.7, color: P.t2 }}>{doc.intro}</p>
        </header>

        {/* Companion document */}
        <button
          type="button"
          onClick={() => go(LEGAL_VIEWS[other])}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 15px',
            marginBottom: 30,
            background: P.surfHi,
            border: `1px solid ${P.b1}`,
            borderRadius: 10,
            color: P.t1,
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {other === 'privacy' ? <Shield size={14} /> : <FileText size={14} />}
          Read the {other === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
        </button>

        {/* Contents */}
        <nav
          aria-label={`${doc.title} contents`}
          style={{
            marginBottom: 36,
            padding: '16px 18px',
            background: P.surf,
            border: `1px solid ${P.b1}`,
            borderRadius: 14,
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: P.t3,
              marginBottom: 10,
            }}
          >
            Contents
          </div>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
            {toc.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  style={{ fontSize: 14, lineHeight: 1.5, color: P.t2, textDecoration: 'none' }}
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Body */}
        {doc.sections.map((section) => (
          <Section key={section.id} section={section} />
        ))}

        {/* Footer */}
        <footer
          style={{
            marginTop: 48,
            paddingTop: 22,
            borderTop: `1px solid ${P.b1}`,
            fontSize: 13,
            lineHeight: 1.7,
            color: P.t3,
          }}
        >
          <p style={{ margin: '0 0 10px' }}>
            © {new Date().getFullYear()} {LEGAL.operatorName}. Questions about this document:{' '}
            <a href={`mailto:${LEGAL.contactEmail}`} style={{ color: P.blueL }}>
              {LEGAL.contactEmail}
            </a>
            .
          </p>
          <p style={{ margin: 0 }}>
            <a href={LEGAL_VIEWS.terms} style={{ color: P.t3 }}>
              Terms of Service
            </a>
            {' · '}
            <a href={LEGAL_VIEWS.privacy} style={{ color: P.t3 }}>
              Privacy Policy
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
