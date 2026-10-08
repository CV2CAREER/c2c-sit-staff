/**
 * Which plan row governs a client's subscription, and therefore where their
 * Sub Duration Days come from.
 *
 * Kept dependency-free and purely structural so it can be unit tested without a
 * database, and so the read paths and the save path cannot drift apart on how
 * they pick a plan.
 */

/** The only Plan fields these helpers read. */
export interface PlanLike {
  title?: string | null;
  validityPeriod?: string | null;
}

/**
 * Find the plan row that governs a client.
 *
 * `Plan` rows are append-only: every assignment calls `Plan.create`, so a client
 * who upgraded Coral -> Bronze -> Gold has three rows, and only the newest is
 * "current". Which one governs is recorded by title in
 * `seekExternalCredentials.Plan`. That title is the authority, so match on it
 * across the full set rather than assuming the newest row is the right one.
 *
 * Falls back to the newest row (callers order by `createdAt DESC`) only when no
 * title is stored, which preserves the original behaviour.
 */
export const resolveGoverningPlan = <T extends PlanLike>(
  plans: readonly T[],
  planTitle?: string | null
): T | null => {
  if (!Array.isArray(plans) || plans.length === 0) return null;
  if (planTitle) {
    const match = plans.find((p) => p?.title === planTitle);
    if (match) return match;
  }
  return plans[0] ?? null;
};

/**
 * The `validityPeriod` of the governing plan, e.g. "14 days" or "6 months".
 *
 * Returns null when the title is stored but no plan carries it, rather than
 * silently falling back to a different plan's period: measuring a client against
 * a plan they are not on is worse than showing nothing and letting the operator
 * see that the stored title is dangling.
 */
export const resolveValidityPeriod = <T extends PlanLike>(
  plans: readonly T[],
  planTitle?: string | null
): string | null => {
  if (!Array.isArray(plans) || plans.length === 0) return null;
  if (planTitle) {
    const match = plans.find((p) => p?.title === planTitle);
    return match?.validityPeriod ?? null;
  }
  return plans[0]?.validityPeriod ?? null;
};