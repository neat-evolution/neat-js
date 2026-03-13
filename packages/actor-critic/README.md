# @neat-evolution/actor-critic

Actor-Critic (A2C-style) agent and training utilities for the `neat-js` RL
pipeline. This package provides the core agent factory, rollout buffer, and
gradient computation; the higher-level plugin that wires it into evolution lives
in `@neat-evolution/actor-critic-plugin`.

## Overview

`createACAgent` builds an `EpisodicAgent` that owns action selection, transition
recording, rollout segmentation, and gradient updates. The environment calls
`agent.act(observation)` each timestep and reports rewards via `agent.reward()`.
Training happens inline through event-triggered rollout capture — no separate
training loop is needed.

### Network Layout

The agent wraps a `TrainableExecutor` with N+1 outputs: N actor outputs and 1
critic output. The last output is always the critic's value estimate V(s). Actor
outputs are processed through a configurable activation function before action
selection.

### Actor Activations

| Activation | Action selection | Use case |
| --- | --- | --- |
| `softmax` (default in plugin) | Categorical sampling over N actions | Discrete action spaces |
| `sigmoid` | Independent probabilities per output | Continuous/binary action spaces |
| `tanh` | Independent scaled outputs per output | Continuous action spaces |

For `softmax`, the agent samples a one-hot action from the probability
distribution. For `sigmoid` and `tanh`, the activated outputs are returned
directly as continuous actions.

## Event-Triggered Training

Training is triggered by events during the episode, not every frame. The agent
evaluates trigger conditions after each `reward()` call:

1. **`done`** — episode ended (`transition.done === true`)
2. **`reward`** — significant reward observed (`|reward| > rewardThreshold`)
3. **`info`** — environment metadata flagged as interesting (`info.isInteresting`)

When a trigger fires and the rollout buffer has enough transitions
(`>= minRolloutLength`), the buffer contents are captured as a `RolloutSegment`
and trained immediately using n-step returns.

At episode end, `endEpisode()` flushes any remaining buffer contents with a
`done` trigger.

### Rollout Buffer

The `RolloutBuffer` accumulates transitions in a ring buffer (fixed `rolloutLength`)
or unbounded list (`rolloutLength: 'episode'`). On capture, it drains the buffer
and resets.

| Config | Type | Default | Description |
| --- | --- | --- | --- |
| `rolloutLength` | `number \| 'episode'` | `32` | Fixed window or full-episode capture |
| `minRolloutLength` | `number` | `1` | Minimum transitions before capture fires |
| `rewardThreshold` | `number` | `0.1` | Minimum `\|reward\|` to trigger capture |

## Gradient Computation

`trainOnSegment` computes n-step returns backward through the segment:

```
G_t = r_t + gamma * r_{t+1} + ... + gamma^(n-t-1) * r_{n-1} + gamma^(n-t) * V(s_n)
```

Where `V(s_n) = 0` if the segment ends at a terminal state, otherwise the
critic's bootstrap estimate.

For each transition, the advantage `A_t = G_t - V(s_t)` drives three error
components:

- **Policy gradient**: `-advantage * (action - pi)` (REINFORCE-style)
- **Critic MSE**: `-advantage` (value function regression)
- **Entropy bonus**: `+c * entropy_gradient` (softmax only, encourages exploration)

Gradient clipping is available via `clipGradients` / `gradientClipValue`.

## Exports

| Export | Description |
| --- | --- |
| `createACAgent(trainable, config, rng)` | Factory that returns an `ACAgent` (extends `EpisodicAgent`). |
| `ACAgentConfig` | Configuration interface for the agent factory. |
| `ACAgent` | Agent type with `setTransitionInfo()` for plugin integration. |
| `trainOnSegment(trainable, transitions, config)` | Runs n-step return computation and backward passes over a captured rollout segment. |
| `computeACGradients(transition, advantage, config)` | Computes policy gradient + critic + entropy error vector. |
| `ACGradientConfig` | Configuration for gradient computation. |
| `TrainOnSegmentConfig` | Extends `ACGradientConfig` with `learningRate`. |
| `RolloutBuffer` | Ring buffer that accumulates transitions and captures segments. |
| `applyActorActivation(raw, activation)` | Applies sigmoid, softmax, or tanh to raw actor outputs. |
| `sigmoid`, `tanh`, `softmax` | Individual activation functions. |
| `sigmoidDerivative`, `tanhDerivative` | Activation derivatives for custom gradient use. |

## Usage

```ts
import { createACAgent } from '@neat-evolution/actor-critic'
import type { ACAgentConfig } from '@neat-evolution/actor-critic'

const config: ACAgentConfig = {
  learningRate: 0.001,
  actionCount: 4,
  gradientConfig: {
    discountFactor: 0.99,
    entropyCoefficient: 0.01,
    clipGradients: false,
    gradientClipValue: 1.0,
  },
  rolloutConfig: { rolloutLength: 32, rewardThreshold: 0.1 },
  actorActivation: 'softmax',
}

const agent = createACAgent(trainableExecutor, config, rng)

// Environment drives the loop:
agent.startEpisode(episodeInfo)
for (const observation of observations) {
  const action = agent.act(observation)
  // ... environment steps ...
  agent.reward(rewardValue, done)
}
agent.endEpisode(episodeResult)
```

For most use cases, prefer `@neat-evolution/actor-critic-plugin` which handles
agent construction, telemetry, Lamarckian writeback, and worker dispatch
automatically.

## License

MIT — see [LICENSE](../../LICENSE).
