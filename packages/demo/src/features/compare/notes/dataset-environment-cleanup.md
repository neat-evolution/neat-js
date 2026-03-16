# DatasetEnvironment cleanup

Notes from reviewing the compare demo and `DatasetEnvironment.evaluate()`.

## Current behavior

`DatasetEnvironment.evaluate()` has a single branch that controls two separate concerns:

```typescript
evaluate(executor: StaticExecutor): number {
  if (this.runtimeOptions?.createTrainer != null) {
    // BACKPROP PATH: train on training split, fitness from validation split
    trainer.train(this.getTrainingData())
    return this.computeFitness(validationTargets, predictions)
  }
  // VANILLA PATH: no training, fitness from training split
  return this.fitness(this.dataset.trainingTargets, predictions)
}
```

The presence of a trainer implicitly determines:

1. Whether training happens (its actual job)
2. Which data split is used for fitness (not its job)

## Issues to address

### 1. Fitness split selection is implicit

Vanilla evaluates on the 120-sample training split. Backprop evaluates on the 15-sample validation split. These are different-sized pools producing different fitness scales — not directly comparable in the generation table.

The split choice is baked into the trainer null-check rather than being an explicit config. You can't currently:

- Use a trainer but evaluate on training data
- Skip training but evaluate on validation data
- Evaluate on a merged train+val pool for vanilla (to use all non-test data)

The demo sets `validationFraction: 0.1, testFraction: 0.1`, so vanilla gets 80% of the data for fitness while backprop only sees 10% for fitness. This is correct methodology (backprop needs held-out validation to avoid rewarding overfitting), but the coupling should be explicit.

### 2. `computeFitness` vs `fitness` inconsistency

The two branches call different methods that do the same thing:

- `this.computeFitness(targets, predictions)` — public, accepts `ReadonlyArray<number[] | Float64Array>`
- `this.fitness(targets, predictions)` — private, accepts `Matrix`

`computeFitness` just casts and delegates to `fitness`. Both branches should use the same method.

### 3. Naming the evaluation modes

The two paths represent distinct evaluation strategies that should be named:

- **Direct evaluation**: forward pass only, fitness from the data the network sees (training split). Used when the genome _is_ the model (vanilla NEAT).
- **Supervised evaluation**: train step + forward pass, fitness from held-out data (validation split). Used when the genome is a starting point for learning (backprop variants).

Making these explicit (e.g., as an enum or config flag on the environment) would decouple "has a trainer" from "which split to score on."

## Proposed cleanup

### DatasetEnvironment

1. Unify `computeFitness`/`fitness` — make `computeFitness` the single method, remove the private `fitness` or make it truly internal with consistent usage.
2. Consider an explicit evaluation mode (e.g., `evaluationMode: 'direct' | 'supervised'`) rather than inferring from trainer presence. This could default based on whether a trainer is configured, but be overridable.

### Compare demo

3. The demo is sound — it correctly uses different splits for different modes, and the test set evaluation at the bottom provides the fair comparison. The generation table fitness values are intentionally not comparable (noted in the header). No changes needed to the demo logic itself, just benefits from the environment cleanup.
