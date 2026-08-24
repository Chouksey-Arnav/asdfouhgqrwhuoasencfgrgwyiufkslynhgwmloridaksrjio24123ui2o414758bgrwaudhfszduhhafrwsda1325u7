import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Library, Search, ChevronDown, ExternalLink, Filter, Play, BookOpen, Star, X,
} from 'lucide-react';
import { C, glass, glass2, btnSm, btnG, inp, R, CC, G, tint, pill, onTint } from '../../lib/theme';
import { SatPageHeader, SatCard, Segmented, satBtn, satWash } from './satUi';
import { StatTile } from '../ui/PanelHero';
import MathText from '../ui/MathText';
import { SatSkillVideos } from './SatVideoRecs';
import {
  SAT_QUESTIONS, pool, BANK_SIZE,
} from '../../data/sat/questions/index.js';
import {
  SAT_SECTIONS, SAT_DOMAINS, SAT_SKILLS, SECTION_IDS, DOMAINS_BY_SECTION,
  SKILLS_BY_DOMAIN, DIFFICULTIES, DIFFICULTY_IDS, TRAP_TAGS, skillMeta,
} from '../../data/sat/taxonomy';
import { orderedResources, RESOURCE_KINDS } from '../../data/sat/resources.js';

// ─────────────────────────────────────────────────────────────────────────────
// Library — the question bank, browsable, plus the official resources.
//
// WHY A BROWSER AT ALL
// Every other route into the bank is chosen FOR the student: the selector picks
// their drill set, the test builder assembles their module. That is right for
// most sessions and wrong for one specific and common one — "I have twenty
// minutes and I know exactly what I am bad at." Filtering the whole bank by
// domain, skill and difficulty is the only way to serve that, and hiding a
// 300-item bank behind an algorithm makes the app feel smaller than it is.
//
// WHY THE OFFICIAL RESOURCES SHARE THIS SCREEN
// Because the honest version of "here is our question bank" is "and here is
// where to find the official one". Putting them side by side is a deliberate
// admission: our items are original and blueprint-matched, but the four
// adaptive tests in Bluebook are written by the people who write the real exam
// and nothing here replaces them. A prep tool that buries that is selling
// something.
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'bank', label: 'Question bank' },
  { id: 'official', label: 'Official & free resources' },
];

const SECTION_FILTERS = [
  { id: 'all', label: 'Both sections' },
  ...SECTION_IDS.map(s => ({ id: s, label: SAT_SECTIONS[s].label })),
];

const DIFFICULTY_FILTERS = [
  { id: 'all', label: 'Any level' },
  ...DIFFICULTY_IDS.map(d => ({ id: d, label: DIFFICULTIES[d].label })),
];

// Grid-in items exist only in Math, so this filter is a no-op on the R&W side
// of the bank. It is offered anyway rather than hidden conditionally: a student
// who wants to drill exactly the format they keep losing points on should not
// have to discover that the control appears only under one section.
const FORMAT_FILTERS = [
  { id: 'all', label: 'Any format' },
  { id: 'mcq', label: 'Multiple choice' },
  { id: 'spr', label: 'Grid-in' },
];

const PAGE_SIZE = 25;

// How many questions a "practice these" set contains. Matches the Smart Set
// length in SatPracticePanel — a set built from the Library is still a practice
// set, and it should not be a different size just because of where it started.
const PRACTICE_SET_SIZE = 12;

export default function SatLibraryPanel({
  accent = C.sky, isMobile = false, onNavigate, params, onConsumeParams,
}) {
  const [tab, setTab] = useState('bank');
  const [section, setSection] = useState('all');
  const [domain, setDomain] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [format, setFormat] = useState('all');
  const [skill, setSkill] = useState(params?.skill || null);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Deep links from the heat map and the review log arrive as {skill}. Consume
  // the param so navigating away and back does not silently re-apply it.
  React.useEffect(() => {
    if (params?.skill) {
      setSkill(params.skill);
      setSection(skillMeta(params.skill).section || 'all');
      onConsumeParams?.();
    }
  }, [params?.skill]); // eslint-disable-line react-hooks/exhaustive-deps

  // The one description of "what the student is looking at". The results list,
  // the count, and the practice set that can be started from here all read this
  // single object, so the set they get is exactly the slice they filtered to —
  // there is no second, subtly different filter anywhere on this screen.
  const filter = useMemo(() => ({
    section: section === 'all' ? undefined : section,
    domain: domain === 'all' ? undefined : domain,
    skill: skill || undefined,
    difficulty: difficulty === 'all' ? undefined : difficulty,
    format: format === 'all' ? undefined : format,
  }), [section, domain, skill, difficulty, format]);

  const results = useMemo(() => {
    let rows = pool(filter);
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(r =>
        (r.q || '').toLowerCase().includes(q)
        || (r.stimulus || '').toLowerCase().includes(q)
        || (r.notes || []).some(n => n.toLowerCase().includes(q)));
    }
    // Easy first: a student browsing a skill they are weak at should meet the
    // approachable version of it before the hard one, which is also the order
    // the real modules present them in.
    const rank = { E: 0, M: 1, H: 2 };
    return rows.sort((a, b) => (rank[a.difficulty] - rank[b.difficulty]) || a.id.localeCompare(b.id));
  }, [filter, query]);

  const visible = results.slice(0, limit);

  // How many questions the practice button would actually draw from. Deliberately
  // NOT results.length: results is narrowed by the free-text search as well, and
  // the set is built from the filter alone, so counting the searched list would
  // promise a number the session does not deliver.
  const filterCount = useMemo(() => pool(filter).length, [filter]);

  const clearFilters = () => {
    setSection('all'); setDomain('all'); setDifficulty('all'); setFormat('all');
    setSkill(null); setQuery(''); setLimit(PAGE_SIZE);
  };
  const filtered = section !== 'all' || domain !== 'all' || difficulty !== 'all'
    || format !== 'all' || skill || query.trim();

  // Domains offered in the picker, narrowed to the chosen section. This filter
  // did not exist while the bank was small enough that the skill chips fitted
  // on a screen; at 28 skills across 1,000-plus questions, "show me all of
  // Advanced Math" is the step between picking a section and picking a leaf.
  const domainFilters = useMemo(() => {
    const sections = section === 'all' ? SECTION_IDS : [section];
    return [
      { id: 'all', label: 'All domains' },
      ...sections.flatMap(s => (DOMAINS_BY_SECTION[s] || []).map(d => ({
        id: d, label: SAT_DOMAINS[d].label,
      }))),
    ];
  }, [section]);

  // Skills offered in the picker, narrowed to the chosen section and domain.
  const skillGroups = useMemo(() => {
    const sections = section === 'all' ? SECTION_IDS : [section];
    return sections
      .flatMap(s => (DOMAINS_BY_SECTION[s] || []))
      .filter(d => domain === 'all' || d === domain)
      .map(d => ({
        domain: d,
        label: SAT_DOMAINS[d].label,
        color: SAT_DOMAINS[d].color,
        skills: SKILLS_BY_DOMAIN[d] || [],
      }));
  }, [section, domain]);

  // What the practice set built from this screen is called in the player. The
  // player shows a rationale line, and "12 questions from the Library" is worse
  // than useless there — a student who comes back to a paused session needs to
  // know which slice they asked for.
  const filterLabel = useMemo(() => {
    const parts = [];
    if (skill) parts.push(SAT_SKILLS[skill].label);
    else if (domain !== 'all') parts.push(SAT_DOMAINS[domain].label);
    else if (section !== 'all') parts.push(SAT_SECTIONS[section].label);
    if (difficulty !== 'all') parts.push(`${DIFFICULTIES[difficulty].label} only`);
    if (format !== 'all') parts.push(format === 'spr' ? 'grid-in only' : 'multiple choice only');
    return parts.length
      ? `From the Library: ${parts.join(', ')}.`
      : 'From the Library: the whole bank, mixed.';
  }, [section, domain, skill, difficulty, format]);

  const counts = useMemo(() => ({
    total: BANK_SIZE,
    rw: SAT_QUESTIONS.filter(q => q.section === 'rw').length,
    math: SAT_QUESTIONS.filter(q => q.section === 'math').length,
  }), []);

  return (
    <div style={CC({ gap: 20 })}>
      <SatPageHeader
        accent={accent}
        eyebrow="SAT · library" title="Every question, and where the official ones live"
        sub="The whole bank by section, domain, skill and difficulty — plus College Board’s own material."
        meta={[
          { value: counts.total, label: 'questions' },
          { value: Object.keys(SAT_SKILLS).length, label: 'skills covered' },
        ]}
        m={isMobile}
        tourTag="sat-deep-library"
      />

      <Segmented options={TABS} value={tab} onChange={setTab} accent={accent} label="Show" />

      {tab === 'official' ? (
        <OfficialResources isMobile={isMobile} />
      ) : (
        <>
          <div style={G(3, 12, {}, isMobile)}>
            <StatTile icon={Library} color={accent} value={counts.total} label="in the bank" />
            <StatTile icon={BookOpen} color={SAT_SECTIONS.rw.color} value={counts.rw} label="Reading & writing" onClick={() => { setSection('rw'); setSkill(null); }} />
            <StatTile icon={Filter} color={SAT_SECTIONS.math.color} value={counts.math} label="Math" onClick={() => { setSection('math'); setSkill(null); }} />
          </div>

          {/* ── Filters ── */}
          <SatCard title="Narrow it down" icon={Filter} iconColor={accent} m={isMobile}>
            <div style={CC({ gap: 12 })}>
              <Segmented
                options={SECTION_FILTERS}
                value={section}
                onChange={(v) => { setSection(v); setDomain('all'); setSkill(null); setLimit(PAGE_SIZE); }}
                accent={accent}
                label="Section"
              />
              <Segmented
                options={domainFilters}
                value={domain}
                onChange={(v) => { setDomain(v); setSkill(null); setLimit(PAGE_SIZE); }}
                accent={accent}
                label="Domain"
              />
              <Segmented
                options={DIFFICULTY_FILTERS}
                value={difficulty}
                onChange={(v) => { setDifficulty(v); setLimit(PAGE_SIZE); }}
                accent={accent}
                label="Difficulty"
              />
              <Segmented
                options={FORMAT_FILTERS}
                value={format}
                onChange={(v) => { setFormat(v); setLimit(PAGE_SIZE); }}
                accent={accent}
                label="Format"
              />

              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 8 }}>
                  Skill
                </div>
                <div style={CC({ gap: 12 })}>
                  {skillGroups.map(g => (
                    <div key={g.domain}>
                      <div style={{ fontSize: 11, color: g.color, fontWeight: 700, marginBottom: 4 }}>{g.label}</div>
                      <div style={R({ gap: 4, flexWrap: 'wrap' })}>
                        {g.skills.map(s => {
                          const active = skill === s;
                          const n = pool({ skill: s }).length;
                          return (
                            <button
                              key={s}
                              onClick={() => { setSkill(active ? null : s); setLimit(PAGE_SIZE); }}
                              style={btnSm(active ? tint(g.color, 0.2) : 'rgba(255,255,255,0.03)', {
                                border: `1px solid ${active ? tint(g.color, 0.45) : C.b1}`,
                                color: active ? onTint(g.color) : C.t2, fontSize: 11.5, gap: 4,
                              })}
                            >
                              {SAT_SKILLS[s].label}
                              <span style={{ fontFamily: C.FM, fontSize: 10, color: active ? 'rgba(255,255,255,0.7)' : C.t4 }}>{n}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={R({ gap: 8, flexWrap: 'wrap' })}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <Search size={13} color={C.t4} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setLimit(PAGE_SIZE); }}
                    placeholder="Search question text…"
                    aria-label="Search the question bank"
                    style={inp({ paddingLeft: 32, width: '100%' })}
                  />
                </div>
                {filtered && (
                  <button onClick={clearFilters} style={btnG({ padding: '8px 12px', fontSize: 12 })}>
                    <X size={12} /> Clear
                  </button>
                )}
              </div>
            </div>
          </SatCard>

          {/* ── Results ── */}
          <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: C.t2 }}>
              <b style={{ color: C.t1, fontFamily: C.FM }}>{results.length}</b>
              {results.length === 1 ? ' question' : ' questions'}
              {skill ? ` in ${SAT_SKILLS[skill].label}` : ''}
              {query.trim() ? ' matching your search' : ''}
            </span>
            {/* Practice WHAT IS ON SCREEN, not just the selected skill.
                This button used to appear only once a leaf skill was chosen,
                which quietly said that a filter was for reading and a skill was
                for working — so "all the Hard grid-ins in Geometry" was
                browsable and undrillable. The set is built from the same filter
                object the list above is built from, minus the free-text search:
                a keyword match is a way of FINDING a question, not a
                pedagogically coherent set to sit. */}
            {filterCount > 0 && (
              <button
                onClick={() => onNavigate?.('practice', { filter, filterLabel })}
                style={satBtn(accent, { padding: '8px 16px', fontSize: 12 })}
                title={filterLabel}
              >
                <Play size={12} />
                Practice {Math.min(PRACTICE_SET_SIZE, filterCount)} of these
              </button>
            )}
          </div>

          {skill && <SatSkillVideos skill={skill} limit={2} isMobile={isMobile} />}

          {results.length === 0 ? (
            <div style={{ ...glass2({ padding: 20, textAlign: 'center' }), fontSize: 12.5, color: C.t3 }}>
              Nothing matches those filters. Try widening the difficulty or clearing the search.
            </div>
          ) : (
            <div style={CC({ gap: 8 })}>
              {visible.map(q => (
                <BankRow
                  key={q.id}
                  question={q}
                  open={expanded === q.id}
                  onToggle={() => setExpanded(expanded === q.id ? null : q.id)}
                  isMobile={isMobile}
                />
              ))}
              {results.length > visible.length && (
                <button
                  onClick={() => setLimit(l => l + PAGE_SIZE)}
                  style={btnG({ alignSelf: 'center', padding: '8px 16px', fontSize: 12 })}
                >
                  Show {Math.min(PAGE_SIZE, results.length - visible.length)} more
                  <span style={{ color: C.t4, marginLeft: 4, fontFamily: C.FM }}>
                    ({visible.length}/{results.length})
                  </span>
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── One question, collapsed to its stem and expandable to the full rationale ──
function BankRow({ question: q, open, onToggle, isMobile }) {
  const meta = skillMeta(q.skill);
  const diff = DIFFICULTIES[q.difficulty] || DIFFICULTIES.M;

  return (
    <div style={{ ...glass({ padding: 0, overflow: 'hidden' }), border: `1px solid ${open ? tint(meta.color, 0.3) : C.b1}` }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', textAlign: 'left', padding: isMobile ? 14 : 16, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: C.FB }}
      >
        <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginBottom: 8 }}>
          <span style={pill(tint(meta.color, 0.14), meta.color, { fontSize: 10 })}>{meta.label}</span>
          <span style={pill(tint(diff.color, 0.14), diff.color, { fontSize: 10 })}>{diff.label}</span>
          {q.format === 'spr' && (
            <span style={pill(tint(C.violet, 0.14), C.violetL, { fontSize: 10 })}>Grid-in</span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 10, color: C.t4, fontFamily: C.FM }}>{q.id}</span>
          <ChevronDown size={14} color={C.t3} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </div>
        <div style={{
          fontSize: 12.5, color: C.t1, lineHeight: 1.55,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: open ? 99 : 2, WebkitBoxOrient: 'vertical',
        }}>
          <MathText text={q.q} />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: isMobile ? '0 14px 14px' : '0 16px 16px' }}>
              {q.stimulus && (
                <div style={{ ...glass2({ padding: 12 }), fontSize: 12, color: C.t2, lineHeight: 1.55, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
                  <MathText text={q.stimulus} />
                </div>
              )}
              {q.notes && (
                <ul style={{ ...glass2({ padding: '12px 12px 12px 28px' }), margin: '0px 0px 12px', color: C.t2, fontSize: 12, lineHeight: 1.55 }}>
                  {q.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              )}

              {q.format === 'mcq' ? (
                <div style={CC({ gap: 8, marginBottom: 12 })}>
                  {q.ch.map((choice, i) => {
                    const correct = i === q.ans;
                    return (
                      <div
                        key={i}
                        style={{
                          ...glass2({ padding: '8px 12px' }),
                          borderColor: correct ? tint(C.green, 0.4) : C.b1,
                          background: correct ? tint(C.green, 0.07) : undefined,
                        }}
                      >
                        <div style={R({ gap: 8, alignItems: 'flex-start' })}>
                          <span style={{
                            width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 4,
                            background: correct ? tint(C.green, 0.2) : 'rgba(255,255,255,0.05)',
                            color: correct ? C.greenL : C.t3,
                            fontSize: 10, fontWeight: 800, fontFamily: C.FM,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>{'ABCD'[i]}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, color: C.t1, lineHeight: 1.55 }}>
                              <MathText text={choice} />
                            </div>
                            {q.distractorExp?.[i] && (
                              <div style={{ fontSize: 11.5, color: correct ? C.greenL : C.t3, marginTop: 4, lineHeight: 1.55 }}>
                                {q.distractorExp[i]}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ ...glass2({ padding: 12 }), marginBottom: 12, borderColor: tint(C.green, 0.35) }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.green, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 4 }}>
                    Accepted answers
                  </div>
                  <div style={{ fontSize: 13, color: C.t1, fontFamily: C.FM }}>
                    {(q.sprAccept?.values || []).join('   or   ')}
                  </div>
                </div>
              )}

              <div style={{ ...glass2({ padding: 12 }), marginBottom: q.trap ? 10 : 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 4 }}>
                  Why
                </div>
                <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }}>
                  <MathText text={q.exp} />
                </div>
              </div>

              {q.trap && (
                <div style={{ fontSize: 11, color: C.amberL, lineHeight: 1.55 }}>
                  Trap: {TRAP_TAGS[q.trap] || q.trap.replace(/_/g, ' ')}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Official and free resources ─────────────────────────────────────────────
function OfficialResources({ isMobile }) {
  const rows = useMemo(orderedResources, []);
  return (
    <div style={CC({ gap: 16 })}>
      <div style={{
        ...glass({ padding: isMobile ? 16 : 20 }),
        border: `1px solid ${tint(C.amber, 0.24)}`,
        background: satWash(C.amber, 0.07),
      }}>
        <div style={{ ...R({ gap: 8 }), marginBottom: 8 }}>
          <Star size={14} color={C.amberL} />
          <span style={{ fontSize: 13, fontWeight: 800, color: C.t1 }}>Read this before you use any of it</span>
        </div>
        <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }}>
          Our bank is original, blueprint-matched and built for volume, diagnosis and drilling.
          It is not written by College Board, and no practice bank anywhere is. The four adaptive
          tests in Bluebook are the only ones written by the people who write the real exam — take
          at least two of them, and treat their score as the real number. Everything on this app,
          including its score estimates, is preparation for those.
        </div>
      </div>

      <div style={CC({ gap: 12 })}>
        {rows.map(r => (
          <div key={r.id} style={glass({ padding: isMobile ? 14 : 17 })}>
            <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginBottom: 8 }}>
              <span style={pill(tint(C.sky, 0.14), C.skyL, { fontSize: 10 })}>
                {RESOURCE_KINDS[r.kind]?.label || r.kind}
              </span>
              <span style={{ fontSize: 10.5, color: C.t4, fontFamily: C.FM }}>{r.org}</span>
            </div>

            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...R({ gap: 8 }), fontSize: 14, fontWeight: 700, color: C.t1, textDecoration: 'none' }}
            >
              {r.title}
              <ExternalLink size={12} color={C.t3} />
            </a>

            <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55, marginTop: 8 }}>{r.blurb}</div>

            <div style={{ ...glass2({ padding: '8px 12px' }), marginTop: 12, borderColor: tint(C.sky, 0.2) }}>
              <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>
                <b style={{ color: C.skyL }}>Use it for: </b>{r.why}
              </span>
            </div>

            {!!r.children?.length && (
              <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginTop: 12 }}>
                {r.children.map(c => (
                  <span key={c.label} style={R({ gap: 4 })}>
                    <a href={c.url} target="_blank" rel="noopener noreferrer" style={btnSm('rgba(255,255,255,0.03)', { border: `1px solid ${C.b1}`, color: C.t2, fontSize: 11.5, textDecoration: 'none' })}>
                      {c.label}
                    </a>
                    {c.answers && (
                      <a href={c.answers} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10.5, color: C.t4, textDecoration: 'none' }} title={`${c.label} answer key`}>
                        key
                      </a>
                    )}
                    {c.scoring && (
                      <a href={c.scoring} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10.5, color: C.t4, textDecoration: 'none' }} title={`${c.label} raw-to-scaled conversion`}>
                        scoring
                      </a>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
