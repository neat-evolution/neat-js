# Profiling `@neat-evolution/demo`

This is the current guide for the demo profiler workflow used to tune ES-HyperNEAT worker performance.

## Goals

1. Find high-impact worker bottlenecks quickly (distinct functions, not noisy duplicate call paths).
2. Track CPU and memory behavior across repeated runs.
3. Compare against a valid baseline with matching run configuration.

## Main Command

```bash
yarn workspace @neat-evolution/demo profile -- \
  --iterations 200 \
  --secondsLimit 30 \
  --memorySampleMs 500 \
  --runs 5
```

## Stable Baseline Workflow

Use these package scripts for repeatable method-specific loops:

```bash
# 1) Establish or refresh locked baseline (10 runs, fixed config)
yarn workspace @neat-evolution/demo profile:baseline:es-hyperneat

# 2) Compare current code to that exact baseline (same config, 10 runs)
yarn workspace @neat-evolution/demo profile:compare:es-hyperneat

# 3) HyperNEAT baseline + compare
yarn workspace @neat-evolution/demo profile:baseline:hyperneat
yarn workspace @neat-evolution/demo profile:compare:hyperneat
```

Baseline folder used by these scripts:
- `baseline-es-hyperneat-r10-i200-s30-t1-k100-ms500`
- `baseline-hyperneat-r10-i200-s30-t1-k100-ms500`

The compare script always pins `--baseline` to that folder and keeps `runCount`/config aligned, so deltas remain meaningful.
Both scripts run with `--quiet-training` to suppress noisy training logs.

## What `profile` does

`packages/demo/scripts/profile.js` runs in phases for each run:

1. Collect CPU profile (`--cpu-prof`) plus memory summary from the profile target script.
2. Analyze profile into a JSON summary.
3. Aggregate all runs into one multi-run summary.
4. Print a compact console report focused on actionable hotspots.

Console phase logs are explicit:
- `collecting profile (...)`
- `analyzing profile (...)`

Per-phase timeouts are enforced so runs fail loudly instead of appearing frozen.

## Artifact layout

Each profiling invocation writes one folder under:
- `packages/demo/.artifacts/cpuprofiles/<run-name>/`

For multi-run (`--runs > 1`):
- `run-001/profile.cpuprofile`
- `run-001/memory.json`
- `run-001/summary.json`
- `run-001/workers/*`
- ...
- top-level aggregate: `summary.json`

For single-run (`--runs 1`):
- artifacts are written directly in the run folder.

## Important CLI options

- `--runs <n>`: number of profiling runs to average (default: `5`).
- `--name <folder-name>`: explicit artifact folder name.
- `--output-dir <dir>`: artifact root (default: `.artifacts/cpuprofiles`).
- `--baseline <folder-name>`: compare against this specific prior artifact folder.
- `--quiet-training`: silence training logs from the demo run (default when using `profile.js`).
- `--verbose-training`: show training logs (overrides quiet mode).
- `--target-timeout-ms <ms>`: timeout for profile collection phase.
- `--analyze-timeout-ms <ms>`: timeout for profile analysis phase.

All other args are passed through to the demo/profile target (for example `--method`, `--iterations`, `--secondsLimit`, `--threadCount`, `--taskCount`, `--memorySampleMs`).

## Baseline comparison rules

Default behavior (no `--baseline`):
- automatically picks the most recent prior summary with matching config.

Pinned behavior (`--baseline <folder>`):
- uses exactly that folder if valid.

A baseline is only valid when:
1. It is a multi-run aggregate summary.
2. `runCount` matches.
3. Config keys match exactly:
   - `method`
   - `iterations`
   - `secondsLimit`
   - `threadCount`
   - `taskCount`
   - `memorySampleMs`

If invalid, the script prints a clear reason (for example config mismatch or missing baseline).

## Report semantics

### Metrics table
- Main CPU ms
- Worker CPU ms
- Memory delta RSS MB
- Memory delta HeapUsed MB

Includes mean/median/trimmed-mean/stddev/CV/min/max and stability indicators.

### Bottlenecks table

Printed as **Top bottleneck functions** (function-first aggregation):
- each function appears once
- contexts are merged
- top context preview is shown as `... and N others`

This intentionally de-emphasizes stack containers and highlights distinct functions to fix.

## Memory sampling note

`--memorySampleMs` controls sampling cadence (for example `500` means every 500ms).  
This is good for trend detection and run-to-run comparison, but does not attribute memory pressure to specific functions by itself.

## Related microbenchmarks

For targeted function-level perf checks (outside full demo variance), use Vitest benchmarks in package tests, for example:

```bash
yarn workspace @neat-evolution/es-hyperneat vitest bench test/quadPointVariance.bench.ts --run
```

## Iteration Loop

1. Run compare command and identify the top actionable hotspot function.
2. Investigate path with profile summary plus focused microbench (if available).
3. Implement change.
4. Re-run compare command.
5. Keep change only if direction is favorable in hotspot + aggregate metrics.
