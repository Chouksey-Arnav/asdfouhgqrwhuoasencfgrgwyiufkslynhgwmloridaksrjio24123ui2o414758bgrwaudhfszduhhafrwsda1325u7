// ─────────────────────────────────────────────────────────────────────────────
// Cosmetic-only chest unlocks — purely decorative profile badges, never
// gameplay-affecting. Adds "surprise contents" texture to reward chests
// without needing a real content pipeline.
// ─────────────────────────────────────────────────────────────────────────────
import { Sparkles, Star, Flame, Gem, Crown, Trophy, Rocket, Sun } from 'lucide-react';

export const COSMETICS = [
  { key: 'badge_spark',  name: 'Spark Badge',  Icon: Sparkles, color: '#60a5fa' },
  { key: 'badge_star',   name: 'Star Badge',   Icon: Star,     color: '#fbbf24' },
  { key: 'badge_flame',  name: 'Flame Badge',  Icon: Flame,    color: '#fb923c' },
  { key: 'badge_gem',    name: 'Gem Badge',    Icon: Gem,      color: '#c084fc' },
  { key: 'badge_crown',  name: 'Crown Badge',  Icon: Crown,    color: '#f87171' },
  { key: 'badge_trophy', name: 'Trophy Badge', Icon: Trophy,   color: '#facc15' },
  { key: 'badge_rocket', name: 'Rocket Badge', Icon: Rocket,   color: '#34d399' },
  { key: 'badge_sun',    name: 'Sun Badge',    Icon: Sun,      color: '#fde047' },
];

/** Picks a random not-yet-unlocked cosmetic, or null if the pool is exhausted. */
export function rollCosmetic(alreadyUnlocked = new Set()) {
  const pool = COSMETICS.filter(c => !alreadyUnlocked.has(c.key));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
