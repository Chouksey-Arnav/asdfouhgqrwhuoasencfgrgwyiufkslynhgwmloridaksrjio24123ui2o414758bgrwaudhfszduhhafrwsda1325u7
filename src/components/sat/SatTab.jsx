import React, { useCallback, useState, useMemo } from 'react';
import { C } from '../../lib/theme';
import SubNav from '../ui/SubNav';
import { useSatData } from '../../lib/sat/useSatData';
import SatOverviewPanel from './SatOverviewPanel';
import SatDiagnosticPanel from './SatDiagnosticPanel';
import SatBaselinePanel from './SatBaselinePanel';
import SatPracticePanel from './SatPracticePanel';
import SatFullTestPanel from './SatFullTestPanel';
import SatReviewLogPanel from './SatReviewLogPanel';
import SatSkillsPanel from './SatSkillsPanel';
import SatToolkitPanel from './SatToolkitPanel';
import ScoreTrackerPanel from '../ScoreTrackerPanel';
import { SatToolsProvider } from './SatToolsContext';
import SatMedabrain from './SatMedabrain';
import { buildLearnerProfile } from '../../lib/sat/learnerProfile';

// The SAT pillar shell.
//
// Data loads ONCE here and is passed to every sub-panel, so the projection on
// Overview and the heat map on Skills can never disagree with each other — a
// mistake that is easy to make when each panel fetches independently.
//
// Mirrors tPortWrap() in App.jsx: SubNav across the top, panel below. Wrapped
// in SatToolsProvider so the Desmos calculator and the reference sheet are
// mounted once for the whole pillar and stay open across sub-views — the same
// way Bluebook keeps them available for a whole section rather than one screen.

export default function SatTab({
  view, onViewChange, params, onConsumeParams, subnavItems, subnavHrefFor,
  accent = C.lime, user, gradeLabel = null, isMobile = false, planStrip = null, onSessionComplete,
  medabrainOpen = false, onMedabrainOpenChange, medabrainMessages = [], onMedabrainMessagesChange,
}) {
  // Keyed on the active view so moving between panels re-reads Dexie and every
  // panel agrees on the same snapshot.
  const satData = useSatData({ refreshKey: view });

  // What Medabrain can see. Set when a student taps "ask about this question"
  // inside the player, cleared when they close the panel — the coach should not
  // still be answering about a question they left three screens ago.
  const [askContext, setAskContext] = useState(null);

  // Panels navigate between each other (and pass deep-link params) through this.
  const navigate = useCallback((nextView, nextParams = null) => {
    onViewChange(nextView, nextParams);
  }, [onViewChange]);

  const openMedabrain = useCallback((context = null) => {
    setAskContext(context);
    onMedabrainOpenChange?.(true);
  }, [onMedabrainOpenChange]);

  const handleMedabrainOpenChange = useCallback((next) => {
    if (!next) setAskContext(null);
    onMedabrainOpenChange?.(next);
  }, [onMedabrainOpenChange]);

  const daysToExam = useMemo(() => {
    if (!user?.examDate) return null;
    return Math.ceil((new Date(`${user.examDate}T00:00:00`) - new Date(new Date().toDateString())) / 86400000);
  }, [user?.examDate]);

  // Finishing a session ticks the matching plan task (sat_practice / sat_review
  // / sat_test) via AUTO_VERIFIABLE_TYPES, so "SAT practice set" on the Plans
  // tab completes itself instead of needing a manual checkbox.
  // The learner profile is built once here, from the same snapshot every panel
  // renders, and handed down. Three surfaces send it to a model (the coach, the
  // practice generator, the plan generator) and they must be describing the same
  // student — a coach saying "your Boundaries is fine" beside a generated set
  // built on the opposite assumption is exactly the incoherence this prevents.
  const profile = useMemo(
    () => buildLearnerProfile({ satData, user, daysToExam }),
    [satData, user, daysToExam],
  );

  const shared = {
    satData, profile, isMobile, onNavigate: navigate, user, daysToExam, onSessionComplete,
    onAskMedabrain: openMedabrain,
  };

  const panels = {
    overview: () => <SatOverviewPanel accent={C.lime} {...shared} />,
    baseline: () => <SatBaselinePanel accent={C.gold} {...shared} />,
    diagnostic: () => <SatDiagnosticPanel accent={C.cyan} {...shared} />,
    practice: () => <SatPracticePanel accent={C.blue} params={params} onConsumeParams={onConsumeParams} {...shared} />,
    tests: () => <SatFullTestPanel accent={C.violet} {...shared} />,
    review: () => <SatReviewLogPanel accent={C.rose} {...shared} />,
    skills: () => <SatSkillsPanel accent={C.amber} {...shared} />,
    toolkit: () => <SatToolkitPanel accent={C.teal} isMobile={isMobile} />,
    // Reuses the existing Portfolio score tracker rather than duplicating a
    // second SAT/ACT score log against the same test_scores table.
    scores: () => <ScoreTrackerPanel accent={C.green} />,
  };

  return (
    <SatToolsProvider accent={C.teal} isMobile={isMobile}>
      <div>
        <SubNav
          items={subnavItems} active={view} onChange={(v) => onViewChange(v, null)}
          accent={accent} m={isMobile} tourPrefix="sat-sub" hrefFor={subnavHrefFor}
        />
        {planStrip}
        {(panels[view] || panels.overview)()}
      </div>

      <SatMedabrain
        open={medabrainOpen}
        onOpenChange={handleMedabrainOpenChange}
        messages={medabrainMessages}
        onMessagesChange={onMedabrainMessagesChange}
        user={user}
        gradeLabel={gradeLabel}
        accent={accent}
        isMobile={isMobile}
        satData={satData}
        profile={profile}
        daysToExam={daysToExam}
        question={askContext?.question || null}
        answered={!!askContext?.answered}
        studentChoice={askContext?.studentChoice ?? null}
        wasCorrect={askContext?.wasCorrect ?? null}
      />
    </SatToolsProvider>
  );
}
