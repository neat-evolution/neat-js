# Episodic RL Audit: Current AC and QL Implementations

## Bottom line

The current `actor-critic` and `q-learning` packages are not implementations of A2C, PPO, or DQN in the standard sense. They are barebones online learners built around:

- a short rollout buffer
- event-triggered updates
- one backward pass per stored transition
- a single network used for both acting and learning

That is a valid experimental starting point, but it is not well aligned with the stabilized forms of modern deep RL algorithms.

The biggest issue is not just "missing nice-to-have features". There is at least one structural problem that compromises the learning target for sequential tasks.

## What the code currently does

### Actor-critic

`createACAgent()` records `(state, action, reward, actor probs, critic value)` and trains whenever a segment is captured from the rollout buffer. See:

- `packages/actor-critic/src/createACAgent.ts`
- `packages/actor-critic/src/trainOnSegment.ts`

The update is:

- policy gradient term from the chosen action
- critic regression term
- optional entropy bonus
- backward pass once per transition

This is a simple on-policy actor-critic. It is not A2C and it is not PPO.

### Q-learning

`createQLAgent()` records `(state, action, reward, qValues)` and trains on captured segments with epsilon-greedy exploration. See:

- `packages/q-learning/src/createQLAgent.ts`
- `packages/q-learning/src/trainOnSegment.ts`

The update is:

- sparse TD error on the chosen action
- no replay buffer
- no target network
- no minibatches
- no separate target computation pass

This is online function-approximation Q-learning. It is not DQN.

## Severe issue: both learners bootstrap from the wrong state

This is the main reason a harder sequential demo can collapse.

The `Transition` type claims to represent `(s, a, r, s', terminated, truncated)`, but it does not actually store `nextState` or any next-state value estimate:

- `packages/execution-manager/src/features/rollout/Transition.ts:3`
- `packages/execution-manager/src/features/rollout/Transition.ts:4`

### AC bootstrap bug

In actor-critic, the non-terminal bootstrap uses `lastTransition.criticValue`, which is `V(s_t)` for the last stored state in the segment, not `V(s_{t+1})`:

- `packages/actor-critic/src/trainOnSegment.ts:42`
- `packages/actor-critic/src/trainOnSegment.ts:52`

That means the target is effectively:

```text
G_t = r_t + gamma * V(s_t)
```

for a one-step non-terminal segment, when it should be:

```text
G_t = r_t + gamma * V(s_{t+1})
```

For full terminal episodes this is less damaging because the return eventually becomes Monte Carlo. For partial rollouts, reward-triggered captures, info-triggered captures, or fixed-length segments, this is the wrong target.

### QL bootstrap bug

In q-learning, the non-terminal bootstrap uses `max_a Q(s_t, a)` from the last transition in the segment:

- `packages/q-learning/src/trainOnSegment.ts:63`
- `packages/q-learning/src/trainOnSegment.ts:71`

For one-step learning, the implemented target is effectively:

```text
r_t + gamma * max_a Q(s_t, a)
```

instead of:

```text
r_t + gamma * max_a Q(s_{t+1}, a)
```

That is not a small omission. It changes the Bellman target itself.

### Why the bandit demo still looks fine

The episodic bandit demo sets `discountFactor: 0` for both agents in `packages/demo/src/features/episodic/index.ts`, so the bootstrap term disappears. That hides the defect in the simple demo but not in sequential environments.

## Missing features shared by both implementations

These are the common capabilities missing from both packages relative to standard, robust deep RL systems.

### Core data/modeling gaps

- No `nextState` in transitions, so correct bootstrapping is impossible.
- No `nextValue` / `nextQValues` cached at episode boundaries or rollout cuts.
- No explicit terminal mask separate from truncation handling in the target computation.
- No support for vectorized environments or batched rollout collection.

### Optimization gaps

- Updates happen one transition at a time rather than as a proper batch loss.
- No minibatching.
- No gradient accumulation over a rollout batch.
- No optimizer state beyond whatever `backward()` does internally.
- No global gradient norm clipping; AC only clips output error values.

### Signal conditioning gaps

- No reward normalization or reward scaling.
- No return normalization.
- No observation normalization.
- No advantage normalization.
- No explicit value-loss coefficient or entropy schedule.

### Training control gaps

- Event-triggered training is custom and nonstandard.
- No fixed update cadence decoupled from environment stepping.
- No warmup period before learning.
- No curriculum for exploration except a simple epsilon schedule in QL.
- No evaluation mode distinct from training mode.

### Diagnostics gaps

- No TD-error telemetry.
- No policy entropy telemetry.
- No explained-variance or value-loss tracking.
- No KL tracking.
- No episode/replay statistics that would help debug collapse.

## Alignment with standard best practices

### Actor-critic alignment

What is aligned:

- stochastic policy over discrete actions
- critic baseline
- entropy bonus
- n-step style return accumulation

What is not aligned:

- no correct next-state bootstrap for truncated rollouts
- no GAE(lambda)
- no rollout-batch loss
- no parallel synchronous workers
- no advantage normalization
- no value-loss weighting
- no policy/value separation strategy

Verdict: this is a minimal actor-critic prototype, not A2C.

### Q-learning alignment

What is aligned:

- epsilon-greedy exploration
- sparse chosen-action TD update
- bootstrap with max-Q in spirit

What is not aligned:

- no next-state target
- no replay buffer
- no target network
- no minibatch training
- no Huber loss
- no target detachment/staleness control

Verdict: this is online neural Q-learning, not DQN.

## Features whose absence materially harms performance

These are the highest-priority problems to fix before expecting reliable results on nontrivial tasks.

1. Correct next-state bootstrapping.
2. Clean handling of `terminated` versus `truncated` in target construction.
3. Batch-style updates over rollout/replay samples instead of one backward call per stored transition.
4. For QL specifically, replay buffer plus target network.
5. For AC specifically, GAE(lambda), advantage normalization, and fixed rollout updates.

Without those, the system is mostly suited to:

- bandits
- very short episodic tasks
- toy environments where `gamma = 0`
- experiments where instability is acceptable

## Recommended maturity order

1. Fix the transition model so targets can use `nextState`.
2. Rework both training paths to compute targets from `s_{t+1}` or a final bootstrap value.
3. Standardize rollout/replay sampling and batch losses.
4. Add algorithm-specific stabilizers: replay/target network for DQN, GAE/batched rollouts for A2C, clipped objectives for PPO.
5. Add normalization and diagnostics so failures are observable rather than guessed at.

## Practical conclusion

Your diagnosis is correct: the current AC and QL implementations are barebones and incomplete. More importantly, the missing next-state bootstrap means they are not just missing polish; on sequential tasks they are learning from compromised targets.

That issue should be treated as a blocker before drawing conclusions from the more complex demo.
