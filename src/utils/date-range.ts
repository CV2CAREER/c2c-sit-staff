import ErrorHandler from "./errorHandler";

export interface NormalizedDateRange {
  from: Date;
  to: Date;
  fromIso: string;
  toIso: string;
  isWholeDays: boolean;
  tz: string;
}

const DEFAULT_TIME_ZONE = "Africa/Lagos";

const parseIsoDateOrThrow = (value: string, label: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ErrorHandler(
      `Invalid ${label} date. Use a valid ISO-8601 date string.`,
      400,
    );
  }
  return parsed;
};

const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value.trim());

// Treat date-only input as a day in the configured time zone.
const parseDateOnlyInTz = (value: string, label: string, tz: string): Date => {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new ErrorHandler(
      `Invalid ${label} date. Use YYYY-MM-DD or an ISO date-time.`,
      400,
    );
  }

  const [_, yearRaw, monthRaw, dayRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    throw new ErrorHandler(
      `Invalid ${label} date. Use YYYY-MM-DD or an ISO date-time.`,
      400,
    );
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Start with a UTC midnight guess and then shift it to the instant that formats
  // to local midnight for the given date in the chosen time zone.
  let guessMs = Date.UTC(year, month - 1, day, 0, 0, 0);

  for (let i = 0; i < 2; i += 1) {
    const parts = formatter.formatToParts(new Date(guessMs));
    const localYear = Number(parts.find((p) => p.type === "year")?.value || "0");
    const localMonth = Number(
      parts.find((p) => p.type === "month")?.value || "1",
    );
    const localDay = Number(parts.find((p) => p.type === "day")?.value || "1");
    const localHour = Number(parts.find((p) => p.type === "hour")?.value || "0");
    const localMinute = Number(
      parts.find((p) => p.type === "minute")?.value || "0",
    );
    const localSecond = Number(
      parts.find((p) => p.type === "second")?.value || "0",
    );

    const localDateUtcMs = Date.UTC(localYear, localMonth - 1, localDay, 0, 0, 0);
    const targetDateUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0);
    const dayDiff = Math.round((localDateUtcMs - targetDateUtcMs) / 86_400_000);
    const localTimeSeconds = localHour * 3600 + localMinute * 60 + localSecond;

    const shiftMs = (dayDiff * 86_400 + localTimeSeconds) * 1000;
    guessMs -= shiftMs;
  }

  const result = new Date(guessMs);
  if (Number.isNaN(result.getTime())) {
    throw new ErrorHandler(
      `Invalid ${label} date. Use YYYY-MM-DD or an ISO date-time.`,
      400,
    );
  }

  return result;
};

const isWholeDayBoundary = (date: Date, tz: string): boolean => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const second = parts.find((p) => p.type === "second")?.value ?? "00";

  return hour === "00" && minute === "00" && second === "00";
};

export const normalizeDateRange = (input: {
  from?: string;
  to?: string;
  tz?: string;
  defaultLookbackDays: number;
}): NormalizedDateRange => {
  const tz = input.tz || DEFAULT_TIME_ZONE;

  const parsedTo = input.to
    ? isDateOnly(input.to)
      ? parseDateOnlyInTz(input.to, "to", tz)
      : parseIsoDateOrThrow(input.to, "to")
    : new Date();

  const defaultFrom = new Date(
    parsedTo.getTime() - input.defaultLookbackDays * 24 * 60 * 60 * 1000,
  );

  const parsedFrom = input.from
    ? isDateOnly(input.from)
      ? parseDateOnlyInTz(input.from, "from", tz)
      : parseIsoDateOrThrow(input.from, "from")
    : defaultFrom;

  // If `to` was provided as date-only, treat it as exclusive end boundary (next day).
  const toExclusive =
    input.to && isDateOnly(input.to)
      ? new Date(parsedTo.getTime() + 24 * 60 * 60 * 1000)
      : parsedTo;

  if (parsedFrom >= toExclusive) {
    throw new ErrorHandler("The `from` date must be earlier than `to` date.", 400);
  }

  const isWholeDays =
    isWholeDayBoundary(parsedFrom, tz) && isWholeDayBoundary(toExclusive, tz);

  return {
    from: parsedFrom,
    to: toExclusive,
    fromIso: parsedFrom.toISOString(),
    toIso: toExclusive.toISOString(),
    isWholeDays,
    tz,
  };
};

export const enumerateDates = (fromDay: string, toDayExclusive: string): string[] => {
  const start = new Date(`${fromDay}T00:00:00.000Z`);
  const end = new Date(`${toDayExclusive}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [];
  }

  const days: string[] = [];
  for (let cursor = start; cursor < end; ) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return days;
};
