import React, { useCallback } from 'react';
import { C } from '../../lib/theme';
import SubNav from '../ui/SubNav';
import { useSatData } from '../../lib/sat/useSatData';
import SatOverviewPanel from './SatOverviewPanel';
import SatDiagnosticPanel from './SatDiagnosticPanel';
import SatPracticePanel from './SatPracticePanel';
import SatFullTestPanel from './SatFullTestPanel';
import SatReviewLogPanel from './SatReviewLogPanel';
import SatSkillsPanel from './SatSkillsPanel';
import ScoreTrackerPanel from '../ScoreTrackerPanel';

// The SAT pillar shell.
//
// Data loads ONCE here and is passed to every sub-panel, so the projection on
// Overview and the heat map on Skills can never disagree with each other — a
// mistake that is easy to make when each panel fetches independently.
//
// Mirrors tPortWrap() in App.jsx: SubNav across the top, panel below.

export default function SatTab({
  view, onViewChange, params, onConsumeParams, subnavItems,
  accent = C.lime, user, isMobile = false, planStrip = null,
}) {
  // Keyed on the active view so moving between panels re-reads Dexie and every
  // panel agrees on the same snapshot.
  const satData = useSatData({ refreshKey: view });

  // Panels navigate between each other (and pass deep-link params) through this.
  const navigate = useCallback((nextView, nextParams = null) => {
    onViewChange(nextView, nextParams);
  }, [onViewChange]);

  const shared = { satData, isMobile, onNavigate: navigate, user };

  const panels = {
    overview: () => <SatOverviewPanel accent={C.lime} {...shared} />,
    diagnostic: () => <SatDiagnosticPanel accent={C.cyan} {...shared} />,
    practice: () => <SatPracticePanel accent={C.blue} params={params} onConsumeParams={onConsumeParams} {...shared} />,
    tests: () => <SatFullTestPanel accent={C.violet} {...shared} />,
    review: () => <SatReviewLogPanel accent={C.rose} {...shared} />,
    skills: () => <SatSkillsPanel accent={C.amber} {...shared} />,
    // Reuses the existing Portfolio score tracker rather than duplicating a
    // second SAT/ACT score log against the same test_scores table.
    scores: () => <ScoreTrackerPanel accent={C.green} />,
  };

  return (
    <div>
      <SubNav
        items={subnavItems} active={view} onChange={(v) => onViewChange(v, null)}
        accent={accent} m={isMobile} tourPrefix="sat-sub"
      />
      {planStrip}
      {(panels[view] || panels.overview)()}
    </div>
  );
}
