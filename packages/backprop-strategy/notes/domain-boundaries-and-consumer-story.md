# Domain boundaries and consumer story

These notes focus on whether the current concepts are composed cleanly, and how they should relate for users building custom environments and evaluation strategies.

## The current chain is basically right

The current runtime chain is:

- evaluator
- worker pool
- environment
- agent/trainer
- executor

That is a good chain.

The problem is not that the chain is wrong. The problem is that the contracts inside the chain are still uneven:

- episodic got a strong explicit contract
- supervised got a weaker, partly implicit contract
- vanilla still leaks through as a special case

So the architecture is directionally good, but not yet normalized.

## Real domain boundaries

There are three domains here, and they should stay distinct.

## 1. Environment domain

Environment owns:

- task definition
- observations/datasets
- reward and fitness semantics
- episode structure or dataset split semantics
- environment-specific lifecycle

Environment should not own:

- backprop loops
- RL update rules
- executor writeback policy
- algorithm-specific training heuristics

The environment's job is to say:

- "here is the task"
- "here is how interaction happens"
- "here is how fitness is computed"

Not:

- "here is how to train a policy/value network"

## 2. Executor domain

Executor owns:

- forward execution
- optional backward capability
- internal execution state needed to support training
- algorithm-specific phenotype mechanics

Executor should not own:

- episode rollouts
- dataset iteration policy
- reward bookkeeping
- validation split decisions

`executor/backprop` is a good pattern because it adds capability without turning executor into the owner of the whole training story.

That pattern should continue.

At this layer, backprop remains an executor capability:

- `@neat-evolution/executor/backprop`

## 3. Execution manager domain

This is the domain that currently needs to be named more clearly.

Execution manager owns:

- how the executor is exercised during evaluation
- when to call `forward`
- when to call `backward`
- what lifecycle hooks matter
- whether learning happens online, offline, or not at all
- whether learned state is written back

This includes:

- vanilla wrappers
- trainers
- episodic agents
- AC and QL plugins

Backprop belongs here when the concern is "how supervised evaluation drives the executor". That suggests an export like `@neat-evolution/execution-manager/backprop`.

This is the missing conceptual center of gravity.

## Where the bleed currently happens

### 1. `DatasetEnvironment` still has a built-in manager

Right now `DatasetEnvironment.evaluate()` does two jobs:

- selects the evaluation flow
- computes fitness

It has an implicit built-in vanilla trainer path:

- if `createTrainer` exists, use trainer flow
- otherwise, exercise executor directly

That means the environment is partly acting as an execution manager.

This is the main supervised-side bleed.

### 2. `createTrainer` is narrower and less explicit than `createAgent`

`EpisodicAgent` has a meaningful contract:

- `act`
- `reward`
- `startEpisode`
- `endEpisode`

`Trainer` only has:

- `train(data)`

That is enough for current backprop, but it is not enough as the supervised side gains more policy.

Examples of policy that do not obviously belong in `train(data)`:

- train/validation/test split decisions
- train-then-evaluate vs interleaved train/evaluate
- hooks for telemetry
- lifecycle around writeback timing

The thin trainer contract is pushing policy back into the environment.

### 3. vanilla is a mode, but still implemented as absence

In episodic flow, vanilla is a real default manager: `createVanillaAgent`.

In supervised flow, vanilla is currently "no trainer present."

That asymmetry makes the system harder to explain and forces parallel code paths.

Vanilla should be represented positively:

- default supervised manager
- default episodic manager

Not as missing configuration.

## What clean composition should look like

The environment and the manager should make an explicit contract, and the manager should always exist.

### Supervised

The supervised environment should provide:

- training data
- validation data
- loss/fitness semantics

The supervised manager should decide:

- whether to train
- how much to train
- what split to optimize on
- what split to score on
- whether to schedule writeback

That means `DatasetEnvironment` should stop deciding that "trainer present" implies validation scoring while "trainer absent" implies training scoring.

Those are manager policy choices.

### Episodic

The episodic environment already mostly does this correctly:

- environment owns the loop
- agent owns policy/training behavior inside the loop

The main thing to preserve is that the environment remains the source of reward, episode lifecycle, and final fitness.

### Cross-worker boundary

`WorkerEvaluationContext` is not architectural noise. It is the bridge that makes these manager plugins viable across the evaluator/worker divide.

It should remain a generic runtime bridge, not become backprop-specific.

It currently owns:

- RPC/messaging
- stats bridge
- writeback scheduling
- fitness lifecycle callback
- executor correlation

That is the right layer for those concerns.

## Recommended contract direction

I would move toward this model:

- environment defines the interaction surface
- manager implements the execution policy against that surface
- executor supplies capability
- evaluation context supplies cross-thread services

In practice that means making both supervised and episodic use injected managers all the time.

## Suggested contract shape

You do not need to fully unify `Agent` and `Trainer` yet, but they should rhyme more strongly.

At the moment, this repo already has concrete integration points:

- `createAgent` on the episodic side
- `createTrainer` on the supervised side
- `EnvironmentRuntimeOptions` as the place where those are injected into environments

So the near-term recommendation is not "replace everything with brand new manager objects."

It is:

- move ownership of these contracts out of `environment`
- make supervised use the same always-present manager pattern that episodic already uses
- keep the runtime integration looking like this repo's existing factory injection pattern

### Current-style recommendation

If we stay close to the current repo shape, the recommendation is:

- episodic environments keep consuming `createAgent`
- supervised environments start always consuming `createTrainer`
- vanilla becomes the default implementation instead of the absence of one

That means the repo can continue to use patterns like:

```ts
const agentFactory = runtimeOptions.createAgent ?? createVanillaAgent
const agent = agentFactory(executor, agentFactoryOptions, evaluationContext)
```

and should move supervised toward the equivalent:

```ts
const trainerFactory = runtimeOptions.createTrainer ?? createVanillaTrainer
const trainer = trainerFactory(
  executor,
  trainerFactoryOptions,
  evaluationContext
)
```

Those examples are intentionally written in the style of the current repo. They are recommendations for where supervised should go, not descriptions of a fully existing API today.

### Longer-term proposal

If you later want a more explicit manager abstraction, that would be a proposal rather than a description of current code.

For example, pseudocode:

```ts
// Pseudocode only. This is a proposal, not the current repo API.
interface SupervisedManager {
  evaluate(environment: SupervisedEnvironment): number
}
```

Or:

```ts
// Pseudocode only. This is a proposal, not the current repo API.
interface SupervisedManagerFactory {
  create(executor: StaticExecutor): SupervisedManager
}
```

Those shapes would let the environment stop threading policy through null-checks, but they should be read as design direction, not as an implementation sketch to copy directly.

Even if you do not adopt that exact API, the important move is:

- manager owns the evaluation flow
- environment owns the task semantics

## Are the current concepts overreaching?

### Environment

Slightly overreaching on the supervised side.

### Executor

Mostly clean right now. `executor/backprop` is a good extension seam.

The future risk is putting too much algorithm-specific distillation inside generic executor code. That should be resisted.

### Agent/trainer plugins

These are under-scoped, not over-scoped.

They are doing important work, but the architecture still describes them as if they are optional add-ons rather than first-class execution managers.

## Consumer story

The user-facing story should be simple even though the runtime is sophisticated.

Today the system is close, but the explanation still sounds like "special cases plus plugins."

The story should become:

## A consumer builds four things

1. An environment
2. An executor family
3. An execution manager
4. An evolution manager/evaluator configuration

## 1. Environment

User defines the task.

Examples:

- supervised dataset environment
- episodic game environment
- custom simulation environment

The environment says what observations/data exist and how fitness is computed.

## 2. Executor family

User chooses how genomes become executable phenotypes.

Examples:

- NEAT executor
- backprop-capable executor
- HyperNEAT executor

This is where phenotype capability lives.

## 3. Execution manager

User chooses how that executor is driven during evaluation.

Examples:

- vanilla supervised manager
- backprop supervised manager
- actor-critic agent manager
- q-learning agent manager

This is where Darwinian vs Baldwinian vs Lamarckian policy belongs too.

At this layer, backprop is a manager flavor:

- `@neat-evolution/execution-manager/backprop`

## 4. Evolution/evaluator config

User wires the system into workers, runtime config, and project-specific integration.

This is where the evaluator and worker boundary concerns belong.

## The key simplification

Every environment should always use a manager plugin.

Sometimes the plugin is just a default vanilla one.

That removes parallel code paths from the mental model:

- no "trainer or no trainer" branch
- no hidden implicit manager in the environment
- no special explanation for vanilla

Just:

- environment + manager + executor

## Configuration story

A lot of configuration is fine if the slots are stable.

Users can tolerate config drilling if the composition model is consistent.

They will struggle more with parallel flows that look similar but have different hidden defaults.

So the configuration hierarchy should feel like:

- environment config
- executor config
- manager config
- evaluator/runtime config

Not:

- environment config that sometimes secretly controls manager behavior

## Practical recommendations

### 1. Normalize vanilla as a default manager everywhere

Create the supervised equivalent of `createVanillaAgent`.

Then environments always call a manager.

### 2. Make split/evaluation policy explicit

Train split vs validation split vs test split should be selected by configuration or manager policy, not by whether a trainer exists.

### 3. Keep writeback policy out of environments

Environment should never need to know whether the run is Lamarckian, Baldwinian, or Darwinian.

That is manager policy plus evaluator/writeback infrastructure.

### 4. Keep algorithm-specific distillation near the algorithm family

Especially for HyperNEAT.

Generic backprop code can request writeback, but should not own all writeback mechanics.

That implies exports like:

- `@neat-evolution/neat/backprop`
- `@neat-evolution/cppn/backprop`
- `@neat-evolution/hyperneat/backprop`

### 5. Treat `WorkerEvaluationContext` as a stable service boundary

Do not collapse it into environment or manager packages. It is the runtime bridge that keeps the rest decoupled.

## Bottom line

The architecture does not need a wholesale rewrite.

It needs one promotion:

- execution manager becomes a first-class domain

Once that happens:

- the circular dependency has an obvious fix
- supervised and episodic flows can be normalized
- vanilla becomes a default plugin instead of a parallel path
- the consumer story becomes coherent

The system already has the right bones. The remaining work is mostly to move ownership and remove a few implicit branches that currently make supervised evaluation feel special-cased.
