"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Columns3,
  Database,
  Eraser,
  KeyRound,
  Link2,
  ListPlus,
  Plus,
  Rows3,
  Shapes,
  Table2,
  Tag,
  Trash2,
  Type,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import RowBrowser from "./RowBrowser";
import SearchSelect, { SelectOption } from "./SearchSelect";
import type { ColumnInput, DefaultInput, OperationInput, OperationKind, Structure } from "./types";

const NEW_IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

// update_value is produced by sheet imports, not built by hand.
type Kind = Exclude<OperationKind, "apply_diff" | "update_value">;

export const KIND_META: Record<Kind, { label: string; group: string; hint: string; icon: React.ReactNode; tone: "safe" | "caution" | "danger" }> = {
  add_column: { label: "Add column", group: "Columns", hint: "Safe — code ignores it until a model declares it.", icon: <ListPlus className="h-4 w-4" />, tone: "safe" },
  alter_column_type: { label: "Change type", group: "Columns", hint: "Every value is checked first; narrowing is backed up.", icon: <Type className="h-4 w-4" />, tone: "caution" },
  set_nullable: { label: "Required / optional", group: "Columns", hint: "Required is checked against existing empty values.", icon: <Columns3 className="h-4 w-4" />, tone: "caution" },
  set_default: { label: "Default value", group: "Columns", hint: "Only affects new rows.", icon: <Zap className="h-4 w-4" />, tone: "safe" },
  drop_column: { label: "Drop column", group: "Columns", hint: "Backed up first; blocked while a model declares it.", icon: <Trash2 className="h-4 w-4" />, tone: "danger" },
  create_index: { label: "Add index", group: "Indexes & keys", hint: "Faster reads; unique is checked for duplicates.", icon: <Rows3 className="h-4 w-4" />, tone: "safe" },
  drop_index: { label: "Drop index", group: "Indexes & keys", hint: "Undo recreates it from its definition.", icon: <Trash2 className="h-4 w-4" />, tone: "caution" },
  add_unique: { label: "Unique constraint", group: "Indexes & keys", hint: "Checked for existing duplicates.", icon: <KeyRound className="h-4 w-4" />, tone: "caution" },
  add_foreign_key: { label: "Foreign key", group: "Indexes & keys", hint: "Checked for rows pointing at missing data.", icon: <Link2 className="h-4 w-4" />, tone: "caution" },
  drop_constraint: { label: "Drop constraint", group: "Indexes & keys", hint: "Blocked while foreign keys depend on it.", icon: <Trash2 className="h-4 w-4" />, tone: "caution" },
  create_table: { label: "Create table", group: "Tables & types", hint: "Safe — nothing uses it yet.", icon: <Table2 className="h-4 w-4" />, tone: "safe" },
  drop_table: { label: "Drop table", group: "Tables & types", hint: "Kept as a renamed backup; blocked while a model maps it.", icon: <Trash2 className="h-4 w-4" />, tone: "danger" },
  add_enum_value: { label: "Add enum value", group: "Tables & types", hint: "Additive. PostgreSQL can't remove enum values.", icon: <Tag className="h-4 w-4" />, tone: "safe" },
  delete_rows: {
    label: "Delete rows",
    group: "Data",
    hint: "Pick rows or delete everything matching a filter. Every deleted row (and any cascade) is backed up and can be reverted.",
    icon: <Eraser className="h-4 w-4" />,
    tone: "danger",
  },
};

const TONE_DOT = { safe: "bg-green-500", caution: "bg-amber-500", danger: "bg-red-500" };

const input =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/25 disabled:bg-gray-50";

const Field = ({ title, children, error, hint }: { title: string; children: React.ReactNode; error?: string | null; hint?: string }) => (
  <div>
    <label className="mb-1 block text-xs font-semibold text-gray-600">{title}</label>
    {children}
    {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint ? <p className="mt-1 text-[11px] text-gray-500">{hint}</p> : null}
  </div>
);

const Segmented = <T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) => (
  <div className="inline-flex rounded-md border border-gray-300 bg-gray-50 p-0.5">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        className={cn("rounded px-3 py-1.5 text-xs font-medium transition", value === o.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800")}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const SchemaBadge = ({ schema }: { schema: string }) =>
  schema === "public" ? null : <span className="rounded bg-slate-100 px-1.5 py-px text-[10px] font-semibold text-slate-600">{schema}</span>;

const nameError = (v: string, taken: Set<string>) =>
  !v ? "Required." : !NEW_IDENT.test(v) ? "Letters, digits and _ only; not starting with a digit; max 63." : taken.has(v) ? "Already used in this database." : null;

const tableKey = (schema: string, name: string) => `${schema}.${name}`;
const splitKey = (key: string) => {
  const i = key.indexOf(".");
  return i === -1 ? { schema: "public", name: key } : { schema: key.slice(0, i), name: key.slice(i + 1) };
};

const DefaultEditor = ({ value, onChange, structure }: { value: DefaultInput; onChange: (v: DefaultInput) => void; structure: Structure }) => (
  <div className="space-y-2">
    <Segmented
      value={value.kind}
      onChange={(kind) => onChange(kind === "none" ? { kind } : kind === "expression" ? { kind, value: structure.choices.defaultExpressions[0] } : { kind, value: "" })}
      options={[
        { value: "none", label: "None" },
        { value: "literal", label: "Fixed value" },
        { value: "expression", label: "Function" },
      ]}
    />
    {value.kind === "literal" && <input className={input} value={value.value} onChange={(e) => onChange({ kind: "literal", value: e.target.value })} placeholder="e.g. pending, 0, false, {}" />}
    {value.kind === "expression" && (
      <SearchSelect
        value={value.value}
        onChange={(v) => onChange({ kind: "expression", value: v })}
        options={structure.choices.defaultExpressions.map((x) => ({ value: x, label: x }))}
      />
    )}
  </div>
);

const ColumnChecklist = ({ columns, value, onChange, single }: { columns: Structure["tables"][number]["columns"]; value: string[]; onChange: (v: string[]) => void; single?: boolean }) => {
  const [filter, setFilter] = useState("");
  const shown = columns.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="rounded-md border border-gray-300">
      {columns.length > 8 && (
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter columns…" className="w-full rounded-t-md border-b border-gray-200 px-3 py-1.5 text-xs focus:outline-none" />
      )}
      <div className="max-h-44 overflow-auto p-1">
        {shown.map((c) => {
          const on = value.includes(c.name);
          return (
            <label key={c.name} className={cn("flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm", on ? "bg-blue/10" : "hover:bg-gray-50")}>
              <input
                type={single ? "radio" : "checkbox"}
                checked={on}
                onChange={() => onChange(single ? [c.name] : on ? value.filter((x) => x !== c.name) : [...value, c.name])}
                className="accent-[#008ED3]"
              />
              <code className="text-xs font-medium">{c.name}</code>
              <span className="truncate text-[11px] text-gray-400">{c.type}</span>
              {on && !single && <span className="ml-auto text-[10px] font-semibold text-blue">#{value.indexOf(c.name) + 1}</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
};

interface Props {
  structure: Structure;
  onAdd: (op: OperationInput) => void;
}

const OperationEditor = ({ structure, onAdd }: Props) => {
  const [kind, setKind] = useState<Kind>("add_column");
  const [tableRef, setTableRef] = useState(""); // "schema.name"
  const [newSchema, setNewSchema] = useState("public");
  const [newTable, setNewTable] = useState("");
  const [column, setColumn] = useState("");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [type, setType] = useState("text");
  const [nullable, setNullable] = useState(true);
  const [def, setDef] = useState<DefaultInput>({ kind: "none" });
  const [cols, setCols] = useState<string[]>([]);
  const [unique, setUnique] = useState(false);
  const [refRef, setRefRef] = useState("");
  const [refColumn, setRefColumn] = useState("id");
  const [onDelete, setOnDelete] = useState("NO ACTION");
  const [enumRef, setEnumRef] = useState("");
  const [enumValue, setEnumValue] = useState("");
  const [newCols, setNewCols] = useState<(ColumnInput & { pk: boolean })[]>([
    { name: "id", type: "uuid", nullable: false, default: { kind: "expression", value: "gen_random_uuid()" }, pk: true },
    { name: "createdAt", type: "timestamp with time zone", nullable: false, default: { kind: "expression", value: "now()" }, pk: false },
    { name: "updatedAt", type: "timestamp with time zone", nullable: false, default: { kind: "expression", value: "now()" }, pk: false },
  ]);

  const { schema, name: table } = splitKey(tableRef);
  const tbl = structure.tables.find((t) => t.schema === schema && t.name === table);
  const col = tbl?.columns.find((c) => c.name === column);
  const refTbl = structure.tables.find((t) => tableKey(t.schema, t.name) === refRef);

  const schemas = useMemo(() => {
    const set = new Set(structure.tables.map((t) => t.schema));
    set.add("public");
    return [...set].sort((a, b) => (a === "public" ? -1 : b === "public" ? 1 : a.localeCompare(b)));
  }, [structure]);

  const takenNames = useMemo(() => {
    const s = new Set<string>();
    for (const t of structure.tables) {
      s.add(t.name);
      t.indexes.forEach((i) => s.add(i.name));
      t.constraints.forEach((c) => s.add(c.name));
    }
    return s;
  }, [structure]);

  // Options ------------------------------------------------------------------
  const tableOptions: SelectOption[] = useMemo(
    () =>
      [...structure.tables]
        .sort((a, b) => schemas.indexOf(a.schema) - schemas.indexOf(b.schema) || a.name.localeCompare(b.name))
        .map((t) => ({
          value: tableKey(t.schema, t.name),
          label: t.name,
          group: `${t.schema} schema`,
          description: `~${t.rowEstimate.toLocaleString()} rows · ${t.columns.length} columns`,
          icon: <Table2 className="h-4 w-4" />,
          badge: <SchemaBadge schema={t.schema} />,
        })),
    [structure, schemas],
  );

  const columnOptions: SelectOption[] = (tbl?.columns ?? []).map((c) => ({
    value: c.name,
    label: c.name,
    description: `${c.type}${c.nullable ? "" : " · required"}${c.default ? ` · default ${c.default.slice(0, 40)}` : ""}`,
    icon: <Columns3 className="h-4 w-4" />,
  }));

  const typeOptions: SelectOption[] = [
    ...structure.choices.types.map((t) => ({ value: t, label: t, group: "Common types" })),
    ...structure.enums
      .filter((e) => e.schema === (kind === "create_table" ? newSchema : schema))
      .map((e) => ({ value: e.name, label: e.name, group: "Enums in this schema", description: e.labels.slice(0, 6).join(", ") })),
  ];
  const typeCustom = { label: (v: string) => `Use type “${v}”`, validate: (v: string) => /^(varchar|character varying|numeric|decimal)\s*\(\s*\d+\s*(,\s*\d+\s*)?\)(\[\])?$/i.test(v) };

  const enumOptions: SelectOption[] = structure.enums.map((e) => ({
    value: tableKey(e.schema, e.name),
    label: e.name,
    group: `${e.schema} schema`,
    description: e.labels.join(", "),
    icon: <Shapes className="h-4 w-4" />,
  }));

  // Suggest index / constraint names until the admin edits it.
  useEffect(() => {
    if (nameTouched || !table) return;
    const base = cols.length ? cols.join("_") : "col";
    if (kind === "create_index") setName(`${table}_${base}_${unique ? "key" : "idx"}`.slice(0, 63));
    if (kind === "add_unique") setName(`${table}_${base}_key`.slice(0, 63));
    if (kind === "add_foreign_key") setName(`${table}_${base}_fkey`.slice(0, 63));
  }, [kind, table, cols, unique, nameTouched]);

  const resetFields = () => {
    setColumn("");
    setName("");
    setNameTouched(false);
    setCols([]);
    setDef({ kind: "none" });
    setEnumValue("");
    setRefRef("");
    setRefColumn("id");
  };

  // Validation ---------------------------------------------------------------
  const errors: string[] = [];
  const needsTable = kind !== "add_enum_value" && kind !== "create_table";
  const needsColumn = ["drop_column", "alter_column_type", "set_nullable", "set_default"].includes(kind);
  const usesColumns = ["create_index", "add_unique", "add_foreign_key"].includes(kind);
  if (needsTable && !tbl) errors.push("Pick a table.");
  if (needsColumn && !col) errors.push("Pick a column.");
  if (kind === "add_column") {
    const e = nameError(column, new Set(tbl?.columns.map((c) => c.name)));
    if (e) errors.push(`Column name: ${e}`);
  }
  if ((kind === "add_column" || kind === "alter_column_type") && !type) errors.push("Pick a type.");
  if (kind === "alter_column_type" && col && type === col.type) errors.push("That's already its type.");
  if (usesColumns) {
    const e = nameError(name, takenNames);
    if (e) errors.push(`Name: ${e}`);
    if (!cols.length) errors.push("Pick at least one column.");
  }
  if (kind === "add_foreign_key" && (!refTbl || !refColumn)) errors.push("Pick the referenced table and column.");
  if ((kind === "drop_index" || kind === "drop_constraint") && !name) errors.push(`Pick ${kind === "drop_index" ? "an index" : "a constraint"}.`);
  if (kind === "set_nullable" && col && col.nullable === nullable) errors.push(`It's already ${nullable ? "optional" : "required"}.`);
  if (kind === "create_table") {
    const e = nameError(newTable, takenNames);
    if (e) errors.push(`Table name: ${e}`);
    const seen = new Set<string>();
    newCols.forEach((c, i) => {
      if (!NEW_IDENT.test(c.name)) errors.push(`Column ${i + 1}: invalid name.`);
      else if (seen.has(c.name)) errors.push(`Column "${c.name}" is listed twice.`);
      seen.add(c.name);
      if (!c.type) errors.push(`Column ${i + 1}: pick a type.`);
    });
  }
  if (kind === "add_enum_value" && (!enumRef || !enumValue.trim())) errors.push("Pick an enum and type the new value.");
  if (kind === "delete_rows") errors.push("Use the buttons under the rows.");

  const submit = () => {
    if (errors.length) return;
    const base = { schema, table };
    let op: OperationInput;
    switch (kind) {
      case "add_column":
        op = { kind, ...base, column, type, nullable, default: def };
        break;
      case "drop_column":
        op = { kind, ...base, column };
        break;
      case "alter_column_type":
        op = { kind, ...base, column, type };
        break;
      case "set_nullable":
        op = { kind, ...base, column, nullable };
        break;
      case "set_default":
        op = { kind, ...base, column, default: def };
        break;
      case "create_index":
        op = { kind, ...base, name, columns: cols, unique };
        break;
      case "drop_index":
        op = { kind, ...base, name };
        break;
      case "add_unique":
        op = { kind, ...base, name, columns: cols };
        break;
      case "add_foreign_key":
        op = { kind, ...base, name, columns: cols.slice(0, 1), refSchema: refTbl!.schema, refTable: refTbl!.name, refColumns: [refColumn], onDelete };
        break;
      case "drop_constraint":
        op = { kind, ...base, name };
        break;
      case "create_table":
        op = {
          kind,
          schema: newSchema,
          table: newTable,
          columns: newCols.map(({ pk: _pk, ...c }) => c),
          primaryKey: newCols.filter((c) => c.pk).map((c) => c.name),
        };
        break;
      case "drop_table":
        op = { kind, ...base };
        break;
      case "add_enum_value": {
        const e = splitKey(enumRef);
        op = { kind, schema: e.schema, enum: e.name, value: enumValue.trim() };
        break;
      }
      default:
        return;
    }
    onAdd(op);
    resetFields();
  };

  const groups = [...new Set(Object.values(KIND_META).map((m) => m.group))];

  return (
    <div className="space-y-5">
      {/* 1. kind */}
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g}>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{g}</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {(Object.keys(KIND_META) as Kind[])
                .filter((k) => KIND_META[k].group === g)
                .map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setKind(k);
                      resetFields();
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition",
                      kind === k ? "border-blue bg-blue/10 font-semibold text-gray-900 ring-1 ring-blue" : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50",
                    )}
                  >
                    <span className={kind === k ? "text-blue" : "text-gray-400"}>{KIND_META[k].icon}</span>
                    <span className="min-w-0 flex-1 truncate">{KIND_META[k].label}</span>
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[KIND_META[k].tone])} />
                  </button>
                ))}
            </div>
          </div>
        ))}
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[KIND_META[kind].tone])} />
          {KIND_META[kind].hint}
        </p>
      </div>

      {/* 2. details */}
      <div className="rounded-md border border-gray-200 bg-gray-50/60 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          {kind === "create_table" ? (
            <>
              <Field title="Schema">
                <SearchSelect value={newSchema} onChange={setNewSchema} options={schemas.map((s) => ({ value: s, label: s, icon: <Database className="h-4 w-4" /> }))} />
              </Field>
              <Field title="New table name" error={newTable ? nameError(newTable, takenNames) : null}>
                <input className={input} value={newTable} onChange={(e) => setNewTable(e.target.value.trim())} placeholder="e.g. user_badges" />
              </Field>
            </>
          ) : kind === "add_enum_value" ? (
            <>
              <Field title="Enum type">
                <SearchSelect value={enumRef} onChange={setEnumRef} options={enumOptions} placeholder="Search enums…" emptyText="No enum types in this database" />
              </Field>
              <Field title="New value" hint={enumRef ? `Current: ${structure.enums.find((e) => tableKey(e.schema, e.name) === enumRef)?.labels.join(", ")}` : undefined}>
                <input className={input} value={enumValue} onChange={(e) => setEnumValue(e.target.value)} placeholder="e.g. archived" />
              </Field>
            </>
          ) : (
            <Field title="Table" hint={tbl ? `${tbl.schema}.${tbl.name} · ~${tbl.rowEstimate.toLocaleString()} rows` : `${structure.tables.length} tables in ${schemas.length} schema(s)`}>
              <SearchSelect
                value={tableRef}
                onChange={(v) => {
                  setTableRef(v);
                  resetFields();
                }}
                options={tableOptions}
                placeholder="Search tables…"
              />
            </Field>
          )}

          {needsColumn && (
            <Field title="Column">
              <SearchSelect value={column} onChange={setColumn} options={columnOptions} placeholder={tbl ? "Search columns…" : "Pick a table first"} disabled={!tbl} />
            </Field>
          )}

          {kind === "add_column" && (
            <Field title="New column name" error={column ? nameError(column, new Set(tbl?.columns.map((c) => c.name))) : null}>
              <input className={input} value={column} onChange={(e) => setColumn(e.target.value.trim())} placeholder={tbl ? "e.g. referralSource" : "Pick a table first"} disabled={!tbl} />
            </Field>
          )}

          {(kind === "add_column" || kind === "alter_column_type") && (
            <Field title={kind === "alter_column_type" && col ? `New type (currently ${col.type})` : "Type"} hint="Search, or type e.g. varchar(100) / numeric(10,2).">
              <SearchSelect value={type} onChange={setType} options={typeOptions} allowCustom={typeCustom} placeholder="Search types…" />
            </Field>
          )}

          {(kind === "add_column" || kind === "set_nullable") && (
            <Field title="Empty values">
              <Segmented
                value={nullable ? "optional" : "required"}
                onChange={(v) => setNullable(v === "optional")}
                options={[
                  { value: "optional", label: "Optional (NULL allowed)" },
                  { value: "required", label: "Required" },
                ]}
              />
            </Field>
          )}

          {(kind === "add_column" || kind === "set_default") && (
            <Field title={kind === "set_default" && col ? `New default (currently ${col.default ?? "none"})` : "Default for new rows"}>
              <DefaultEditor value={def} onChange={setDef} structure={structure} />
            </Field>
          )}

          {usesColumns && tbl && (
            <>
              <Field title={kind === "add_foreign_key" ? "Column" : "Columns (in order)"}>
                <ColumnChecklist columns={tbl.columns} value={cols} onChange={setCols} single={kind === "add_foreign_key"} />
              </Field>
              <div className="space-y-4">
                <Field title="Name" error={name ? nameError(name, takenNames) : null} hint="Suggested automatically — edit if you like.">
                  <input
                    className={input}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value.trim());
                      setNameTouched(true);
                    }}
                  />
                </Field>
                {kind === "create_index" && (
                  <Field title="Kind">
                    <Segmented
                      value={unique ? "unique" : "normal"}
                      onChange={(v) => setUnique(v === "unique")}
                      options={[
                        { value: "normal", label: "Normal" },
                        { value: "unique", label: "Unique" },
                      ]}
                    />
                  </Field>
                )}
                {kind === "add_foreign_key" && (
                  <>
                    <Field title="References table">
                      <SearchSelect
                        value={refRef}
                        onChange={(v) => {
                          setRefRef(v);
                          setRefColumn(structure.tables.find((t) => tableKey(t.schema, t.name) === v)?.columns.some((c) => c.name === "id") ? "id" : "");
                        }}
                        options={tableOptions}
                        placeholder="Search tables…"
                      />
                    </Field>
                    <Field title="References column">
                      <SearchSelect
                        value={refColumn}
                        onChange={setRefColumn}
                        disabled={!refTbl}
                        options={(refTbl?.columns ?? []).map((c) => ({ value: c.name, label: c.name, description: c.type }))}
                      />
                    </Field>
                    <Field title="When the referenced row is deleted">
                      <SearchSelect
                        value={onDelete}
                        onChange={setOnDelete}
                        options={[
                          { value: "NO ACTION", label: "Block the delete", description: "NO ACTION" },
                          { value: "RESTRICT", label: "Block the delete (immediately)", description: "RESTRICT" },
                          { value: "CASCADE", label: "Delete these rows too", description: "CASCADE" },
                          { value: "SET NULL", label: "Clear the reference", description: "SET NULL" },
                        ]}
                      />
                    </Field>
                  </>
                )}
              </div>
            </>
          )}

          {kind === "drop_index" && tbl && (
            <Field title="Index">
              <SearchSelect
                value={name}
                onChange={setName}
                placeholder="Search indexes…"
                emptyText="No droppable indexes on this table"
                options={tbl.indexes
                  .filter((i) => !i.constraintBacked)
                  .map((i) => ({ value: i.name, label: i.name, description: i.unique ? "unique" : "index", icon: <Rows3 className="h-4 w-4" /> }))}
              />
            </Field>
          )}

          {kind === "drop_constraint" && tbl && (
            <Field title="Constraint">
              <SearchSelect
                value={name}
                onChange={setName}
                placeholder="Search constraints…"
                emptyText="No constraints on this table"
                options={tbl.constraints.map((c) => ({ value: c.name, label: c.name, description: c.definition, icon: <KeyRound className="h-4 w-4" /> }))}
              />
            </Field>
          )}
        </div>

        {kind === "delete_rows" && tbl && (
          <div className="mt-4">
            <RowBrowser structure={structure} schema={tbl.schema} table={tbl.name} onAdd={onAdd} />
          </div>
        )}

        {kind === "create_table" && (
          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold text-gray-600">Columns</label>
            <div className="space-y-2">
              {newCols.map((c, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 rounded-md border border-gray-200 bg-white p-2 md:grid-cols-[1fr_1.4fr_auto_auto_auto] md:items-center">
                  <input className={input} value={c.name} placeholder="column name" onChange={(e) => setNewCols(newCols.map((x, j) => (j === i ? { ...x, name: e.target.value.trim() } : x)))} />
                  <SearchSelect value={c.type} options={typeOptions} allowCustom={typeCustom} onChange={(v) => setNewCols(newCols.map((x, j) => (j === i ? { ...x, type: v } : x)))} />
                  <label className="flex items-center gap-1 whitespace-nowrap text-xs">
                    <input type="checkbox" className="accent-[#008ED3]" checked={!c.nullable} onChange={(e) => setNewCols(newCols.map((x, j) => (j === i ? { ...x, nullable: !e.target.checked } : x)))} /> required
                  </label>
                  <label className="flex items-center gap-1 whitespace-nowrap text-xs">
                    <input type="checkbox" className="accent-[#008ED3]" checked={c.pk} onChange={(e) => setNewCols(newCols.map((x, j) => (j === i ? { ...x, pk: e.target.checked, nullable: e.target.checked ? false : x.nullable } : x)))} /> primary key
                  </label>
                  <button type="button" onClick={() => setNewCols(newCols.filter((_, j) => j !== i))} disabled={newCols.length === 1} className="justify-self-end rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-30" title="Remove column">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setNewCols([...newCols, { name: "", type: "text", nullable: true, pk: false }])} className="inline-flex items-center gap-1 text-xs font-medium text-blue hover:text-blue/80">
                <Plus className="h-3.5 w-3.5" /> Add column
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={cn("flex flex-col-reverse items-start justify-between gap-2 sm:flex-row sm:items-center", kind === "delete_rows" && "hidden")}>
        <span className="text-xs text-gray-500">{errors[0] ?? "Ready to add."}</span>
        <button
          type="button"
          onClick={submit}
          disabled={errors.length > 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <Plus className="h-4 w-4" /> Add to change
        </button>
      </div>
    </div>
  );
};

export default OperationEditor;
