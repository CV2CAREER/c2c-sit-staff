export type TierMeta = {
  accentColor: string;
  dot: string;
  tagline: string;
  featured?: boolean;
  bullets: string[];
};

export const TIER_META: Record<string, TierMeta> = {
  Bronze: {
    accentColor: "#d97706",
    dot: "#d97706",
    tagline: "Steady, focused job searching",
    bullets: [
      "Daily applications to matching roles",
      "Full complimentary toolkit",
      "Live coaching & prep, where it helps",
    ],
  },
  Silver: {
    accentColor: "#94a3b8",
    dot: "#94a3b8",
    tagline: "A longer, year-round search",
    bullets: [
      "Daily applications to matching roles",
      "Full complimentary toolkit",
      "Live coaching & prep · twice Bronze's runway",
    ],
  },
  Gold: {
    accentColor: "#0ea5e9",
    dot: "#f59e0b",
    tagline: "Two directions, intensive push",
    featured: true,
    bullets: [
      "Daily applications across both fields",
      "Full complimentary toolkit",
      "Live coaching & prep, where it helps",
    ],
  },
  Platinum: {
    accentColor: "#8b5cf6",
    dot: "#8b5cf6",
    tagline: "Two directions, full year",
    bullets: [
      "Daily applications across both fields",
      "Full complimentary toolkit",
      "Live coaching & prep · maximum reach",
    ],
  },
  Coral: {
    accentColor: "#f43f5e",
    dot: "#f43f5e",
    tagline: "Ambassadors who refer others",
    bullets: [
      "Full complimentary toolkit",
      "1 career track",
      "14 days complimentary access",
    ],
  },
  Emerald: {
    accentColor: "#10b981",
    dot: "#10b981",
    tagline: "Partner-referred trial",
    bullets: [
      "Full complimentary toolkit",
      "1 career track",
      "10-day complimentary trial",
    ],
  },
};

export const PLAN_ORDER = ["Bronze", "Silver", "Gold", "Platinum"];
export const TABLE_ORDER = ["Coral", "Emerald", "Bronze", "Silver", "Gold", "Platinum"];
