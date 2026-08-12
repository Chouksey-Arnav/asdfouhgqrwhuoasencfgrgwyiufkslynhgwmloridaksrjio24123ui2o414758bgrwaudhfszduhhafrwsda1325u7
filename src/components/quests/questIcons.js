// The catalog stores lucide component NAMES (strings), not components — same shape achievements
// use (ACH_ICONS in App.jsx) and for the same reason: src/data/questCatalog.js is loaded by
// scripts/verifyQuests.mjs under plain Node, where importing lucide-react would pull a React
// dependency into a build-time check that has no business rendering anything.
//
// Everything a quest can name resolves here. An unknown name falls back rather than crashing a
// study surface, because the catalog is edited far more often than this file.
import {
  Route, Mountain, Crown, Target, Layers, ClipboardList, AlertTriangle, Layers3, Brain,
  TrendingUp, Star, Award, Stethoscope, Mic, Trophy, ScrollText, Flame, CalendarCheck,
  CalendarClock, Sparkles, Swords,
} from 'lucide-react';

export const QUEST_ICONS = {
  Route, Mountain, Crown, Target, Layers, ClipboardList, AlertTriangle, Layers3, Brain,
  TrendingUp, Star, Award, Stethoscope, Mic, Trophy, ScrollText, Flame, CalendarCheck,
  CalendarClock, Sparkles, Swords,
};

/** Swords is the generic quest mark — used for the nav badge and any unmapped name. */
export const questIcon = (name) => QUEST_ICONS[name] || Swords;
export { Swords as QuestMark };
