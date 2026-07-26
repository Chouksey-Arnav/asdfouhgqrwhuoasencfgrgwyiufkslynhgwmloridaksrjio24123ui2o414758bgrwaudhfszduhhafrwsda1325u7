// Shared SAT data hook.
//
// Every SAT panel needs the same four things (attempts, responses, mastery,
// review log) and they must agree with each other — a heat map computed from a
// different snapshot than the projection above it is how a product starts
// contradicting itself. So they load together, here.
//
// Follows the load/useCallback/useEffect pattern the Portfolio panels use
// (see ScoreTrackerPanel.jsx), just over Dexie rather than the Supabase
// resource API, since study data in this app is local-first.
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as DB from '../db';
import { computeAllMastery, rankSkillsByLeverage, toStatRow } from './mastery';
import { projectScore } from './projection';
import { reviewSummary } from './errorPatterns';

export function useSatData({ refreshKey } = {}) {
  const [attempts, setAttempts] = useState([]);
  const [responses, setResponses] = useState([]);
  const [reviewLog, setReviewLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    // Only show the loading state on the very first read. Subsequent refreshes
    // (switching sub-view, finishing a set) should not blank the panel out.
    if (firstLoad.current) setLoading(true);
    try {
      const [a, r, rl] = await Promise.all([
        DB.getSatAttempts(),
        DB.getSatResponses(),
        DB.getSatReviewLog({ includeResolved: true }),
      ]);
      setAttempts(a);
      setResponses(r);
      setReviewLog(rl);
    } finally {
      setLoading(false);
      firstLoad.current = false;
    }
  }, []);

  // Reload on mount AND whenever `refreshKey` changes. SatTab passes the active
  // sub-view as the key, so switching from Practice to Skill Mastery picks up
  // the responses just recorded — without this, every panel renders whatever
  // was in Dexie when the tab first mounted, and the heat map contradicts the
  // set the student literally just finished.
  useEffect(() => { load(); }, [load, refreshKey]);

  const masteryMap = useMemo(() => computeAllMastery(responses), [responses]);
  const projection = useMemo(
    () => projectScore({ masteryMap, attempts, responses }),
    [masteryMap, attempts, responses],
  );
  const ranked = useMemo(() => rankSkillsByLeverage(masteryMap), [masteryMap]);
  const openReviews = useMemo(() => reviewLog.filter(r => !r.resolved), [reviewLog]);
  const summary = useMemo(() => reviewSummary(reviewLog), [reviewLog]);
  const seenIds = useMemo(() => new Set(responses.map(r => r.questionId)), [responses]);

  // Persist the derived per-skill stats so other surfaces (Progress radar, the
  // coach prompt) can read mastery without replaying the whole response history.
  useEffect(() => {
    if (loading || !responses.length) return;
    const rows = Object.values(masteryMap).filter(m => m.attempts > 0).map(toStatRow);
    if (rows.length) DB.saveSatSkillStats(rows).catch(() => {});
  }, [masteryMap, responses.length, loading]);

  return {
    loading, attempts, responses, reviewLog, openReviews,
    masteryMap, projection, ranked, summary, seenIds,
    reload: load,
  };
}
