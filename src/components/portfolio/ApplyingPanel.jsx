import React, { useMemo } from 'react';
import {
  GraduationCap, ScrollText, Handshake, UserCheck, Mic, Calculator, Plus, ArrowRight,
} from 'lucide-react';
import { C, R, CC, G } from '../../lib/theme';
import PanelHero, { StatTile } from '../ui/PanelHero';
import SectionScroller from './SectionScroller';

// ─────────────────────────────────────────────────────────────────────────────
// Applying — the second merged Portfolio page.
//
// College List, Essays, Financial Aid, Recommenders, Interview Prep and the
// Admissions Calculator were six separate tabs. They are six parts of one
// question — where am I applying, and what does each of those places still
// need from me — and splitting them across six pills did two bad things: it
// pushed the Portfolio strip to eleven tabs (a horizontal carousel on a phone,
// which is not navigation), and it meant no screen in the app could answer
// "how far along is this application" without the student assembling the
// answer from six places themselves.
//
// Same shell as Activities & Résumé (SectionScroller): a summary that says
// what is done and what is missing, every section's actions hoisted onto it,
// a sticky jumper, one scroll. Each section still renders the exact panel it
// always was — nothing was rewritten to fit, and every old URL still lands on
// the right one.
// ─────────────────────────────────────────────────────────────────────────────

export const APPLYING_SECTIONS = [
  { id: 'colleges', ic: GraduationCap, label: 'College List', color: C.sky, blurb: 'Where you are applying, and what each school wants' },
  { id: 'essays', ic: ScrollText, label: 'Essays', color: C.violet, blurb: 'Drafts, prompts and word counts, per school' },
  { id: 'aid', ic: Handshake, label: 'Financial Aid', color: C.green, blurb: 'What it will actually cost, and who pays for it' },
  { id: 'recommenders', ic: UserCheck, label: 'Recommenders', color: C.fuchsia, blurb: 'Who is writing for you, and when you asked' },
  { id: 'interview', ic: Mic, label: 'Interviews', color: C.orange, blurb: 'MMI stations, CASPer, and a scored practice run' },
  { id: 'calc', ic: Calculator, label: 'Chances', color: C.gold, blurb: 'Your real odds at the programs on your list' },
];
export const DEFAULT_APPLYING_SECTION = 'colleges';

const status = (n, doneAt) => (!n ? { tone: 'empty', label: 'Nothing yet' }
  : n < doneAt ? { tone: 'partial', label: 'In progress' }
  : { tone: 'done', label: 'Looking good' });

/**
 * @param {object} renders  id → () => ReactNode, one per section (owned by App.jsx,
 *                          because every panel needs App's own callbacks and counters)
 * @param {object} counts   { colleges, essays, recommenders, interviews }
 */
export default function ApplyingPanel({
  accent = C.sky, isMobile = false, renders = {}, counts = {},
  sectionLocks = [], focusId = null, focusNonce = 0, onSectionOpen = null,
}) {
  const lockFor = (id) => sectionLocks.find(l => l.id.split(':').pop() === id) || null;
  const colleges = counts.colleges || 0;
  const essays = counts.essays || 0;
  const recommenders = counts.recommenders || 0;
  const interviews = counts.interviews || 0;

  const nextSteps = useMemo(() => {
    const out = [];
    if (!colleges) out.push({ tone: 'warn', text: 'No colleges on your list yet. Everything else on this page hangs off that list — essays come from their prompts, aid is a comparison between them, and your chances are calculated against them.', actionLabel: 'Add a school', onAction: () => onSectionOpen?.('colleges') });
    else if (colleges < 4) out.push({ tone: 'info', text: `${colleges} school${colleges === 1 ? '' : 's'} on your list. A finished list is usually six to ten, spread across reach, target and likely.`, actionLabel: 'Add more', onAction: () => onSectionOpen?.('colleges') });
    if (colleges && !essays) out.push({ tone: 'warn', text: 'No essays started. Every school on your list has prompts, and the personal statement is reused across all of them — starting it early is the single highest-leverage thing on this page.', actionLabel: 'Start one', onAction: () => onSectionOpen?.('essays') });
    if (colleges && !recommenders) out.push({ tone: 'info', text: 'No recommenders logged. Teachers write these in the order they were asked, and the good ones fill up in the spring.', actionLabel: 'Add one', onAction: () => onSectionOpen?.('recommenders') });
    if (colleges && !interviews) out.push({ tone: 'info', text: 'You have not run a practice interview. One scored MMI station tells you more than reading about them for an hour.', actionLabel: 'Practise', onAction: () => onSectionOpen?.('interview') });
    if (colleges >= 2) out.push({ tone: 'good', text: 'Your chances are calculated against the real admitted profiles of the schools on your list — not a generic score.', actionLabel: 'See the odds', onAction: () => onSectionOpen?.('calc') });
    return out;
  }, [colleges, essays, recommenders, interviews, onSectionOpen]);

  const sections = APPLYING_SECTIONS.map(s => {
    const render = renders[s.id];
    const count = { colleges, essays, recommenders, interview: interviews }[s.id] || null;
    const st = {
      colleges: status(colleges, 4), essays: status(essays, 2),
      aid: null, recommenders: status(recommenders, 2), interview: status(interviews, 1),
      calc: null,
    }[s.id];
    return {
      ...s,
      count: count || null,
      status: st,
      locked: lockFor(s.id),
      actions: ACTIONS[s.id]?.(onSectionOpen) || [],
      render: render || (() => null),
    };
  }).filter(s => renders[s.id]);

  return (
    <div style={CC({ gap: 22 })}>
      <PanelHero tourTag="portfolio-deep-applying" icon={GraduationCap} color={accent} color2={C.violet} m={isMobile}
        eyebrow="Applications" title="Applying"
        sub="Your school list and everything each school still needs from you — essays, aid, recommenders, interviews, and your real odds. One page, in the order you work through it." />

      <SectionScroller
        accent={accent} isMobile={isMobile}
        focusId={focusId} focusNonce={focusNonce} onSectionOpen={onSectionOpen}
        printLabel="Print this page"
        summary={{
          eyebrow: 'Where you stand',
          title: colleges ? 'Your applications, end to end' : 'Start with one school',
          sub: 'Six things that used to be six tabs. They are one page because they are one question — and everything you can do inside a section can be done from here.',
          tiles: (
            <div style={G(4, 12, {}, isMobile)}>
              <StatTile icon={GraduationCap} value={colleges} label="Schools on your list" sub={colleges ? undefined : 'nothing else works without this'} color={C.sky} />
              <StatTile icon={ScrollText} value={essays} label="Essays started" sub={essays ? undefined : 'the personal statement is reused everywhere'} color={C.violet} />
              <StatTile icon={UserCheck} value={recommenders} label="Recommenders" sub={recommenders ? undefined : 'ask early — teachers fill up'} color={C.fuchsia} />
              <StatTile icon={Mic} value={interviews} label="Practice interviews" sub={interviews ? undefined : 'one station beats an hour of reading'} color={C.orange} />
            </div>
          ),
          nextSteps,
        }}
        sections={sections}
      />
    </div>
  );
}

// Each section's primary action, hoisted onto the summary. They open the
// section rather than opening a form directly: the forms live inside panels
// this file deliberately does not reach into.
const ACTIONS = {
  colleges: (go) => [{ label: 'Add a school', icon: Plus, primary: true, onClick: () => go?.('colleges') }],
  essays: (go) => [{ label: 'Start an essay', icon: Plus, primary: true, onClick: () => go?.('essays') }],
  aid: (go) => [{ label: 'Open aid', icon: ArrowRight, onClick: () => go?.('aid') }],
  recommenders: (go) => [{ label: 'Add a recommender', icon: Plus, primary: true, onClick: () => go?.('recommenders') }],
  interview: (go) => [{ label: 'Run a station', icon: Mic, primary: true, onClick: () => go?.('interview') }],
  calc: (go) => [{ label: 'See my odds', icon: Calculator, onClick: () => go?.('calc') }],
};
