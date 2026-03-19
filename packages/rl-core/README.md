# @neat-evolution/rl-core

Step-based reinforcement learning framework for the neat-js ecosystem.

## Purpose

- Provide step-based RL agent contracts and implementations
- Implement trajectory collection, replay buffers, and TD utilities
- Support baseline through advanced learners (Q-learning, Actor-Critic, A2C, PPO, DQL)
- Integrate with `@neat-evolution/executor`'s `TrainableExecutor` for gradient-based learning

## How it Fits

- **`@neat-evolution/executor`** — uses `TrainableExecutor` for gradient computation and weight updates. `createSnapshot()` for frozen evaluation copies.
- **`@neat-evolution/core`** — phenotypes and activations
- Apps and environments implement step-based interaction; `rl-core` provides the learners.

## Key Components

### Step Agents

Factory functions that create step agents from an `Executor` (or `TrainableExecutor` for learning agents):

- `createVanillaStepAgent` — baseline forward-only agent, no learning
- `createActorCriticStepAgent` — one-step TD actor-critic
- `createA2CStepAgent` — n-step advantage actor-critic
- `createPPOStepAgent` — clipped surrogate objective with trajectory batches
- `createQLearningStepAgent` — tabular TD Q-learning
- `createDeepQLearningStepAgent` — neural network Q-function with replay buffer

### Trajectory and Replay

- `TrajectoryBatchCollector` — collects transitions into trajectory batches for policy gradient methods
- `StepRolloutBuffer` — manages rollout segments for on-policy learners
- `ReplayBuffer` — experience replay for off-policy learners (DQL)

### TD Utilities

- `computeDiscountedReturns` — standard discounted return computation
- `computeNStepReturns` — n-step bootstrapped returns
- `computeAdvantages` — advantage estimation for actor-critic methods

### Policy Gradient

- `actionLogProbabilities` — log-probability computation for discrete action spaces
- `computeActorCriticGradients` — gradient computation for actor-critic architectures

## Learner Matrix

| Learner | Type | Key Feature |
|---------|------|-------------|
| Vanilla | Baseline | No learning, forward-only |
| Q-Learning | Value-based | Tabular TD updates |
| Deep Q-Learning (DQL) | Value-based | Neural network Q-function with replay buffer |
| Actor-Critic | Policy gradient | One-step TD actor-critic |
| A2C | Policy gradient | N-step advantage actor-critic |
| PPO | Policy gradient | Clipped surrogate objective with trajectory batches |

## Plugin Entry Points

Each learner is available as a subpath export that provides a `StepAgentFactory`-compatible `createStepAgent` function. These are designed to be referenced by pathname for worker-hydratable step-agent plugins.

- `@neat-evolution/rl-core/actor-critic` — one-step actor-critic factory
- `@neat-evolution/rl-core/q-learning` — tabular Q-learning factory
- `@neat-evolution/rl-core/dql` — deep Q-learning factory
- `@neat-evolution/rl-core/a2c` — A2C factory
- `@neat-evolution/rl-core/ppo` — PPO factory

## Key Boundaries

- `rl-core` owns RL math, trajectory/replay state, and step-agent algorithms.
- `executor` owns trainable execution and frozen snapshots via `TrainableExecutor.createSnapshot()`.
- Apps remain vanilla-only even though advanced RL exists below them.

## Installation

This package is hosted on [GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry). You'll need to configure your package manager to use the GitHub Packages registry for the `@neat-evolution` scope.

### Yarn (v2+)

Add to your `.yarnrc.yml`:

```yaml
npmScopes:
  neat-evolution:
    npmAlwaysAuth: true
    npmRegistryServer: "https://npm.pkg.github.com"
```

Then install:

```sh
yarn add @neat-evolution/rl-core
```

### npm

Create a `.npmrc` file in your project root:

```
@neat-evolution:registry=https://npm.pkg.github.com
```

Then install:

```sh
npm install @neat-evolution/rl-core
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE) file for details.
