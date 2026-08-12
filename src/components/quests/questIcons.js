// The catalog stores lucide component NAMES (strings), not components — same shape achievements
// use (ACH_ICONS in App.jsx) and for the same reason: src/data/questCatalog.js is loaded by
// scripts/verifyQuests.mjs under plain Node, where importing lucide-react would pull a React
// dependency into a build-time check that has no business rendering anything.
//
// Everything a quest can name resolves here — the long catalog, the daily pool
// (src/data/dailyQuestCatalog.js), the chains, and the categories. An unknown name falls back
// rather than crashing a study surface, because those catalogs are edited far more often than
// this file, and scripts/verifyQuests.mjs fails the build if any of them names something missing.
import {
  Route, Mountain, Crown, Target, Layers, ClipboardList, AlertTriangle, Layers3, Brain,
  TrendingUp, Star, Award, Stethoscope, Mic, Trophy, ScrollText, Flame, CalendarCheck,
  CalendarClock, Sparkles, Swords,
  // ── Added with the catalog expansion ──
  Boxes, BadgeCheck, BookOpen, CircleCheck, Crosshair, ListChecks, ListTodo, ListRestart,
  FolderPlus, ChevronsUp, Medal, Sun, Zap, ClipboardCheck, CalendarDays, Infinity as InfinityIcon,
  MessageCircleQuestion, MessageCircle, Bot, BrainCircuit, PenLine, PenTool, Highlighter,
  HeartPulse, Building2, Users, School, GraduationCap, Banknote, MailCheck, FileCheck2,
  Compass, Bookmark, CheckSquare, FilePlus2, RotateCcw, Gift, Snowflake, Wind, Sparkle,
} from 'lucide-react';

export const QUEST_ICONS = {
  Route, Mountain, Crown, Target, Layers, ClipboardList, AlertTriangle, Layers3, Brain,
  TrendingUp, Star, Award, Stethoscope, Mic, Trophy, ScrollText, Flame, CalendarCheck,
  CalendarClock, Sparkles, Swords,
  Boxes, BadgeCheck, BookOpen, CircleCheck, Crosshair, ListChecks, ListTodo, ListRestart,
  FolderPlus, ChevronsUp, Medal, Sun, Zap, ClipboardCheck, CalendarDays,
  Infinity: InfinityIcon,
  MessageCircleQuestion, MessageCircle, Bot, BrainCircuit, PenLine, PenTool, Highlighter,
  HeartPulse, Building2, Users, School, GraduationCap, Banknote, MailCheck, FileCheck2,
  Compass, Bookmark, CheckSquare, FilePlus2, RotateCcw, Gift, Snowflake, Wind, Sparkle,
};

/** Swords is the generic quest mark — used for the nav badge and any unmapped name. */
export const questIcon = (name) => QUEST_ICONS[name] || Swords;
export { Swords as QuestMark };
