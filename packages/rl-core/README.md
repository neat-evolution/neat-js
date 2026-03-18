# @neat-evolution/rl-core

`@neat-evolution/rl-core` is the maintained step-based RL substrate for
`neat-js`.

It now owns:

- step-agent contracts and worker-hydratable step-agent plugins
- trajectory and replay helpers
- TD and policy-gradient utilities
- baseline and advanced step learners

## Maintained learner matrix

- one-step actor-critic
- n-step actor-critic
- Q-learning
- DQL
- A2C
- PPO

## Key boundaries

- `rl-core` owns RL math, trajectory/replay state, and step-agent algorithms.
- `executor` owns trainable execution and frozen snapshots via
  `TrainableExecutor.createSnapshot()`.
- apps remain vanilla-only even though advanced RL exists below them.

## Public plugin entrypoints

- `@neat-evolution/rl-core/actor-critic`
- `@neat-evolution/rl-core/q-learning`
- `@neat-evolution/rl-core/dql`
- `@neat-evolution/rl-core/a2c`
- `@neat-evolution/rl-core/ppo`
