# Execution manager assembly

This note is separate from `package-organization.md` on purpose.

The package decision is clear enough to act on now:

- create `@neat-evolution/execution-manager`
- move manager contracts there
- expose generic supervised backprop as `@neat-evolution/execution-manager/backprop`

The ideas in this note are a possible next step for runtime assembly and integration. They are worth keeping, but they should be treated as a proposal rather than part of the immediate package move.

## Why this came up

There is a real tension in the current design:

- the environment owns evaluation and returns fitness
- the execution manager owns how the executor is exercised

That makes it easy to feel like one side should "own" the other.

This note argues for a third option:

- evaluator/runtime code assembles the manager
- environment consumes a bound integration hook
- neither environment nor manager needs to directly own the other

## What seems correct already

A few things are already pointing in the right direction:

- `environment.evaluate(executor)` is still the correct high-level contract for this repo
- episodic environments already consume a factory-style integration point
- `WorkerEvaluationContext` belongs to evaluator/worker runtime infrastructure more than to environment semantics

So this is not a proposal to invert the architecture and make the manager run the environment.

It is a proposal to move manager assembly out of the environment.

## Core idea

Evaluation is the primary operation.

Execution is one side-effectful part of how an environment arrives at a fitness score.

That suggests this split:

- environment owns experiment lifecycle
- execution manager owns executor-driving policy
- evaluator/runtime owns assembly and binding

The connection point can be a bound callback or bound factory.

## Current-repo-shaped proposal

This should be read as a recommendation in the style of the current repo, not as a description of existing API.

Conceptually:

```ts
// Proposal in the style of the current repo, not a copied implementation.
const manager = createExecutionManager(managerPathname, managerOptions, context)

environment.setRuntimeOptions({
  createAgent: manager.createAgent.bind(manager),
})
```

And on the supervised side:

```ts
// Proposal in the style of the current repo, not a copied implementation.
const manager = createExecutionManager(managerPathname, managerOptions, context)

environment.setRuntimeOptions({
  createTrainer: manager.createTrainer.bind(manager),
})
```

The point is not the exact function name. `createExecutionManager` may or may not be useful.

The point is that:

- manager gets built once with runtime services
- environment receives only the narrow hook it needs
- environment does not need to carry the raw evaluation context

## Why this may be useful

This can improve the current shape in a few ways:

- keeps `WorkerEvaluationContext` closer to evaluator/worker code
- reduces environment exposure to runtime plumbing
- preserves `environment.evaluate(executor)` as the main evaluation contract
- makes the environment/manager boundary narrower and easier to reason about

## Why this should be tabled for now

There is also a good reason not to push this immediately.

Each environment still expects a manager with a different shape:

- supervised uses trainer-style behavior
- episodic uses agent-style behavior

Those contracts are related, but they are not interchangeable yet.

So while a generic `createExecutionManager` might eventually be useful, it is not necessary to justify the package move.

The repo already has enough evidence that the package split is correct without forcing this extra abstraction now.

## Practical near-term stance

For now:

- keep the package work focused on moving manager ownership into `@neat-evolution/execution-manager`
- keep `environment.evaluate(executor)` as the core contract
- keep `createAgent` and `createTrainer` as the concrete environment integration points
- treat generic manager assembly as a later refinement

That is enough to solve the circular dependency and clarify ownership without overdesigning the runtime layer.
