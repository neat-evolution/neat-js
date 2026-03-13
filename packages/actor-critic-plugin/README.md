# @neat-evolution/actor-critic-plugin

Evaluation plugin that trains genomes via Actor-Critic (A2C-style) during
evolutionary evaluation. Wraps `@neat-evolution/actor-critic` with plugin
lifecycle, telemetry, Lamarckian writeback, and worker dispatch.

## How It Works

`ACPlugin` implements the `EvaluationPlugin` interface with `mode: 'augmentation'`.
It constructs an Actor-Critic agent per genome and hands it to the environment's
`evaluateAgent(agent)` method. The agent owns action selection, transition
capture, and gradient updates — the plugin handles everything around it:

1. **Agent construction.** Creates a `TrainableExecutor` from the genome's
   phenotype and passes it to `createACAgent` with the configured rollout and
   gradient settings.
2. **Direct evaluation.** If the environment implements `AgentEnvironment`, the
   plugin calls `evaluateAgent(agent)` directly. Otherwise it falls back to the
   default evaluation path with context hooks forwarding rewards and lifecycle
   events.
3. **Telemetry.** Both local and worker evaluation paths collect comparable
   diagnostics: trigger counts, segment/episode return statistics, and policy
   entropy (softmax only). Retrieve via `plugin.getTelemetry(genome)`.
4. **Lamarckian writeback.** After evaluation, trained weights are written back
   to the genome (configurable via `isLamarckian`, default `true`).
5. **Worker evaluation.** When the worker reports actor-critic capability
   (`context.workerTrainingCapabilities?.rl?.methods?.['actor-critic']?.supported`),
   the plugin delegates to `defaultEvaluate(genome)` which routes through
   `evaluateGenomeEntry`. The worker-side enhancer runs the same agent contract.

## Configuration

```ts
import { ACPlugin } from '@neat-evolution/actor-critic-plugin'

const plugin = new ACPlugin(algorithm, {
  // Training
  learningRate: 0.001,
  discountFactor: 0.99,          // overrides environment's RLConfig if set
  entropyCoefficient: 0.01,      // exploration bonus (softmax only)
  clipGradients: false,          // enable gradient clipping
  gradientClipValue: 1.0,        // max gradient magnitude

  // Actor activation
  actorActivation: 'softmax',    // 'softmax' | 'sigmoid' | 'tanh'

  // Rollout capture
  rolloutLength: 32,             // or 'episode' for full-episode capture
  minRolloutLength: 4,           // minimum transitions before capture fires
  rewardThreshold: 0.1,          // |reward| threshold for event-triggered capture

  // Writeback
  isLamarckian: true,            // write trained weights back to genome
}, rng)
```

### Actor Activation

The `actorActivation` option controls how raw network outputs are converted to
actions:

| Activation | Behavior | Policy entropy tracked? |
| --- | --- | --- |
| `softmax` | Categorical sampling over discrete actions | Yes |
| `sigmoid` | Independent probabilities per output | No |
| `tanh` | Independent scaled outputs per output | No |

Policy entropy (Shannon entropy over action probabilities) is only meaningful
for softmax policies and is omitted from telemetry for other activations.

## Telemetry

Both local and worker evaluation paths produce `ActorCriticTelemetry`:

| Field | Type | Description |
| --- | --- | --- |
| `episodes` | `number` | Episodes completed during evaluation |
| `rolloutSegments` | `number` | Rollout segments trained |
| `transitionsTrained` | `number` | Total transitions in trained segments |
| `actorActivation` | `string` | Activation function used |
| `entropyCoefficient` | `number` | Entropy coefficient from config |
| `triggerCounts` | `TriggerCounts` | Per-trigger breakdown: `reward`, `done`, `info` |
| `segmentReturn?` | `{mean, min, max}` | Aggregated rollout-segment returns |
| `episodeReturn?` | `{mean, min, max}` | Per-episode returns (if environment reports them) |
| `policyEntropy?` | `{mean, min, max, samples}` | Policy entropy stats (softmax only) |

Access telemetry after evaluation via `plugin.getTelemetry(genome)`.

## Context Hooks

The plugin provides `getContextHooks()` for environments that cannot hand an
agent handle directly. The hooks forward `reward`, `episodeStart`, `episodeEnd`,
and `transitionInfo` to the active agent. This is a partial integration path —
hooks never call `act()`, so no transitions are recorded through hooks alone.
Direct `evaluateAgent()` is the complete RL path.

## Worker Evaluation

When workers report actor-critic capability via
`context.workerTrainingCapabilities?.rl?.methods?.['actor-critic']?.supported`,
the plugin delegates to `defaultEvaluate(genome)` which dispatches through
`evaluateGenomeEntry`. The worker-side evaluation enhancer (installed by
`@neat-evolution/worker-rl/workerPlugin`) creates the trainable executor,
wraps it as an AC agent, runs `evaluateAgent(agent)`, and returns an enriched
result with fitness, telemetry, and optional Lamarckian writeback payload.

`WorkerEvaluator` handles writeback at the evaluator level — the plugin does
not manage writeback on the worker path.

## License

MIT — see [LICENSE](../../LICENSE).
