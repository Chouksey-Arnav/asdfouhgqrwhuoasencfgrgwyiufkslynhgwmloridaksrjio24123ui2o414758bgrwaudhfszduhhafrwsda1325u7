// ─────────────────────────────────────────────────────────────────────────────
// The daily quest engine — pure logic. No React, no Dexie, no network.
//
// Three jobs a day, drawn from src/data/dailyQuestCatalog.js, one of each tier.
// This module decides WHICH three, how far along each is, and what the claim
// key for each is. Everything else — granting XP, opening the chest, drawing the
// rail — lives at the call sites.
//
// ── The draw is deterministic, and that is the whole design ─────────────────
// `dailySet()` is a pure function of (student key, calendar date, what the
// student can actually do). It stores nothing. That has three consequences that
// each fix a real bug the alternative would have:
//
//   1. RELOADING CANNOT REROLL. A random draw persisted on first view means a
//      student who does not like today's set clears their site data and gets a
//      new one — or, much more commonly, a student on a flaky connection sees
//      the set change under them mid-session and stops trusting it.
//   2. TWO DEVICES SHOW THE SAME THREE. A phone and a laptop derive the same set
//      from the same date and the same account, with nothing to sync. The
//      alternative is a sync schema for something that is thrown away at
//      midnight.
//   3. THERE IS NO DAILY-QUEST TABLE. Progress is derived from the evidence the
//      app already keeps, exactly like long quests; claims go in the permanent
//      reward ledger the streak milestones already use. Nothing new is stored,
//      so nothing new can drift.
//
// ── What "today" means ──────────────────────────────────────────────────────
// The LOCAL calendar day, same as the streak and same as the long quests. A
// student studying at 11pm is having one evening, and a daily quest that rolled
// over at a different moment than their streak did would be the single most
// confusing thing in the product.
// ─────────────────────────────────────────────────────────────────────────────
import { localDateStr } from './dateUtils.js';
import {
  DAILY_QUESTS, DAILY_BY_ID, DAILY_TIERS, DAILY_TIER_ORDER, DAILY_SET_BONUS,
  getDailyQuest, dailyXP, dailyByTier,
} from '../data/dailyQuestCatalog.js';
import { QUEST_METRICS, QUEST_DESTINATIONS } from './quests.js';

export {
  DAILY_QUESTS, DAILY_BY_ID, DAILY_TIERS, DAILY_TIER_ORDER, DAILY_SET_BONUS,
  getDailyQuest, dailyXP, dailyByTier,
};

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// ── Claim keys ───────────────────────────────────────────────────────────────
// These go into the same permanent, once-ever ledger as streak milestones
// (DB.claimStreakReward, `streakRewards`), which is what makes claiming a daily
// quest idempotent across devices for free. The date is in the key, so
// yesterday's `d_quiz_one` and today's are different claims and the same quest
// can be drawn again next week without being un-claimable.
export const dailyKey = (date, questId) => `daily:${date}:${questId}`;
/** The all-three bonus. `__set` cannot collide with a quest id (none start `__`). */
export const dailySetKey = (date) => `daily:${date}:__set`;

/** True for any key this module owns — used to sweep old rows out of reports. */
export const isDailyKey = (key) => String(key || '').startsWith('daily:');

// ── The draw ─────────────────────────────────────────────────────────────────

/** FNV-1a. Small, stable across engines, and good enough to seed a shuffle. */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — a tiny deterministic PRNG. Same seed, same sequence, forever. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Which of the pool's requirements this student satisfies.
 *
 * Everything defaults to TRUE when the caller does not know, which is the
 * deliberate choice: a student whose portfolio has not loaded yet should see a
 * portfolio quest they can act on, not have it silently withheld.
 */
export function capabilities({
  hasPathway = true,
  hasPlan = true, deckCount = 1, portfolioTouched = true,
} = {}) {
  return {
    pathway: !!hasPathway,
    plan: !!hasPlan,
    decks: num(deckCount) > 0,
    portfolio: !!portfolioTouched,
  };
}

/** Is this template offerable to a student with these capabilities? */
function offerable(quest, caps) {
  if (!quest.requires) return true;
  return !!caps[quest.requires];
}

/**
 * Today's three, deterministically.
 *
 * @param {object} opts
 * @param {string} opts.userKey  anything stable per student (id, email). '' is fine
 *                               for a signed-out preview — the set is then stable per date.
 * @param {string} opts.date     YYYY-MM-DD local. Defaults to today.
 * @param {object} opts.caps     capabilities() output.
 * @returns {Array<DailyQuest>}  one bronze, one silver, one gold, in that order.
 *
 * The seed folds in the tier as well as the date, so the three picks are
 * independent draws rather than three consecutive values off one stream — which
 * matters because a single stream makes yesterday's silver systematically
 * predict today's gold, and students notice patterns like that faster than
 * anybody expects.
 */
export function dailySet({ userKey = '', date = localDateStr(), caps = capabilities() } = {}) {
  const out = [];
  for (const tier of DAILY_TIER_ORDER) {
    const pool = dailyByTier(tier).filter((q) => offerable(q, caps));
    // A student who satisfies nothing in a tier still gets something: falling
    // back to the ungated members of the tier is better than a two-item set,
    // because the set bonus is the mechanism and a set of two is not a set.
    const usable = pool.length ? pool : dailyByTier(tier).filter((q) => !q.requires);
    if (!usable.length) continue;
    const pick = rng(hashString(`${userKey}|${date}|${tier}`))();
    out.push(usable[Math.floor(pick * usable.length) % usable.length]);
  }
  return out;
}

/**
 * Tomorrow's set, for the "here is what is coming" teaser.
 *
 * A one-line preview of tomorrow morning is the cheapest retention mechanic in
 * this entire file: it converts "I finished today" into "I know what tomorrow
 * is", which is a materially different feeling to close an app on.
 */
export function tomorrowSet({ userKey = '', date = localDateStr(), caps = capabilities() } = {}) {
  const [y, m, d] = String(date).split('-').map(Number);
  const next = new Date(y, (m || 1) - 1, (d || 1) + 1, 12, 0, 0, 0);
  return dailySet({ userKey, date: localDateStr(next), caps });
}

// ── Progress ─────────────────────────────────────────────────────────────────

/**
 * Count today's events per metric.
 *
 * `events` is the same flat list buildQuestEvents() produces for long quests —
 * one pipeline, one set of numbers. Anything outside the local day is dropped
 * here rather than by the caller, so a caller passing a wider window (which is
 * the normal case: the evidence read is bounded by the oldest long quest) still
 * gets the right answer.
 */
export function todayTotals(events = [], date = localDateStr()) {
  const totals = {};
  for (const e of events || []) {
    if (!e?.type || !e.at) continue;
    if (localDateStr(new Date(e.at)) !== date) continue;
    totals[e.type] = (totals[e.type] || 0) + Math.max(1, num(e.value) || 1);
  }
  return totals;
}

/**
 * Everything a surface needs about one daily quest.
 *
 * Deliberately the same shape-of-answer as the long-quest engine's evaluate():
 * progress, target, pct, done, plus the destination to act on it. Two engines
 * that describe their results differently is two sets of UI code.
 */
export function evaluateDaily(quest, totals = {}, claimedKeys = new Set(), date = localDateStr()) {
  const def = typeof quest === 'string' ? getDailyQuest(quest) : quest;
  if (!def) return null;
  const target = Math.max(1, num(def.target));
  const raw = num(totals[def.metric]);
  const progress = Math.min(raw, target);
  const done = raw >= target;
  const key = dailyKey(date, def.id);
  const metric = QUEST_METRICS[def.metric] || {};
  return {
    quest: def,
    key,
    metric,
    tier: DAILY_TIERS[def.tier] || DAILY_TIERS.bronze,
    xp: dailyXP(def),
    target,
    progress,
    remaining: Math.max(0, target - progress),
    pct: Math.min(100, Math.round((progress / target) * 100)),
    done,
    claimed: claimedKeys.has(key),
    claimable: done && !claimedKeys.has(key),
    destination: QUEST_DESTINATIONS[def.metric] || QUEST_DESTINATIONS.lesson_verified,
  };
}

/**
 * The whole day: three evaluated quests plus the set bonus.
 *
 * `setBonus.claimable` is the one that matters — it is the reason the third
 * quest gets done on an evening the student would otherwise have stopped after
 * two, and it is worth more than the gold quest precisely so that it is.
 */
export function evaluateDay({
  userKey = '', date = localDateStr(), caps = capabilities(),
  events = [], totals = null, claimedKeys = new Set(),
} = {}) {
  const t = totals || todayTotals(events, date);
  const rows = dailySet({ userKey, date, caps })
    .map((q) => evaluateDaily(q, t, claimedKeys, date))
    .filter(Boolean);

  const done = rows.filter((r) => r.done).length;
  const claimed = rows.filter((r) => r.claimed).length;
  const claimable = rows.filter((r) => r.claimable).length;
  const setKey = dailySetKey(date);
  const allDone = rows.length > 0 && done === rows.length;
  // The bonus needs every quest not just finished but CLAIMED, so the set is
  // always the last tap of the day rather than something that fires silently
  // behind an unclaimed card. Three claims then a chest is a better ending than
  // a chest and then three claims.
  const allClaimed = rows.length > 0 && claimed === rows.length;

  return {
    date,
    rows,
    done,
    claimed,
    claimable,
    total: rows.length,
    pct: rows.length ? Math.round((rows.reduce((s, r) => s + r.pct, 0) / rows.length)) : 0,
    xpAvailable: rows.filter((r) => r.claimable).reduce((s, r) => s + r.xp, 0),
    xpTotal: rows.reduce((s, r) => s + r.xp, 0) + DAILY_SET_BONUS.xp,
    setBonus: {
      ...DAILY_SET_BONUS,
      key: setKey,
      allDone,
      claimed: claimedKeys.has(setKey),
      claimable: allClaimed && !claimedKeys.has(setKey),
    },
    // What the rail says about itself in one line, wherever it is drawn small.
    headline: dayHeadline({ rows, done, claimable, total: rows.length, allClaimed, setClaimed: claimedKeys.has(setKey) }),
  };
}

/**
 * The single line the compact surfaces show.
 *
 * Always forward-facing and always naming the next concrete action — same rule
 * the long quests' questHeadline() follows, for the same reason: "2 of 3 done"
 * is a statistic, "one more: review 25 cards" is an instruction.
 */
function dayHeadline({ rows = [], done = 0, claimable = 0, total = 0, allClaimed = false, setClaimed = false }) {
  if (claimable > 0) {
    return claimable === 1
      ? 'One finished — take the XP.'
      : `${claimable} finished — take the XP.`;
  }
  if (allClaimed && !setClaimed) return `All three done. Claim the ${DAILY_SET_BONUS.label} bonus.`;
  if (allClaimed) return 'All three cleared today. Fresh set at midnight.';
  const next = rows.find((r) => !r.done);
  if (!next) return 'All three done.';
  if (done === 0) return `Start with: ${next.quest.title.toLowerCase()}.`;
  if (total - done === 1) return `One left: ${next.quest.title.toLowerCase()}.`;
  return `Next up: ${next.quest.title.toLowerCase()}.`;
}

/**
 * The one daily quest a compact surface should show, biased to the tab the
 * student is already on.
 *
 * Claimable always wins, because claiming is one tap from anywhere. After that
 * it is the cheapest unfinished thing they can do HERE — a card quest on the
 * Flashcards tab is actionable now; the same quest shown on the Portfolio tab
 * is an interruption. Mirrors featuredFor() in lib/quests.js exactly.
 */
export function featuredDaily(day, surface = null) {
  if (!day?.rows?.length) return null;
  const claimable = day.rows.find((r) => r.claimable);
  if (claimable) return claimable;
  const open = day.rows.filter((r) => !r.done);
  if (!open.length) return null;
  if (surface) {
    const local = open.find((r) => r.quest.surface === surface);
    if (local) return local;
  }
  // Cheapest first: a student who is nearly out of evening should be pointed at
  // the bronze, not at the gold.
  return open.sort((a, b) => a.xp - b.xp)[0];
}

/**
 * How today's set relates to the streak.
 *
 * They are separate systems on purpose — a daily quest is XP, a streak day is
 * work — but they overlap constantly, and saying so is worth a line of UI: the
 * silver quest is very often exactly the thing that would clear the streak day
 * too. Returns null when there is nothing honest to say.
 */
export function streakOverlap(day, dayStatusRow) {
  if (!day?.rows?.length || !dayStatusRow || dayStatusRow.met) return null;
  const helper = day.rows.find((r) => !r.done && STREAK_CLEARING_METRICS.has(r.quest.metric));
  if (!helper) return null;
  return { quest: helper, text: `${helper.quest.title} clears your streak day too.` };
}

/** Metrics whose daily quest, if finished, also clears a default streak day. */
const STREAK_CLEARING_METRICS = new Set([
  'lesson_verified', 'lesson_perfect', 'unit_verified',
]);
