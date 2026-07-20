/**
 * Deterministic per-user avatar color, so the same person always gets the
 * same color across renders/pages, while different people get visual
 * variety instead of one flat brand color for every avatar. Soft pastel
 * background + matching solid text — light, not a bold gradient block.
 *
 * Each entry is a full literal class string (not built from interpolated
 * pieces) so Tailwind's static scanner picks them up in the production build.
 */
const AVATAR_PALETTE = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
] as const;

const hashSeed = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getAvatarColorClass = (seed: string): string => {
  if (!seed) return AVATAR_PALETTE[0];
  return AVATAR_PALETTE[hashSeed(seed) % AVATAR_PALETTE.length];
};
