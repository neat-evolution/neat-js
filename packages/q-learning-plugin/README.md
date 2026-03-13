# @neat-evolution/q-learning-plugin

Evaluation plugin that trains genomes via Q-learning (DQN-style) during
evolutionary evaluation. Wraps `@neat-evolution/q-learning` with plugin
lifecycle, Lamarckian writeback, and worker dispatch.

## How It Works

`QLPlugin` implements the `EvaluationPlugin` interface with `mode: 'augmentation'`.
It constructs a Q-learning agent per genome and hands it to the environment's
`evaluateAgent(agent)` method. The agent owns action selection, transition
capture, and gradient updates — the plugin handles everything around it:

1. **Agent construction.** Creates a `TrainableExecutor` from the genome's
   phenotype and passes it to `createQLAgent` with the configured epsilon
   schedule and rollout settings.
2. **Direct evaluation.** If the environment implements `AgentEnvironment`, the
   plugin calls `evaluateAgent(agent)` directly. Otherwise it falls back to the
   default evaluation path with context hooks forwarding rewards and lifecycle
   events.
3. **Lamarckian writeback.** After evaluation, trained weights are written back
   to the genome (configurable via `isLamarckian`, default `true`).
4. **Worker dispatch.** When `context.supportsTraining` is true, the plugin
   validates worker RL capabilities and dispatches evaluation to a worker thread
   that runs the same agent contract locally.

## Configuration

```ts
import { QLPlugin } from '@neat-evolution/q-learning-plugin'

const plugin = new QLPlugin(algorithm, {
  // Training
  learningRate: 0.01,
  discountFactor: 0.99,        // overrides environment's RLConfig if set

  // Epsilon-greedy exploration
  epsilonInitial: 0.3,         // starting epsilon per genome evaluation
  epsilonDecayPerEpisode: 0.95, // multiplicative decay after each episode
  epsilonMinimum: 0.01,        // floor for epsilon

  // Action space
  multiDiscrete: false,        // true for independent binary factors (2N outputs)

  // Rollout capture
  rolloutLength: 32,           // or 'episode' for full-episode capture
  minRolloutLength: 4,         // minimum transitions before capture fires
  rewardThreshold: 0.1,        // |reward| threshold for event-triggered capture

  // Writeback
  isLamarckian: true,          // write trained weights back to genome
})
```

### Epsilon Schedule

The epsilon-greedy schedule controls the exploration–exploitation tradeoff
during each genome's evaluation:

| Parameter | Default | Behavior |
| --- | --- | --- |
| `epsilonInitial` | *(required)* | Applied at the start of each genome evaluation. Resets for every genome. |
| `epsilonDecayPerEpisode` | `1.0` | Multiplied into epsilon after each completed episode (first episode uses `epsilonInitial` undecayed). |
| `epsilonMinimum` | `0.01` | Epsilon never drops below this floor. |

The schedule resets per genome evaluation — there is no cross-genome epsilon
state. Within a multi-episode gauntlet, early episodes explore more while later
episodes exploit learned Q-values.

### Multi-Discrete Mode

When `multiDiscrete: true`, the network produces 2N outputs for N binary action
factors (each pair is `[Q_on, Q_off]`). Each factor runs independent
epsilon-greedy selection.

**Limitation:** all factors share the same scalar reward. There is no per-factor
credit assignment. This is an explicit simplification — every factor's TD target
is derived from the same global reward signal. The approximation works for
loosely coupled factors but does not distinguish which factor caused a given
outcome. See the `@neat-evolution/q-learning` README for details.

## Context Hooks

The plugin provides `getContextHooks()` for environments that cannot hand an
agent handle directly. The hooks forward `reward`, `episodeStart`, `episodeEnd`,
and `transitionInfo` to the active agent. This is a partial integration path —
hooks never call `act()`, so no transitions are recorded through hooks alone.
Direct `evaluateAgent()` is the complete RL path.

## Worker Evaluation

When `context.supportsTraining` is true, the plugin validates that the worker
reports Q-learning capability (and Lamarckian support if configured) before
dispatching. The worker runs the same `evaluateAgent(agent)` contract locally
and returns fitness plus optional updated weights.

## License

MIT — see [LICENSE](../../LICENSE).
