# @neat-evolution/q-learning

Q-learning (DQN-style) agent and training utilities for the `neat-js` RL
pipeline. This package provides the core agent factory and gradient computation;
the higher-level plugin that wires it into evolution lives in
`@neat-evolution/q-learning-plugin`.

## Overview

`createQLAgent` builds an `EpisodicAgent` that owns action selection, transition
recording, rollout segmentation, and gradient updates. The environment calls
`agent.act(observation)` each timestep and reports rewards via `agent.reward()`.
Training happens inline through event-triggered rollout capture — no separate
training loop is needed.

### Standard vs Multi-Discrete Action Spaces

**Standard mode** (`multiDiscrete: false`, the default) treats the network's N
outputs as Q-values for N discrete actions. Action selection is epsilon-greedy
over the full action set; the agent stores a `chosenActionIndex` on each
transition so the backward pass targets only the selected action's output.

**Multi-discrete mode** (`multiDiscrete: true`) treats the network's 2N outputs
as N independent binary factors, each with a `[Q_on, Q_off]` pair. Each factor
runs its own epsilon-greedy selection, producing an N-length binary action
vector.

#### Multi-Discrete Limitation

Multi-discrete mode trains every factor using the same shared scalar reward. No
per-factor credit assignment is performed — all factors receive identical TD
targets derived from the global reward signal. This is an explicit
simplification, not a principled multi-agent or factorized-credit method.

The approximation works well when:

- factors are loosely coupled (toggling one factor does not drastically change
  the value of another)
- the reward signal is rich enough that correlated exploration across factors
  eventually separates useful from harmful combinations

It breaks down when factors interact strongly and the shared reward cannot
distinguish which factor caused a positive or negative outcome. Structured
credit assignment (per-factor rewards, counterfactual baselines, or multi-agent
decomposition) is out of scope for the current implementation.

## Epsilon-Greedy Exploration

The agent uses an epsilon-greedy schedule configured through three parameters:

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `epsilonInitial` | `number` | *(required)* | Starting epsilon for each genome evaluation. |
| `epsilonDecayPerEpisode` | `number` | `1` (no decay) | Multiplicative factor applied after each completed episode. |
| `epsilonMinimum` | `number` | `0` | Floor — epsilon never decays below this value. |

### Schedule Semantics

1. **Reset per evaluation.** When the plugin creates a fresh agent for a genome,
   epsilon starts at `epsilonInitial`. There is no cross-genome epsilon state.
2. **Decay per episode.** After `startEpisode()` is called (except the first
   episode), epsilon is updated: `epsilon = max(epsilonMinimum, epsilon * epsilonDecayPerEpisode)`.
3. **The first episode always uses `epsilonInitial`** with no decay applied.
4. **Clamping.** Once epsilon reaches `epsilonMinimum` it stays there for all
   remaining episodes in the evaluation.

This schedule lets early episodes explore broadly while later episodes in a
multi-episode gauntlet exploit learned Q-values.

## Exports

| Export | Description |
| --- | --- |
| `createQLAgent(trainable, config, rng)` | Factory that returns a `QLAgent` (extends `EpisodicAgent`). |
| `QLAgentConfig` | Configuration interface for the agent factory. |
| `QLAgent` | Agent type with `setTransitionInfo()` for plugin integration. |
| `trainOnSegment(trainable, transitions, config, multiDiscrete, actionCount)` | Runs n-step return computation and backward passes over a captured rollout segment. |
| `computeQLOutputErrors(transition, tdError, outputCount)` | Standard-mode sparse error vector (nonzero only at `chosenActionIndex`). |
| `computeQLMultiDiscreteOutputErrors(transition, tdErrors, factorCount)` | Multi-discrete error vector (per-factor TD errors placed at chosen pair indices). |
| `QLGradientConfig` | Configuration for gradient computation (`discountFactor`, `learningRate`). |

## Usage

```ts
import { createQLAgent } from '@neat-evolution/q-learning'
import type { QLAgentConfig } from '@neat-evolution/q-learning'

const config: QLAgentConfig = {
  learningRate: 0.01,
  actionCount: 4,
  discountFactor: 0.99,
  rolloutConfig: { rolloutLength: 32, rewardThreshold: 0.1 },
  epsilonInitial: 0.3,
  epsilonDecayPerEpisode: 0.95,
  epsilonMinimum: 0.01,
  multiDiscrete: false,
}

const agent = createQLAgent(trainableExecutor, config, rng)

// Environment drives the loop:
agent.startEpisode(episodeInfo)
for (const observation of observations) {
  const action = agent.act(observation)
  // ... environment steps ...
  agent.reward(rewardValue, done)
}
agent.endEpisode(episodeResult)
```

For most use cases, prefer `@neat-evolution/q-learning-plugin` which handles
agent construction, Lamarckian writeback, and worker dispatch automatically.

## License

MIT — see [LICENSE](../../LICENSE).
