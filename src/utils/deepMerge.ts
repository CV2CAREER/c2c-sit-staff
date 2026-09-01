export const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// "No information given" - a later delivery reporting one of these for a
// field shouldn't erase a real value an earlier delivery already gave us
// (e.g. a webhook field that only gets populated on certain event types and
// reports blank on the others).
export const isBlank = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

// Recursively overlays `patch` onto `base`: nested plain objects are merged
// key-by-key, and a blank patch value never overwrites a non-blank base
// value. Everything else (non-blank primitives, arrays) is replaced outright.
export const deepMerge = (
  base: Record<string, any>,
  patch: Record<string, any>,
): Record<string, any> => {
  const result: Record<string, any> = { ...base };

  for (const key of Object.keys(patch)) {
    const patchValue = patch[key];
    const baseValue = base[key];

    if (isPlainObject(patchValue) && isPlainObject(baseValue)) {
      result[key] = deepMerge(baseValue, patchValue);
    } else if (isBlank(patchValue) && !isBlank(baseValue)) {
      result[key] = baseValue;
    } else {
      result[key] = patchValue;
    }
  }

  return result;
};

// Sequelize matches `where: { externalId }` by exact type, and JustCall's
// ids sometimes come through as JSON numbers - stringify explicitly so every
// delivery for the same call/message resolves to the same column value
// instead of a number sometimes matching a string sometimes not.
export const toExternalId = (value: unknown): string | undefined =>
  value === undefined || value === null ? undefined : String(value);

// Picks whichever candidate actually has non-blank content for `key`,
// instead of just the first one that's present. JustCall names the same
// AI-analysis block "justcall_iq" on some event types and "justcall_ai" on
// others for the *same* call, so after a merge both keys can sit side by
// side - one stale and empty, one fresh and populated. A plain `??` would
// pick whichever key happens to exist first, which is often the stale one.
export const pickPopulated = (
  candidates: (Record<string, any> | undefined)[],
  key: string,
): Record<string, any> => {
  for (const candidate of candidates) {
    if (candidate && !isBlank(candidate[key])) return candidate;
  }
  return candidates.find((candidate) => candidate !== undefined) ?? {};
};
