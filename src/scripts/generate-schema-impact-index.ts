import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import path from "path";

// Builds the code-impact index used by Admin > Database Modifications to answer
// "if I change table X / column Y, which API endpoints and which SCREENS
// (staff portal and customer portal) are affected?".
//
//   table ──model / raw SQL──▶ backend files ──imports──▶ controller handler
//         ──route + mount──▶ endpoint (METHOD /api/v1/...)
//         ──endpoint string──▶ frontend file ──imports──▶ app/**/page.tsx
//
// It is static and regex-based, so it is deliberately generous: reports are
// labelled "direct" (page/component calls the endpoint itself) vs "indirect"
// (through shared hooks), and nothing is ever hidden because of it.
//
//   npm run schema-usage:scan     (runs this after the table-usage scan)
//
// Repos default to their location next to this one; override with
//   --staff-fe=<src> --customer-be=<src> --customer-fe=<src>

const ROOT = path.resolve(__dirname, "../..");
const argv = process.argv.slice(2);
const flag = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

type App = "staff" | "customer";
interface Repo {
  app: App;
  kind: "backend" | "frontend";
  src: string;
}

const REPOS: Repo[] = [
  { app: "staff", kind: "backend", src: path.join(ROOT, "src") },
  { app: "customer", kind: "backend", src: path.resolve(ROOT, flag("customer-be") || "../../C2C Frontend/c2c-customer-backend/src") },
  { app: "staff", kind: "frontend", src: path.resolve(ROOT, flag("staff-fe") || "../c2c-staff-rft/src") },
  { app: "customer", kind: "frontend", src: path.resolve(ROOT, flag("customer-fe") || "../../C2C Frontend/c2c-customer-rft/src") },
];

const OUTPUT = path.join(ROOT, "src/config/schema-impact-index.generated.ts");

// ---------------------------------------------------------------------------
// file loading + import graph

const SKIP_DIRS = new Set(["node_modules", ".next", "scripts", "tests", "__tests__", "logs", "public", "docs", "build", "dist"]);

const listFiles = (dir: string, out: string[] = []) => {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) listFiles(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry) && !/\.(d|test|spec)\.tsx?$/.test(entry) && full !== OUTPUT) out.push(full);
  }
  return out;
};

interface Code {
  repo: Repo;
  files: Map<string, string>;
  imports: Map<string, Set<string>>; // file -> files it imports
  importers: Map<string, Set<string>>; // file -> files importing it
  named: Map<string, Map<string, string>>; // file -> local name -> source file
}

const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"];

const resolveSpec = (code: Code, from: string, spec: string): string | null => {
  let base: string | null = null;
  if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else if (spec.startsWith("@/")) base = path.join(code.repo.src, spec.slice(2));
  else if (spec.startsWith("src/")) base = path.join(code.repo.src, spec.slice(4));
  if (!base) return null;
  for (const ext of EXTENSIONS) {
    if (code.files.has(base + ext)) return base + ext;
  }
  return null;
};

const IMPORT_RE =
  /import\s+(type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]|export\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;

const loadCode = (repo: Repo): Code => {
  const files = new Map<string, string>();
  for (const f of listFiles(repo.src)) files.set(f, readFileSync(f, "utf8"));
  const code: Code = { repo, files, imports: new Map(), importers: new Map(), named: new Map() };

  for (const [file, text] of files) {
    const deps = new Set<string>();
    const named = new Map<string, string>();
    for (const m of text.matchAll(IMPORT_RE)) {
      if (m[1]) continue; // `import type` carries no runtime dependency
      const spec = m[3] || m[4] || m[5] || m[6];
      const target = spec ? resolveSpec(code, file, spec) : null;
      if (!target) continue;
      deps.add(target);
      if (m[2]) {
        const clause = m[2];
        const def = clause.match(/^\s*([A-Za-z_$][\w$]*)/);
        if (def && !clause.trim().startsWith("{") && !clause.trim().startsWith("*")) named.set(def[1], target);
        const ns = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
        if (ns) named.set(ns[1], target);
        const braces = clause.match(/\{([\s\S]*)\}/);
        if (braces) {
          for (const part of braces[1].split(",")) {
            const p = part.replace(/\btype\s+/, "").trim();
            if (!p) continue;
            const [orig, alias] = p.split(/\s+as\s+/);
            named.set((alias || orig).trim(), target);
          }
        }
      }
    }
    code.imports.set(file, deps);
    code.named.set(file, named);
    for (const d of deps) {
      if (!code.importers.has(d)) code.importers.set(d, new Set());
      code.importers.get(d)!.add(file);
    }
  }
  return code;
};

// ---------------------------------------------------------------------------
// backend: models, SQL references, routes, handlers

const IDENT = `([A-Za-z_][A-Za-z0-9_]*)`;
const SQL_TABLE_RES = [
  new RegExp(`\\b(?:FROM|JOIN|INTO|UPDATE|TABLE(?:\\s+IF\\s+(?:NOT\\s+)?EXISTS)?)\\s+(?:ONLY\\s+)?(?:"?public"?\\.)?"?${IDENT}"?`, "g"),
  new RegExp(`\\b(?:from|join|into|update|table)\\s+(?:"?public"?\\.)?"${IDENT}"`, "gi"),
  new RegExp(`\\b(?:addColumn|removeColumn|changeColumn|describeTable|bulkInsert|bulkUpdate|bulkDelete|addIndex)\\(\\s*['"\`]${IDENT}['"\`]`, "g"),
];

interface ModelInfo {
  app: App;
  file: string;
  className: string;
  table: string;
  columns: Record<string, string>; // db column (lower) -> attribute name
}

const parseModel = (file: string, text: string, app: App): ModelInfo | null => {
  const table = text.match(/tableName\s*:\s*['"`]([^'"`]+)['"`]/)?.[1];
  if (!table) return null;
  const className =
    text.match(/export\s+(?:default\s+)?class\s+(\w+)\s+extends\s+Model/)?.[1] ||
    text.match(/class\s+(\w+)\s+extends\s+Model/)?.[1] ||
    path.basename(file).split(".")[0];

  const columns: Record<string, string> = {};
  const lines = text.split(/\r?\n/);
  let inColumnDecorator = false;
  let pendingField: string | null = null;
  // Depth of unclosed "(" — lines inside a multi-line @Column({ ... }) are
  // decorator options, not class properties.
  let parenDepth = 0;
  for (const line of lines) {
    if (/@(Column|PrimaryKey|ForeignKey|CreatedAt|UpdatedAt|DeletedAt|Default|AllowNull|Unique)\b/.test(line)) inColumnDecorator = true;
    const field = line.match(/\bfield\s*:\s*['"`](\w+)['"`]/);
    if (field) pendingField = field[1];
    const insideDecorator = parenDepth > 0;
    parenDepth = Math.max(0, parenDepth + (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length);
    if (insideDecorator || line.trim().startsWith("@")) continue;
    const prop = line.match(/^\s+(?:declare\s+|public\s+|readonly\s+)*(\w+)[!?]?\s*:\s*[^=(]/);
    if (prop && inColumnDecorator && !/^(type|field|allowNull|defaultValue|primaryKey|unique|comment|references)$/.test(prop[1])) {
      columns[(pendingField || prop[1]).toLowerCase()] = prop[1];
      inColumnDecorator = false;
      pendingField = null;
    }
  }
  // createdAt / updatedAt are added by Sequelize timestamps without decorators.
  if (!/timestamps\s*:\s*false/.test(text)) {
    columns.createdat ??= "createdAt";
    columns.updatedat ??= "updatedAt";
  }
  return { app, file, className, table, columns };
};

interface RouteDef {
  routerFile: string;
  method: string;
  localPath: string;
  handler: string | null;
}

const joinPath = (...parts: string[]) =>
  ("/" + parts.map((p) => p.replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/")).replace(/\/+/g, "/");

const parseRoutes = (code: Code) => {
  const routes: RouteDef[] = [];
  // router file -> list of { prefix, parentFile|null }
  const mounts = new Map<string, { prefix: string; parent: string | null }[]>();

  for (const [file, text] of code.files) {
    const routerVars = new Set<string>();
    for (const m of text.matchAll(/(?:const|let)\s+(\w+)\s*(?::\s*\w+\s*)?=\s*(?:express\.)?Router\(\)/g)) routerVars.add(m[1]);
    const isApp = /\bconst\s+app\s*=\s*express\(\)/.test(text);
    if (isApp) routerVars.add("app");
    if (!routerVars.size) continue;

    const named = code.named.get(file)!;
    for (const v of routerVars) {
      // METHOD routes
      const methodRe = new RegExp(`\\b${v}\\.(get|post|put|patch|delete|all)\\(\\s*(['"\`])([^'"\`]*)\\2\\s*,([\\s\\S]*?)\\)\\s*;`, "g");
      for (const m of text.matchAll(methodRe)) {
        const args = m[4].split(",").map((a) => a.trim()).filter(Boolean);
        const last = args[args.length - 1] || "";
        const handler = /^[A-Za-z_$][\w$]*(\.[\w$]+)?$/.test(last) ? last : null;
        routes.push({ routerFile: file, method: m[1].toUpperCase(), localPath: m[3], handler });
      }
      // mounts: v.use("/prefix", ...mw, childRouter)
      const useRe = new RegExp(`\\b${v}\\.use\\(\\s*(['"\`])([^'"\`]*)\\1\\s*,([\\s\\S]*?)\\)\\s*;`, "g");
      for (const m of text.matchAll(useRe)) {
        const args = m[3].split(",").map((a) => a.trim()).filter(Boolean);
        const last = args[args.length - 1];
        const child = last ? named.get(last) : undefined;
        if (!child) continue;
        if (!mounts.has(child)) mounts.set(child, []);
        mounts.get(child)!.push({ prefix: m[2], parent: v === "app" ? null : file });
      }
    }
  }

  const prefixesOf = (file: string, depth = 0): string[] => {
    const list = mounts.get(file);
    if (!list || depth > 4) return [];
    const out: string[] = [];
    for (const { prefix, parent } of list) {
      if (!parent) out.push(prefix);
      else for (const pp of prefixesOf(parent, depth + 1)) out.push(joinPath(pp, prefix));
    }
    return out;
  };

  return { routes, prefixesOf };
};

// Source of one function/method named `name` inside a file. Code is
// prettier-formatted, so a body ends at the first closing-brace line with the
// same indentation as its definition line.
const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const bodyCache = new Map<string, string | null>();
const functionBody = (file: string, text: string, name: string): string | null => {
  const key = `${file}#${name}`;
  if (bodyCache.has(key)) return bodyCache.get(key)!;
  const def = new RegExp(
    String.raw`^([ \t]*)(?:export\s+)?(?:default\s+)?(?:public\s+|private\s+|protected\s+|static\s+|readonly\s+)*(?:async\s+)?(?:function\s*\*?\s*)?(?:const\s+|let\s+)?${escapeRe(name)}\s*(?:=\s*(?:async\s*)?(?:function\b|\(|[A-Za-z_$][\w$]*\s*=>|catchAsyncError)|\(|<|:\s*(?:async\s*)?\()`,
    "m",
  );
  const m = def.exec(text);
  let body: string | null = null;
  if (m) {
    const indent = m[1].length;
    const lines = text.slice(m.index).split(/\r?\n/);
    const out: string[] = [lines[0]];
    for (let i = 1; i < lines.length && i < 800; i++) {
      const line = lines[i];
      out.push(line);
      const lead = line.length - line.trimStart().length;
      // Only a closing brace ends a body — a line starting with ")" at the same
      // indent is just the end of a multi-line parameter list.
      if (line.trim() && lead <= indent && /^\}/.test(line.trim())) break;
      if (line.trim() && lead < indent) break;
    }
    body = out.join("\n");
  }
  bodyCache.set(key, body);
  return body;
};

// ---------------------------------------------------------------------------
// frontend: endpoint strings, usage, pages

const API_STR = /(['"`])((?:\/?api\/)?\/?v1\/[^'"`\s]*?)\1/g;

const normalizePath = (raw: string): string[] | null => {
  const i = raw.indexOf("v1/");
  if (i === -1) return null;
  let p = raw.slice(i).split("?")[0];
  p = p.replace(/\$\{[^}]*\}/g, ":p").replace(/\/+$/, "");
  return p.split("/").filter(Boolean);
};

const matchSegments = (fe: string[], be: string[]) =>
  fe.length === be.length && fe.every((seg, i) => seg === be[i] || seg.startsWith(":") || be[i].startsWith(":"));

const pageRoute = (src: string, file: string) => {
  const rel = path.relative(path.join(src, "app"), path.dirname(file)).split(path.sep);
  const segs = rel.filter((s) => s && s !== "." && !/^\(.*\)$/.test(s) && !s.startsWith("@"));
  return "/" + segs.join("/");
};

// ---------------------------------------------------------------------------
// main

const missing: string[] = [];
const codes = REPOS.filter((r) => {
  if (existsSync(r.src)) return true;
  missing.push(`${r.app}-${r.kind} (${r.src})`);
  return false;
}).map(loadCode);

const backend = (app: App) => codes.find((c) => c.repo.app === app && c.repo.kind === "backend");
const frontend = (app: App) => codes.find((c) => c.repo.app === app && c.repo.kind === "frontend");

interface EndpointOut {
  app: App;
  method: string;
  path: string;
  tables: Record<string, string[]>; // table -> columns mentioned
}

const endpoints: EndpointOut[] = [];
const models: ModelInfo[] = [];

for (const app of ["staff", "customer"] as App[]) {
  const code = backend(app);
  if (!code) continue;

  const modelByFile = new Map<string, ModelInfo>();
  for (const [file, text] of code.files) {
    if (!/[\\/]models[\\/]/.test(file)) continue;
    const info = parseModel(file, text, app);
    if (info) {
      modelByFile.set(file, info);
      models.push(info);
    }
  }

  // Hubs (model registries, db bootstrap) import most models; walking
  // through them would make every endpoint touch every table.
  const hubs = new Set(
    [...code.imports.entries()]
      .filter(([, deps]) => [...deps].filter((d) => modelByFile.has(d)).length >= 12)
      .map(([f]) => f),
  );

  const sqlTables = new Map<string, Set<string>>();
  for (const [file, text] of code.files) {
    if (modelByFile.has(file)) continue;
    const set = new Set<string>();
    for (const re of SQL_TABLE_RES) for (const m of text.matchAll(re)) set.add(m[1].toLowerCase());
    if (set.size) sqlTables.set(file, set);
  }
  const modelByTable = new Map<string, ModelInfo>();
  for (const mi of modelByFile.values()) modelByTable.set(mi.table.toLowerCase(), mi);

  interface Trace {
    tables: Set<string>;
    texts: string[];
    seen: Set<string>;
  }

  // Follow only the code that actually runs: imported names used in `text`,
  // and for services the specific methods called (svc.method(...)).
  const trace = (file: string, text: string, depth: number, acc: Trace) => {
    acc.texts.push(text);
    for (const re of SQL_TABLE_RES) for (const m of text.matchAll(re)) acc.tables.add(m[1].toLowerCase());
    const named = code.named.get(file) || new Map<string, string>();

    const follow = (target: string, name: string) => {
      const key = `${target}#${name}`;
      if (acc.seen.has(key) || depth >= 4 || hubs.has(target)) return;
      acc.seen.add(key);
      const targetText = code.files.get(target);
      if (!targetText) return;
      const body = functionBody(target, targetText, name);
      if (body) trace(target, body, depth + 1, acc);
    };

    for (const [local, target] of named) {
      const id = escapeRe(local);
      if (!new RegExp(String.raw`\b${id}\b`).test(text)) continue;
      const mi = modelByFile.get(target);
      if (mi) {
        acc.tables.add(mi.table.toLowerCase());
        continue;
      }
      let calledMember = false;
      for (const m of text.matchAll(new RegExp(String.raw`\b${id}\.(\w+)\s*\(`, "g"))) {
        calledMember = true;
        follow(target, m[1]);
      }
      if (!calledMember && new RegExp(String.raw`\b${id}\s*\(`).test(text)) follow(target, local);
    }
    // this.helper(...) inside the same file
    for (const m of text.matchAll(/\bthis\.(\w+)\s*\(/g)) {
      const key = `${file}#${m[1]}`;
      if (acc.seen.has(key) || depth >= 4) continue;
      acc.seen.add(key);
      const body = functionBody(file, code.files.get(file) || "", m[1]);
      if (body) trace(file, body, depth + 1, acc);
    }
  };

  const { routes, prefixesOf } = parseRoutes(code);
  for (const r of routes) {
    const prefixes = r.routerFile.endsWith("app.ts") ? [""] : prefixesOf(r.routerFile);
    if (!prefixes.length || !r.handler) continue;

    const routerNamed = code.named.get(r.routerFile)!;
    const [handlerLocal, member] = r.handler.split(".");
    const controllerFile = routerNamed.get(handlerLocal);
    if (!controllerFile) continue; // inline handlers: nothing reliable to follow
    const ctrlText = code.files.get(controllerFile) || "";
    const body = functionBody(controllerFile, ctrlText, member || handlerLocal);
    if (!body) continue;

    const acc: Trace = { tables: new Set(), texts: [], seen: new Set() };
    trace(controllerFile, body, 0, acc);
    if (!acc.tables.size) continue;

    // Column evidence: attribute / column names mentioned in the code that runs.
    const joined = acc.texts.join("\n");
    const tables: Record<string, string[]> = {};
    for (const t of acc.tables) {
      const mi = modelByTable.get(t);
      const cols = new Set<string>();
      if (mi) {
        for (const [col, attr] of Object.entries(mi.columns)) {
          if (new RegExp(String.raw`\b${escapeRe(attr)}\b`).test(joined)) cols.add(col);
        }
      }
      tables[t] = [...cols].sort();
    }

    for (const prefix of prefixes) {
      endpoints.push({ app, method: r.method, path: joinPath(prefix, r.localPath), tables });
    }
  }
}

// --- frontends --------------------------------------------------------------

interface ScreenOut {
  app: App;
  route: string;
  file: string;
}
const screens: ScreenOut[] = [];
const endpointScreens: Record<number, [number, number][]> = {};

for (const app of ["staff", "customer"] as App[]) {
  const code = frontend(app);
  if (!code) continue;
  const appEndpoints = endpoints.map((e, i) => ({ e, i })).filter(({ e }) => e.app === app);
  const beSegs = appEndpoints.map(({ e, i }) => ({ i, segs: normalizePath(e.path) || [] }));

  // 1. endpoint definitions: NAME = "v1/..", NAME = (..) => `v1/..`, prop: "v1/..", prop: NAME
  const defs = new Map<string, string>(); // name -> raw path
  const aliases = new Map<string, string>(); // obj.prop or prop -> NAME
  for (const [, text] of code.files) {
    for (const m of text.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:\([^)]*\)\s*(?::\s*\w+\s*)?=>\s*)?(['"`])([^'"`]*v1\/[^'"`]*)\2/g)) defs.set(m[1], m[3]);
    let currentObj: string | null = null;
    for (const line of text.split(/\r?\n/)) {
      const obj = line.match(/(?:export\s+)?const\s+(\w+)\s*(?::[^=]+)?=\s*\{\s*$/);
      if (obj) currentObj = obj[1];
      const prop = line.match(/^\s*(\w+)\s*:\s*(?:\([^)]*\)\s*=>\s*)?(['"`])([^'"`]*v1\/[^'"`]*)\2/);
      if (prop) {
        if (currentObj) defs.set(`${currentObj}.${prop[1]}`, prop[3]);
      }
      const alias = line.match(/^\s*(\w+)\s*:\s*([A-Z][A-Z0-9_]+)\s*,?\s*$/);
      if (alias && currentObj) aliases.set(`${currentObj}.${alias[1]}`, alias[2]);
      if (/^\s*\}\s*;?\s*$/.test(line)) currentObj = null;
    }
  }
  for (const [a, target] of aliases) if (defs.has(target)) defs.set(a, defs.get(target)!);

  // Constants composed from other constants: const X = `${BASE}/thing`
  const substitute = (tpl: string) =>
    tpl.replace(/\$\{\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*\}/g, (whole, name: string) => defs.get(name) ?? whole);
  for (let pass = 0; pass < 3; pass++) {
    for (const [, text] of code.files) {
      for (const m of text.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:\([^)]*\)\s*(?::\s*\w+\s*)?=>\s*)?`([^`]*\$\{[^`]*)`/g)) {
        const resolved = substitute(m[2]);
        if (resolved.includes("v1/")) defs.set(m[1], resolved);
      }
    }
  }

  const endpointsForRaw = (raw: string): number[] => {
    const segs = normalizePath(raw);
    if (!segs) return [];
    return beSegs.filter((b) => matchSegments(segs, b.segs)).map((b) => b.i);
  };
  const defEndpoints = new Map<string, number[]>();
  for (const [name, raw] of defs) defEndpoints.set(name, endpointsForRaw(raw));

  // 2. where each endpoint is referenced, at the level of the exported
  //    symbol (hook / component / function) that contains the reference.
  //    Definitions in constants files don't count as calls.
  const exportsOf = (text: string) => {
    const list: { name: string; index: number; isDefault: boolean }[] = [];
    for (const m of text.matchAll(/export\s+(default\s+)?(?:async\s+)?(?:const|let|function|class)\s+(\w+)/g)) {
      list.push({ name: m[2], index: m.index ?? 0, isDefault: !!m[1] });
    }
    return list;
  };
  const exportCache = new Map<string, ReturnType<typeof exportsOf>>();
  const exportsFor = (file: string) => {
    if (!exportCache.has(file)) exportCache.set(file, exportsOf(code.files.get(file) || ""));
    return exportCache.get(file)!;
  };
  // Enclosing exported symbol of a position, or null for module-level code.
  const enclosing = (file: string, index: number): string | null => {
    let name: string | null = null;
    for (const e of exportsFor(file)) {
      if (e.index > index) break;
      name = e.name;
    }
    return name;
  };
  const defaultExportName = (file: string) => {
    const text = code.files.get(file) || "";
    return (
      exportsFor(file).find((e) => e.isDefault)?.name ??
      text.match(/export\s+default\s+(\w+)\s*;?\s*$/m)?.[1] ??
      null
    );
  };

  // node key = file|symbol ("" = whole module)
  const starts = new Map<string, Set<number>>();
  const addStart = (file: string, symbol: string | null, ep: number) => {
    const key = `${file}|${symbol ?? ""}`;
    if (!starts.has(key)) starts.set(key, new Set());
    starts.get(key)!.add(ep);
  };

  for (const [file, text] of code.files) {
    if (/[\\/]constants[\\/]/.test(file)) continue;
    for (const m of text.matchAll(API_STR)) {
      for (const i of endpointsForRaw(m[2])) addStart(file, enclosing(file, m.index ?? 0), i);
    }
    for (const m of text.matchAll(/`([^`]*\$\{[^`]*)`/g)) {
      const resolved = substitute(m[1]);
      if (resolved === m[1] || !resolved.includes("v1/")) continue;
      for (const i of endpointsForRaw(resolved)) addStart(file, enclosing(file, m.index ?? 0), i);
    }
    for (const [name, eps] of defEndpoints) {
      if (!eps.length || !text.includes(name)) continue;
      const re = new RegExp(String.raw`\b${escapeRe(name)}\b`, "g");
      for (const m of text.matchAll(re)) {
        const sym = enclosing(file, m.index ?? 0);
        for (const i of eps) addStart(file, sym, i);
      }
    }
  }

  // 3. pages, and a reverse walk symbol-by-symbol from each reference to pages
  const pageIdx = new Map<string, number>();
  for (const file of code.files.keys()) {
    if (!/[\\/]app[\\/]/.test(file) || !/[\\/]page\.(tsx|jsx|ts|js)$/.test(file)) continue;
    pageIdx.set(file, screens.length);
    screens.push({ app, route: pageRoute(code.repo.src, file), file: path.relative(code.repo.src, file).replace(/\\/g, "/") });
  }

  // Which importer code uses `symbol` of `file`, and inside which of the
  // importer's own exports.
  const usersOf = (file: string, symbol: string | null): { file: string; symbol: string | null }[] => {
    const out: { file: string; symbol: string | null }[] = [];
    const isDefault = symbol !== null && symbol === defaultExportName(file);
    for (const imp of code.importers.get(file) || []) {
      const text = code.files.get(imp) || "";
      const locals = [...(code.named.get(imp) || new Map<string, string>())]
        .filter(([, target]) => target === file)
        .map(([local]) => local);
      // whole-module reference, or a default export imported under any name
      const names = symbol === null ? locals : locals.filter((l) => l === symbol || (isDefault && !exportsFor(file).some((e) => e.name === l && !e.isDefault)));
      if (!names.length) continue;
      for (const local of names) {
        const re = new RegExp(String.raw`\b${escapeRe(local)}\b`, "g");
        let used = false;
        for (const m of text.matchAll(re)) {
          const before = text.slice(Math.max(0, (m.index ?? 0) - 200), m.index ?? 0);
          if (/import[^;]*$/.test(before) && !/;\s*$/.test(before)) continue; // the import line itself
          used = true;
          out.push({ file: imp, symbol: enclosing(imp, m.index ?? 0) });
        }
        if (!used) out.push({ file: imp, symbol: null });
      }
    }
    return out;
  };

  for (const [key, eps] of starts) {
    const [startFile, startSym] = key.split("|");
    const dist = new Map<string, number>([[key, 0]]);
    let frontier = [{ file: startFile, symbol: startSym || null }];
    for (let d = 1; d <= 7 && frontier.length; d++) {
      const next: { file: string; symbol: string | null }[] = [];
      for (const node of frontier) {
        for (const u of usersOf(node.file, node.symbol)) {
          const k = `${u.file}|${u.symbol ?? ""}`;
          if (dist.has(k)) continue;
          dist.set(k, d);
          next.push(u);
        }
      }
      frontier = next;
    }
    for (const [k, d] of dist) {
      const si = pageIdx.get(k.split("|")[0]);
      if (si === undefined) continue;
      for (const ei of eps) {
        const list = (endpointScreens[ei] ||= []);
        const existing = list.find(([s]) => s === si);
        if (!existing) list.push([si, d]);
        else if (d < existing[1]) existing[1] = d;
      }
    }
  }
}

const index = {
  generatedAt: new Date().toISOString(),
  repos: codes.map((c) => `${c.repo.app}-${c.repo.kind} (${c.files.size} files)`),
  missing,
  models: models.map((m) => ({
    app: m.app,
    className: m.className,
    table: m.table,
    file: path.relative(backend(m.app)!.repo.src, m.file).replace(/\\/g, "/"),
    columns: m.columns,
  })),
  endpoints,
  screens,
  endpointScreens,
};

const json = JSON.stringify(index);
writeFileSync(
  OUTPUT,
  `// GENERATED by src/scripts/generate-schema-impact-index.ts — do not edit by hand.
// Re-run \`npm run schema-usage:scan\` after changing routes, models or screens
// in any of the four C2C repos. Scanned: ${index.repos.join(", ")}.
/* eslint-disable */

export const SCHEMA_IMPACT_INDEX_JSON = ${JSON.stringify(json)};
`,
);

const linked = Object.keys(endpointScreens).length;
console.log(
  `✅ Impact index: ${models.length} models, ${endpoints.length} endpoints (${linked} linked to screens), ${screens.length} screens → ${path.relative(ROOT, OUTPUT)}`,
);
if (missing.length) console.warn(`⚠️  Not found, skipped: ${missing.join("; ")}`);
