# Package organization

These notes are based on the current code shape in:

- `@neat-evolution/environment`
- `@neat-evolution/executor`
- `@neat-evolution/backprop-strategy`
- `@neat-evolution/actor-critic`
- `@neat-evolution/q-learning`

The immediate trigger is the circular dependency caused by `backprop-strategy` importing `Trainer` and related types from `@neat-evolution/environment`.

## Current shape

Today the packages roughly look like this:

- `environment`
  - environment contracts
  - supervised contracts (`SupervisedEnvironment`, `TrainingData`, `Trainer`, `TrainerFactory`)
  - episodic contracts (`EpisodicEnvironment`, `AgentEnvironment`, `EpisodicAgent`, `AgentFactory`)
  - runtime bridge (`WorkerEvaluationContext`, `EnvironmentRuntimeOptions`)
- `executor`
  - plain executor
  - backprop executor entry point via `executor/backprop`
- `backprop-strategy`
  - one supervised plugin: `createTrainer`
- `actor-critic`
  - algorithm
  - environment plugin entry point via `./plugin`
- `q-learning`
  - algorithm
  - environment plugin entry point via `./plugin`

This is already telling a story:

- `executor/backprop` is not "an algorithm", it is an executor capability.
- `actor-critic/plugin` and `q-learning/plugin` are not environments, they are execution managers that integrate with environments.
- `backprop-strategy` is not really "a strategy package" in the same sense as AC or QL. It is the supervised counterpart to those plugins.

So the circular dependency is a symptom, not the real problem. The real problem is that the "execution manager" concept exists in the code, but not as a first-class architectural home.

## The missing first-class concept

There are now three different things in play:

1. The environment defines the task and computes fitness.
2. The executor performs forward/backward computation.
3. A manager sits between them and decides how the executor is exercised during evaluation.

That third thing already exists in two forms:

- `EpisodicAgent`
- `Trainer`

Those are not two unrelated ideas. They are two specializations of the same broader role:

- vanilla manager: just forward the executor
- supervised manager: train against a dataset, then evaluate
- episodic manager: run policy/value updates during environment interaction

The current package layout makes that role look incidental. It is not incidental anymore.

## Recommendation

Promote "execution manager" to a stable family, and stop treating supervised backprop as an odd add-on.

I would lean toward adopting this direction in this repo rather than treating it as a tentative cleanup. The current code is already converging on it:

- episodic environments already consume a bound agent factory shape
- `executor/backprop` already establishes the "feature as subpath on the owning package" pattern
- `WorkerEvaluationContext` already gives managers a stable runtime bridge

What is missing is not a new idea. It is mostly package ownership and one normalization pass across supervised and episodic flows.

The most coherent long-term shape is:

- `@neat-evolution/environment`
  - task contracts only
  - environment lifecycle/runtime hooks only
  - no trainer/agent concrete taxonomy
- `@neat-evolution/executor`
  - executor contracts
  - `./backprop`
  - later, algorithm-specific distillation helpers exposed as subpaths
- `@neat-evolution/execution-manager`
  - shared manager contracts
  - `Agent`, `Trainer`, or a renamed unified abstraction
  - factory contracts
  - shared plugin/runtime bridge types
  - default manager implementations
  - `./backprop` subpath for generic supervised backprop managers
- `@neat-evolution/actor-critic`
  - AC algorithm + AC manager plugin
- `@neat-evolution/q-learning`
  - QL algorithm + QL manager plugin

This separates the axes cleanly:

- environment package = task model
- executor package = phenotype execution model
- execution-manager family = how evaluation drives the executor
- algorithm packages = concrete manager implementations

## Why not leave `Trainer` in `environment`?

Because `Trainer` is not an environment concern.

`DatasetEnvironment` currently consumes `createTrainer`, but that is an integration detail, not a core environment primitive. The same thing is already obvious on the episodic side:

- `BanditEnvironment` is better because it depends on `createAgent` through runtime options.
- the environment owns the loop and fitness
- the agent owns how the executor is driven inside the loop

That is the correct separation.

If `Trainer` stays in `environment`, every new manager-oriented feature keeps wanting to reach back into `environment` just to get type ownership. That will continue to create awkward dependency arrows and conceptual drift.

## Why not put everything under `backprop`?

Because backprop is better treated as a flavor, not as the top-level owner.

The cleaner rule is:

- backprop executor capability lives at `executor/backprop`
- backprop supervised manager lives at `execution-manager/backprop`
- algorithm-specific writeback/distillation lives at `neat/backprop`, `cppn/backprop`, `hyperneat/backprop`, etc.

That keeps ownership aligned with the thing being flavored.

It also avoids creating a vague umbrella package that would eventually turn into a junk drawer.

## Recommended package map

### Near term

Add one small package for contracts:

- `@neat-evolution/execution-manager`

Move these there:

- `Trainer`
- `TrainerFactory`
- `TrainerFactoryOptions`
- `EpisodicAgent`
- `AgentFactory`
- `AgentFactoryOptions`

Keep these in `environment`:

- `SupervisedEnvironment`
- `TrainingData`
- `LossConfig`
- `EpisodicEnvironment`
- `AgentEnvironment` or a renamed environment-side episodic runner contract
- `EnvironmentRuntimeOptions`
- `WorkerEvaluationContext`

Then:

- `backprop-strategy` can depend on `execution-manager` + `environment` + `executor`
- `actor-critic` and `q-learning` can depend on `execution-manager` + `environment` + `executor`
- `environment` no longer needs to own manager types

This is the smallest change that fixes the circular dependency in the right direction.

### Medium term

Retire `backprop-strategy` as a standalone package and move the generic supervised backprop trainer under:

- `@neat-evolution/execution-manager/backprop`

Suggested ownership:

- `@neat-evolution/execution-manager`
  - contracts
  - default vanilla managers
- `@neat-evolution/execution-manager/backprop`
  - `createTrainer`
  - generic supervised backprop manager helpers

This gives you the same "alternate entry point" pattern that already works well in `executor/backprop`, but without inventing a separate umbrella package.

### Long term

Introduce algorithm-family subpaths where the executor-specific weight writeback logic belongs:

- `@neat-evolution/neat/backprop`
- `@neat-evolution/cppn/backprop`
- `@neat-evolution/hyperneat/backprop`

That keeps distillation with the algorithm family that actually understands the genome/phenotype mapping.

This matters because HyperNEAT-style writeback is not a generic backprop concern. It is algorithm-specific phenotype-to-genome reconciliation.

## Concrete migration path

### Step 1

Create `@neat-evolution/execution-manager` and move only contract types there.

Do not unify names yet. Just move ownership.

### Step 2

Update `environment` to depend on manager contracts, not define them.

This is where the circular dependency goes away.

### Step 3

Move `backprop-strategy` into `@neat-evolution/execution-manager/backprop`.

You can keep `backprop-strategy` as a short-term compatibility re-export while the API settles, but it should not remain the long-term home.

### Step 4

Shift environments to always outsource execution management.

That means:

- `DatasetEnvironment` should stop owning an implicit trainer path
- episodic environments should continue using injected managers
- vanilla behavior should be represented by default manager implementations, not by special-case environment code

### Step 5

Move writeback/distillation ownership toward algorithm families.

Backprop managers can request writeback. Algorithm packages should own how writeback is performed.

## Decision summary

If the goal is a durable architecture, I would not create standalone `@neat-evolution/trainer`, `@neat-evolution/agent`, or `@neat-evolution/backprop` packages.

That splits one family into two tiny packages too early.

I would do this instead:

- create `@neat-evolution/execution-manager` now
- keep `agent` and `trainer` as concepts inside that package
- expose generic supervised backprop as `@neat-evolution/execution-manager/backprop`
- keep `executor/backprop` as the executor capability entry point
- let algorithm families eventually expose their own backprop/distillation tooling

That gives you:

- more packages where package boundaries are real
- fewer packages where the split would be arbitrary
- a clean story for users

The clean user-facing story becomes:

1. Pick or build an environment.
2. Pick an executor family.
3. Pick an execution manager plugin.
4. Pick writeback behavior.
5. Run evolution.

That is a much more stable model than "sometimes environment owns training, sometimes plugin owns training, sometimes executor owns backprop."
