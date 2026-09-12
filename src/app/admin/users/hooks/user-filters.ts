// Shared faceted-filter model for the Users pages' sidebar (admin +
// assistant both import this — same convention as useGetAllUsers living in
// admin/users/hooks and being reused by assistant). Four independent facets
// — Persona, State, Group, Loyalty — each derived from real User fields, so
// picking one narrows the set without a network round trip.

export interface PersonaOption {
  key: string;
  label: string;
  color: string;
}

// Only the personas that matter for day-to-day user management are exposed
// here (sales/cse/technology/business/test/customer aren't surfaced as
// clickable facets) — those roles still show up in the table when no
// persona filter is applied, they just don't get a dedicated pill.
export const PERSONA_OPTIONS: PersonaOption[] = [
  { key: "client", label: "Client", color: "#1EB62D" },
  { key: "guest", label: "Guest", color: "#0EA5E9" },
  { key: "assistant", label: "Placement Control", color: "#008ED3" },
  { key: "admin", label: "Admin", color: "#7C3AED" },
  { key: "coach", label: "Coach", color: "#B26A22" },
  { key: "partner", label: "Channel Partner", color: "#EC4899" },
  { key: "ambassador", label: "Ambassador", color: "#C23434" },
];

export const STATE_OPTIONS = [
  { key: "active", label: "Active" },
  { key: "dormant", label: "Dormant" },
];

export const GROUP_OPTIONS = [
  { key: "customer", label: "Customer" },
  { key: "staff", label: "Staff" },
];

export const LOYALTY_OPTIONS = [
  { key: "newcomer", label: "Newcomer" },
  { key: "returnee", label: "Returnee" },
];

const CUSTOMER_PERSONAS = new Set(["client", "guest", "partner", "ambassador"]);
const STAFF_PERSONAS = new Set(["admin", "coach", "assistant"]);

// Ambassador is a flag on top of another role (usually client), not a role
// itself — it takes priority over the underlying role for display, same as
// the dashboard's "Ambassadors" bucket does.
export const personaForUser = (user: any): string | null => {
  if (user?.isAmbassador) return "ambassador";
  const role = typeof user?.role === "string" ? user.role.toLowerCase() : "";
  return PERSONA_OPTIONS.some((p) => p.key === role) ? role : role || null;
};

export const stateForUser = (user: any): "active" | "dormant" =>
  user?.isActive === false ? "dormant" : "active";

export const groupForUser = (user: any): "customer" | "staff" | null => {
  const persona = personaForUser(user);
  if (persona && CUSTOMER_PERSONAS.has(persona)) return "customer";
  if (persona && STAFF_PERSONAS.has(persona)) return "staff";
  return null;
};

// Newcomer = still on tour 1 (or hasn't started one yet — tourCount 0);
// Returnee = has renewed at least once (tourCount > 1). tourCount comes from
// the backend's user.service.ts getAllUsers, joined off the client's
// Credentials -> TourCount row (a client's Credentials row is reused across
// renewals, with TourCount.count incremented each time, not recreated).
export const loyaltyForUser = (user: any): "newcomer" | "returnee" =>
  (user?.tourCount ?? 0) > 1 ? "returnee" : "newcomer";

// Each facet holds the set of selected option keys — multiple values within
// the same facet are OR'd together (e.g. Persona: client + guest matches
// either), while the facets themselves are AND'd together, standard
// faceted-search behaviour.
export interface UserFilterState {
  persona: string[];
  state: string[];
  group: string[];
  loyalty: string[];
}

export const EMPTY_FILTERS: UserFilterState = {
  persona: [],
  state: [],
  group: [],
  loyalty: [],
};

// Saved segments (locked presets + DB-backed custom ones) may still carry
// the old single-value shape ({persona: "guest" | null}) from before
// multi-select — normalize either shape into the current array form so old
// saves keep working.
export const normalizeFilterState = (raw: any): UserFilterState => {
  const toArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
    if (typeof value === "string" && value) return [value];
    return [];
  };
  return {
    persona: toArray(raw?.persona),
    state: toArray(raw?.state),
    group: toArray(raw?.group),
    loyalty: toArray(raw?.loyalty),
  };
};

export const hasActiveFacetFilters = (filters: UserFilterState): boolean =>
  filters.persona.length > 0 || filters.state.length > 0 || filters.group.length > 0 || filters.loyalty.length > 0;

// Matches every facet in `filters` except the one named in `except` — used
// to compute each pill's "how many results if I also picked this" count
// against the OTHER currently-selected facets, standard faceted-search
// behaviour (picking within the same facet is always a fresh choice, not
// an AND with your previous pick in that same facet).
export const matchesFacets = (
  user: any,
  filters: UserFilterState,
  except?: keyof UserFilterState,
): boolean => {
  if (except !== "persona" && filters.persona.length > 0 && !filters.persona.includes(personaForUser(user) ?? ""))
    return false;
  if (except !== "state" && filters.state.length > 0 && !filters.state.includes(stateForUser(user))) return false;
  if (except !== "group" && filters.group.length > 0 && !filters.group.includes(groupForUser(user) ?? ""))
    return false;
  if (except !== "loyalty" && filters.loyalty.length > 0 && !filters.loyalty.includes(loyaltyForUser(user)))
    return false;
  return true;
};
