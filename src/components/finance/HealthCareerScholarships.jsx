import React, { useMemo, useState } from 'react';
import { Stethoscope, Compass, Clock3, ExternalLink, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { C, glass2, btnSm, R, CC, pill, tint } from '../../lib/theme';
import { OPEN_TO } from '../../data/healthCareerScholarships';
import { PATHWAY_FINANCE } from '../../data/pathwayFinance';
import { healthScholarshipsFor, scholarshipCounts } from '../../lib/scholarshipFilters';

// ─────────────────────────────────────────────────────────────────────────────
// Health-career scholarship discovery, filtered to a high school senior.
//
// ── Why the discovery entries are rendered as loudly as the named awards ────
// A student who has been told to "search for scholarships" searches national
// databases, finds four thousand results, is eligible for six, and concludes
// there is nothing for them. The awards they would actually win — the hospital
// auxiliary where they volunteer, the county medical society, their parent's
// employer — are not in any database, and cannot be, because they are thousands
// of separate local funds.
//
// So a discovery entry is a first-class card with the same visual weight as a
// named national award, and it carries an explicit `howToFind` — the sentence
// to say and the person to say it to. It deliberately shows no amount and no
// deadline, because it has none, and a card that showed a plausible-looking
// blank there would read as missing data rather than as a different kind of
// thing.
//
// ── Why "not yet" entries are shown rather than hidden ──────────────────────
// The FNSNA nursing scholarship rejects high school students explicitly, and
// ambitious seniors apply to it every year and lose the evening. Showing it,
// grayed, under "once you're enrolled" is worth more than hiding it: the lesson
// is that the profession-specific money starts the moment they matriculate, so
// they should stop hunting for it now.
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_TABS = [
  { id: 'senior', label: 'I can apply now' },
  { id: 'undergrad', label: 'Once I\'m enrolled' },
  { id: 'all', label: 'Everything' },
];

export default function HealthCareerScholarships({ accent = C.green, pathwayFinanceId = null }) {
  const [stage, setStage] = useState('senior');
  const [pathwayFilter, setPathwayFilter] = useState(pathwayFinanceId || 'all');
  const [openId, setOpenId] = useState(null);
  const counts = scholarshipCounts();

  const entries = useMemo(() => {
    const list = healthScholarshipsFor(stage);
    return pathwayFilter === 'all' ? list : list.filter(s => (s.pathways || []).includes(pathwayFilter));
  }, [stage, pathwayFilter]);

  return (
    <div style={CC({ gap: 12 })}>
      <p style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55, margin: 0 }}>
        Nearly every scholarship with "nursing" or "medical" in its name requires you to be enrolled
        in the program already — which is why searching for one as a senior feels like there is
        nothing out there. There is. It is mostly local, mostly unadvertised, and mostly won by the
        student who thought to ask. {counts.healthDiscovery} of the {counts.healthNamed + counts.healthDiscovery} entries
        below are not awards at all but places to look, with the question to ask and who to ask it of.
      </p>

      <div style={R({ gap: 4, flexWrap: 'wrap' })}>
        {STAGE_TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setStage(t.id)}
            style={pill(stage === t.id ? tint(accent, 0.18) : C.b0, stage === t.id ? accent : C.t3, {
              cursor: 'pointer', border: `1px solid ${stage === t.id ? tint(accent, 0.32) : C.b1}`,
              fontSize: 10.5, fontWeight: stage === t.id ? 700 : 500,
            })}>
            {t.label}
          </button>
        ))}
        <span style={{ width: 1, alignSelf: 'stretch', background: C.b1, margin: '0px 4px' }} />
        <button type="button" onClick={() => setPathwayFilter('all')}
          style={pill(pathwayFilter === 'all' ? tint(accent, 0.18) : C.b0, pathwayFilter === 'all' ? accent : C.t3,
            { cursor: 'pointer', border: `1px solid ${C.b1}`, fontSize: 10.5 })}>All</button>
        {PATHWAY_FINANCE.slice().sort((a, b) => a.order - b.order).map(p => {
          const on = pathwayFilter === p.id;
          const color = C[p.colorKey] || accent;
          return (
            <button key={p.id} type="button" onClick={() => setPathwayFilter(p.id)}
              style={pill(on ? tint(color, 0.18) : C.b0, on ? color : C.t3,
                { cursor: 'pointer', border: `1px solid ${on ? tint(color, 0.3) : C.b1}`, fontSize: 10.5 })}>
              {p.short}
            </button>
          );
        })}
      </div>

      {entries.length === 0 ? (
        <div style={glass2({ padding: 16, textAlign: 'center' })}>
          <div style={{ fontSize: 12.5, color: C.t2 }}>
            Nothing health-specific in this combination. Try "Everything", or the general scholarship
            database below — most of the large national awards are open to any intended major.
          </div>
        </div>
      ) : (
        <div style={CC({ gap: 8 })}>
          {entries.map(s => {
            const discovery = s.kind === 'discovery';
            const notYet = (s.openTo || []).includes('undergrad') && !(s.openTo || []).includes('senior');
            const color = discovery ? C.violetL : notYet ? C.amberL : C.greenL;
            const open = openId === s.id;
            const Icon = discovery ? Compass : notYet ? Clock3 : Stethoscope;
            return (
              <div key={s.id} style={{
                ...glass2({ padding: 0, overflow: 'hidden' }),
                borderLeft: `3px solid ${color}`,
                opacity: notYet ? 0.82 : 1,
                background: `linear-gradient(120deg,${tint(color, discovery ? 0.06 : 0.04)},rgba(255,255,255,0.02) 55%)`,
              }}>
                <button type="button" onClick={() => setOpenId(open ? null : s.id)} aria-expanded={open}
                  style={{ all: 'unset', boxSizing: 'border-box', display: 'block', width: '100%', cursor: 'pointer', padding: 12 }}>
                  <div style={R({ gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' })}>
                    <Icon size={15} color={color} style={{ flexShrink: 0, marginTop: 4 }} />
                    <div style={{ flex: 1, minWidth: 190 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>
                        {s.org}{s.amount ? ` · ${s.amount}` : ''}
                      </div>
                      <div style={R({ gap: 4, marginTop: 8, flexWrap: 'wrap' })}>
                        <span style={pill(tint(color, 0.14), color, { fontSize: 9 })}>
                          {discovery ? 'Where to look — not an application' : (OPEN_TO[notYet ? 'undergrad' : 'senior']?.label)}
                        </span>
                        {(s.pathways || []).map(id => (
                          <span key={id} style={pill(C.b0, C.t3, { fontSize: 9 })}>
                            {PATHWAY_FINANCE.find(x => x.id === id)?.short || id}
                          </span>
                        ))}
                      </div>
                    </div>
                    {open ? <ChevronUp size={15} color={C.t3} /> : <ChevronDown size={15} color={C.t3} />}
                  </div>
                </button>

                {open && (
                  <div style={{ padding: '0px 12px 12px', borderTop: `1px solid ${C.b1}`, paddingTop: 12, ...CC({ gap: 8 }) }}>
                    <Line title="Who's eligible">{s.eligibility}</Line>
                    {s.deadline && <Line title="Typical timing">{s.deadline}</Line>}
                    {s.howToFind && (
                      <div style={{
                        ...glass2({ padding: 12 }), border: `1px solid ${tint(C.violet, 0.24)}`,
                        background: tint(C.violet, 0.05),
                      }}>
                        <div style={{ ...R({ gap: 8, alignItems: 'flex-start' }), fontSize: 12, color: C.t2, lineHeight: 1.55 }}>
                          <Search size={12} color={C.violetL} style={{ flexShrink: 0, marginTop: 4 }} />
                          <span><b style={{ color: C.t1 }}>How to find it:</b> {s.howToFind}</span>
                        </div>
                      </div>
                    )}
                    <Line title="Why it's worth your evening">{s.why}</Line>
                    {s.alsoInGeneralDatabase && (
                      <div style={{ fontSize: 10.5, color: C.t4 }}>
                        Also listed in the general scholarship database below, where you can track it.
                      </div>
                    )}
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer"
                        style={{ ...btnSm(C.s3, { color: C.t2, textDecoration: 'none', alignSelf: 'flex-start' }) }}>
                        <ExternalLink size={12} /> Official page
                      </a>
                    )}
                    {!discovery && (
                      <div style={{ fontSize: 10.5, color: C.t4, lineHeight: 1.5 }}>
                        Amounts and deadlines are typical ranges and seasons, not this year's figures —
                        both move annually. Confirm on the program's own site before you plan around them.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Line({ title, children }) {
  return (
    <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }}>
      <b style={{ color: C.t1 }}>{title}:</b> {children}
    </div>
  );
}
