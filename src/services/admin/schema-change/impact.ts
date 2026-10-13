import { SCHEMA_IMPACT_INDEX_JSON } from "../../../config/schema-impact-index.generated";

// Code impact of a schema operation, from the generated impact index
// (src/scripts/generate-schema-impact-index.ts): which models, API endpoints
// and screens (staff portal + customer portal) are affected, and how badly.

type App = "staff" | "customer";

interface IndexModel {
  app: App;
  className: string;
  table: string;
  file: string;
  columns: Record<string, string>;
}
interface IndexEndpoint {
  app: App;
  method: string;
  path: string;
  tables: Record<string, string[]>;
}
interface IndexScreen {
  app: App;
  route: string;
  file: string;
}
interface ImpactIndex {
  generatedAt: string;
  missing: string[];
  models: IndexModel[];
  endpoints: IndexEndpoint[];
  screens: IndexScreen[];
  endpointScreens: Record<string, [number, number][]>;
}

let index: ImpactIndex | null = null;
const load = (): ImpactIndex => {
  if (!index) index = JSON.parse(SCHEMA_IMPACT_INDEX_JSON) as ImpactIndex;
  return index;
};

export type ImpactLevel = "none" | "low" | "medium" | "high" | "blocker";

export interface ImpactReport {
  level: ImpactLevel;
  headline: string;
  notes: string[];
  models: { app: App; className: string; file: string; attribute?: string }[];
  endpoints: { app: App; method: string; path: string; mentionsColumn: boolean }[];
  screens: { app: App; route: string; direct: boolean }[];
  moreScreens: number;
}

export type ImpactKind =
  | "create_table"
  | "drop_table"
  | "add_column"
  | "drop_column"
  | "alter_type"
  | "set_not_null"
  | "drop_not_null"
  | "set_default"
  | "create_index"
  | "drop_index"
  | "add_unique"
  | "add_foreign_key"
  | "drop_constraint"
  | "enum_or_extension"
  | "delete_rows"
  | "update_value"
  | "revert";

const MAX_SCREENS = 40;
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE", "ALL"]);

const lower = (v: string) => v.toLowerCase();

export const impactIndexInfo = () => {
  const idx = load();
  return { generatedAt: idx.generatedAt, missingRepos: idx.missing };
};

const collect = (
  table: string,
  opts: { column?: string; columnOnly?: boolean; writesOnly?: boolean },
) => {
  const idx = load();
  const t = lower(table);
  const col = opts.column ? lower(opts.column) : undefined;

  const models = idx.models.filter((m) => lower(m.table) === t);
  const endpointRows: { i: number; e: IndexEndpoint; mentionsColumn: boolean }[] = [];
  idx.endpoints.forEach((e, i) => {
    const cols = e.tables[t];
    if (!cols) return;
    const mentionsColumn = !!col && cols.includes(col);
    if (opts.columnOnly && !mentionsColumn) return;
    if (opts.writesOnly && !WRITE_METHODS.has(e.method)) return;
    endpointRows.push({ i, e, mentionsColumn });
  });

  const best = new Map<number, number>();
  for (const { i } of endpointRows) {
    for (const [s, d] of idx.endpointScreens[i] || []) {
      if (!best.has(s) || d < best.get(s)!) best.set(s, d);
    }
  }
  const screensAll = [...best.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([s, d]) => ({ app: idx.screens[s].app, route: idx.screens[s].route, direct: d <= 2 }));

  return {
    models,
    endpoints: endpointRows
      .sort((a, b) => Number(b.mentionsColumn) - Number(a.mentionsColumn))
      .map(({ e, mentionsColumn }) => ({ app: e.app, method: e.method, path: e.path, mentionsColumn })),
    screens: screensAll.slice(0, MAX_SCREENS),
    moreScreens: Math.max(0, screensAll.length - MAX_SCREENS),
  };
};

const appsLabel = (models: IndexModel[]) =>
  models.map((m) => `${m.className} (${m.app === "staff" ? "staff backend" : "customer backend"})`).join(", ");

const report = (
  level: ImpactLevel,
  headline: string,
  data: ReturnType<typeof collect>,
  notes: string[] = [],
  attribute?: (m: IndexModel) => string | undefined,
): ImpactReport => ({
  level,
  headline,
  notes,
  models: data.models.map((m) => ({ app: m.app, className: m.className, file: m.file, attribute: attribute?.(m) })),
  endpoints: data.endpoints,
  screens: data.screens,
  moreScreens: data.moreScreens,
});

const NONE: ImpactReport = { level: "none", headline: "", notes: [], models: [], endpoints: [], screens: [], moreScreens: 0 };

export const assessImpact = (
  kind: ImpactKind,
  table: string | null,
  column?: string,
  extra: { notNullWithoutDefault?: boolean; unique?: boolean } = {},
): ImpactReport => {
  if (!table) {
    return { ...NONE, headline: "No application code depends on this object directly." };
  }
  const col = column ? lower(column) : undefined;

  switch (kind) {
    case "create_table": {
      const data = collect(table, {});
      return data.models.length
        ? report(
            "low",
            `Fixes code that already expects this table: ${appsLabel(data.models)} map to it, so ${data.endpoints.length} endpoint(s) currently fail on this database.`,
            data,
          )
        : { ...NONE, headline: "Nothing in the staff or customer code uses this table yet." };
    }

    case "add_column": {
      const data = collect(table, {});
      const declaring = data.models.filter((m) => col && m.columns[col]);
      if (declaring.length) {
        return report(
          "low",
          `Fixes code: ${appsLabel(declaring)} already declare "${column}". Sequelize selects every declared column, so queries through ${declaring.length > 1 ? "these models" : "this model"} currently fail on this database.`,
          { ...data, models: declaring },
          [],
          (m) => (col ? m.columns[col] : undefined),
        );
      }
      if (extra.notNullWithoutDefault) {
        const writes = collect(table, { writesOnly: true });
        return report(
          "high",
          `Inserts through code that doesn't set "${column}" would fail — the column is NOT NULL without a default.`,
          writes,
        );
      }
      return {
        ...NONE,
        level: "none",
        headline: "No impact: the app ignores a new column until a model declares it.",
        notes: data.models.length ? [`Add "${column}" to ${appsLabel(data.models)} when the code should start using it.`] : [],
      };
    }

    case "drop_column": {
      const data = collect(table, {});
      const declaring = data.models.filter((m) => col && m.columns[col]);
      if (declaring.length) {
        return report(
          "blocker",
          `${appsLabel(declaring)} still declare "${column}". Sequelize selects every declared column, so every query through ${declaring.length > 1 ? "these models" : "this model"} would fail with "column does not exist" — ${data.endpoints.length} endpoint(s) and the screens below would break.`,
          data,
          [
            `Remove "${column}" from ${appsLabel(declaring)}, deploy both backends, re-run \`npm run schema-usage:scan\`, then try again.`,
          ],
          (m) => (col ? m.columns[col] : undefined),
        );
      }
      const raw = collect(table, { column, columnOnly: true });
      return raw.endpoints.length
        ? report("high", `Code still references "${column}" (raw SQL or field access) — these endpoints may fail.`, raw)
        : { ...NONE, level: "low", headline: `No model or query in the staff or customer code references "${column}".` };
    }

    case "drop_table": {
      const data = collect(table, {});
      if (data.models.length) {
        return report(
          "blocker",
          `${appsLabel(data.models)} map to this table — every query through ${data.models.length > 1 ? "them" : "it"} would fail (${data.endpoints.length} endpoint(s)).`,
          data,
          [`Remove the model(s) and their usages, deploy, re-run \`npm run schema-usage:scan\`, then try again.`],
        );
      }
      return data.endpoints.length
        ? report("high", `Raw SQL in ${data.endpoints.length} endpoint(s) still queries this table.`, data)
        : { ...NONE, level: "low", headline: "No model or query in the staff or customer code uses this table." };
    }

    case "alter_type": {
      const data = collect(table, { column, columnOnly: true });
      const declaring = collect(table, {}).models.filter((m) => col && m.columns[col]);
      if (!data.endpoints.length && !declaring.length) {
        return { ...NONE, level: "low", headline: `No code references "${column}".` };
      }
      return report(
        "medium",
        `Code that reads or writes "${column}" will get the new type — check the model's DataType${declaring.length ? ` (${appsLabel(declaring)})` : ""} and any parsing in these endpoints.`,
        { ...data, models: declaring },
        [],
        (m) => (col ? m.columns[col] : undefined),
      );
    }

    case "set_not_null": {
      const writes = collect(table, { writesOnly: true });
      return writes.endpoints.length
        ? report(
            "medium",
            `Writes that leave "${column}" empty will be rejected. ${writes.endpoints.length} write endpoint(s) touch this table — those that never set "${column}" are listed first as risky.`,
            { ...writes, endpoints: [...writes.endpoints].sort((a, b) => Number(a.mentionsColumn) - Number(b.mentionsColumn)) },
          )
        : { ...NONE, level: "low", headline: "No write endpoint touches this table." };
    }

    case "add_unique":
    case "add_foreign_key": {
      const writes = collect(table, { writesOnly: true });
      return writes.endpoints.length
        ? report(
            "medium",
            kind === "add_unique"
              ? "Writes that would create a duplicate will now be rejected with an error."
              : "Writes pointing at a row that doesn't exist will now be rejected with an error.",
            writes,
          )
        : { ...NONE, level: "low", headline: "No write endpoint touches this table." };
    }

    case "create_index":
      return {
        ...NONE,
        level: extra.unique ? "medium" : "none",
        headline: extra.unique
          ? "Writes that would create a duplicate will be rejected; reads may get faster."
          : "Performance only — no behaviour change. Writes to this table briefly wait while the index builds.",
      };

    case "drop_index": {
      const reads = collect(table, {});
      return reads.endpoints.length
        ? report("low", "Behaviour is unchanged, but queries on this table that relied on the index may get slower.", reads)
        : { ...NONE, level: "low", headline: "Performance only — no behaviour change." };
    }

    case "drop_not_null":
    case "set_default":
      return { ...NONE, level: "none", headline: "Relaxes the schema — existing code keeps working." };

    case "drop_constraint":
      return { ...NONE, level: "low", headline: "Data the constraint used to reject will now be accepted; existing code keeps working." };

    case "enum_or_extension":
      return { ...NONE, level: "none", headline: "Additive — existing code keeps working." };

    case "delete_rows": {
      const reads = collect(table, {});
      return reads.endpoints.length
        ? report(
            "medium",
            `The deleted rows disappear from everything that reads ${table}: ${reads.endpoints.length} endpoint(s) and the screens below. Users or records that depended on them will no longer be found.`,
            reads,
          )
        : { ...NONE, level: "low", headline: `No endpoint in the staff or customer code reads ${table}.` };
    }

    case "update_value": {
      const data = collect(table, { column, columnOnly: true });
      return data.endpoints.length
        ? report("low", `Screens that show "${column}" will show the new value.`, data)
        : { ...NONE, level: "low", headline: `No code references "${column}" directly.` };
    }

    case "revert":
      return { ...NONE, level: "medium", headline: "Restores the previous schema — code deployed since the original change may depend on it." };
  }
};

export const IMPACT_RANK: Record<ImpactLevel, number> = { none: 0, low: 1, medium: 2, high: 3, blocker: 4 };
