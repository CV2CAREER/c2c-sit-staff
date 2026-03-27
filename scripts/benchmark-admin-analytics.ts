import { performance } from "perf_hooks";
import dotenv from "dotenv";
import { ensureAnalyticsIndexes } from "../src/services/admin/analytics.index-bootstrap.service";
import {
  AnalyticsResponse,
  analyticsApplicationService,
} from "../src/services/admin/analytics.application.service";
import { getSequelize } from "../src/utils/sequelize";

dotenv.config();

interface CliOptions {
  from: string;
  to: string;
  iterations: number;
  warmup: number;
  ensureIndexes: boolean;
  explain: boolean;
}

interface LatencySummary {
  averageMs: number;
  minMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  totalMs: number;
  throughputRps: number;
}

const DEFAULT_LOOKBACK_DAYS = 30;

const getArgValue = (name: string): string | undefined => {
  const args = process.argv.slice(2);
  const index = args.indexOf(`--${name}`);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
};

const hasFlag = (name: string): boolean =>
  process.argv.slice(2).includes(`--${name}`);

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const percentile = (sorted: number[], ratio: number): number => {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.floor((sorted.length - 1) * ratio);
  return sorted[index];
};

const summarize = (durationsMs: number[]): LatencySummary => {
  const sorted = [...durationsMs].sort((a, b) => a - b);
  const totalMs = durationsMs.reduce((acc, value) => acc + value, 0);
  const averageMs = durationsMs.length ? totalMs / durationsMs.length : 0;

  return {
    averageMs,
    minMs: sorted[0] ?? 0,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    maxMs: sorted[sorted.length - 1] ?? 0,
    totalMs,
    throughputRps: totalMs > 0 ? (durationsMs.length * 1000) / totalMs : 0,
  };
};

const format = (value: number): string => value.toFixed(2);

const parseOptions = (): CliOptions => {
  const defaultTo = new Date();
  const defaultFrom = new Date(
    defaultTo.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  );

  return {
    from: getArgValue("from") ?? defaultFrom.toISOString(),
    to: getArgValue("to") ?? defaultTo.toISOString(),
    iterations: toPositiveInt(getArgValue("iterations"), 20),
    warmup: toPositiveInt(getArgValue("warmup"), 3),
    ensureIndexes: !hasFlag("skip-indexes"),
    explain: hasFlag("explain"),
  };
};

const runWindow = async (
  options: CliOptions,
  bypassCache: boolean,
): Promise<{ timings: number[]; response: AnalyticsResponse }> => {
  const timings: number[] = [];
  let lastResponse: AnalyticsResponse | null = null;

  for (let i = 0; i < options.warmup; i += 1) {
    await analyticsApplicationService.getSuccessfulVsFailedMetrics({
      from: options.from,
      to: options.to,
      bypassCache,
    });
  }

  for (let i = 0; i < options.iterations; i += 1) {
    const started = performance.now();
    lastResponse = await analyticsApplicationService.getSuccessfulVsFailedMetrics({
      from: options.from,
      to: options.to,
      bypassCache,
    });
    const ended = performance.now();
    timings.push(ended - started);
  }

  return { timings, response: lastResponse as AnalyticsResponse };
};

const printSummary = (title: string, summary: LatencySummary) => {
  console.log(`\n${title}`);
  console.log(`  avg: ${format(summary.averageMs)} ms`);
  console.log(`  min: ${format(summary.minMs)} ms`);
  console.log(`  p50: ${format(summary.p50Ms)} ms`);
  console.log(`  p95: ${format(summary.p95Ms)} ms`);
  console.log(`  max: ${format(summary.maxMs)} ms`);
  console.log(`  total: ${format(summary.totalMs)} ms`);
  console.log(`  throughput: ${format(summary.throughputRps)} req/s`);
};

const run = async () => {
  const options = parseOptions();
  const sequelize = getSequelize();

  await sequelize.authenticate();

  if (options.ensureIndexes) {
    await ensureAnalyticsIndexes();
  }

  console.log("Admin analytics benchmark");
  console.log(`  from: ${options.from}`);
  console.log(`  to: ${options.to}`);
  console.log(`  warmup: ${options.warmup}`);
  console.log(`  iterations: ${options.iterations}`);
  console.log(`  ensureIndexes: ${options.ensureIndexes}`);

  const cold = await runWindow(options, true);
  printSummary("No-cache run", summarize(cold.timings));

  const cached = await runWindow(options, false);
  printSummary("Cached run", summarize(cached.timings));

  console.log("\nMetrics sample");
  console.log(
    `  successful: ${cached.response.metrics.successful}, failed: ${cached.response.metrics.failed}`,
  );
  console.log(`  sources: ${Object.keys(cached.response.breakdown).join(", ")}`);

  if (options.explain) {
    const explainPlan =
      await analyticsApplicationService.explainSuccessfulVsFailedMetrics({
        from: options.from,
        to: options.to,
      });

    console.log("\nEXPLAIN (ANALYZE, BUFFERS)");
    for (const line of explainPlan) {
      console.log(`  ${line}`);
    }
  }

  await sequelize.close();
};

run().catch(async (error: any) => {
  console.error("Benchmark failed:", error?.message || error);
  try {
    const sequelize = getSequelize();
    await sequelize.close();
  } catch (_) {
    // Ignore close failures on benchmark exits.
  }
  process.exit(1);
});

