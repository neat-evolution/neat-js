# Action selection: AC vs QL vs Vanilla

How each algorithm selects actions, what output shape it needs, and where multi-discrete support stands.

## The three action selection strategies

### Vanilla: deterministic argmax

```
Network outputs (Sigmoid): [0.82, 0.35, 0.61]
                                 ↓ argmax
Selected action:            arm 0
```

The environment calls `argmax(executor.forward(observation))`. No randomness, no exploration. The network is the policy — whatever output is highest wins. This is why vanilla converges fast on simple problems: it's always exploiting.

Sigmoid outputs are independent values in [0, 1]. They don't sum to 1. The environment just picks the biggest one. This works fine for mutually exclusive choices (pick one arm) but there's no principled way to handle independent binary decisions (thrust AND fire simultaneously).

### Actor-Critic: stochastic categorical sampling

```
Network outputs (4 total):
  Actor (Softmax group):  [0.60, 0.25, 0.15]  ← probabilities, sum to 1.0
  Critic (Linear):        [0.42]               ← V(s) estimate

Categorical sample from [0.60, 0.25, 0.15]:
  → roll 0.73 → cumulative [0.60, 0.85, 1.00] → picks action 1
  → one-hot: [0, 1, 0]

Returned to environment: [0, 1, 0]  (critic value is internal, never returned)
```

AC **requires** softmax because it samples from a probability distribution. The math is:
1. Softmax normalizes raw logits to probabilities that sum to 1
2. `sampleAction()` draws from this categorical distribution
3. The selected action is returned as a one-hot vector
4. The policy gradient uses `log(p_action)` — this needs valid probabilities

**Why stochastic?** Policy gradient methods need exploration to discover better actions. The probability of each action is the thing being optimized — gradient ascent pushes probability toward actions that produce high advantage. Deterministic argmax would kill the gradient signal.

**The critic** (output N+1, Linear activation) estimates V(s) — how good the current state is regardless of action. It provides the baseline for advantage computation: `A = G_t - V(s)`. Without the critic, you'd need to use raw returns (REINFORCE), which has much higher variance.

### Q-Learning: epsilon-greedy

```
Network outputs (Linear): [2.5, -1.0, 0.8]  ← Q-values (unbounded)

With epsilon = 0.3:
  → roll 0.45 → 0.45 > 0.3 → EXPLOIT
  → argmax([2.5, -1.0, 0.8]) → action 0
  → one-hot: [1, 0, 0]

With epsilon = 0.3:
  → roll 0.12 → 0.12 < 0.3 → EXPLORE
  → random action → action 2
  → one-hot: [0, 0, 1]

Returned to environment: one-hot vector
```

QL uses Linear activation because Q-values are unbounded estimates of expected future reward. Softmax would normalize them into probabilities, destroying the magnitude information that TD learning depends on.

**Epsilon schedule:** Exploration rate starts high (e.g., 0.3) and decays per episode. The current default decay of 0.1x per episode is extremely aggressive — designed for the 3-episode bandit. Generalized defaults should be gentler (e.g., 0.995 per episode, minimum 0.01).

## Output shape comparison

| Algorithm | Outputs | Activation | Action returned |
|-----------|---------|-----------|-----------------|
| Vanilla | N (one per action) | Sigmoid | raw outputs (env does argmax) |
| AC | N+1 (N actor + 1 critic) | [N, Softmax], [1, Linear] | one-hot (N values) |
| QL | N (one Q-value per action) | Linear | one-hot (N values) |

All three return something the environment can `argmax()` over to get a discrete choice. But they produce fundamentally different output shapes and require different activations.

## Multi-discrete: independent binary actions

The algorithms above assume **mutually exclusive** actions — pick exactly one from N choices. Many real environments need **independent binary actions** — thrust AND fire AND turn, each a separate yes/no decision.

### QL multi-discrete (already implemented)

QL handles this by doubling the outputs — each binary factor gets a Q_on/Q_off pair:

```
4 binary actions → 8 network outputs (Linear):
  [Q_thrust_on, Q_thrust_off, Q_fire_on, Q_fire_off,
   Q_left_on,   Q_left_off,   Q_right_on, Q_right_off]

Per-factor epsilon-greedy:
  thrust: Q_on=1.5 > Q_off=0.3 → thrust=1 (exploit)
  fire:   roll < epsilon         → fire=0   (explore, random)
  left:   Q_on=0.2 < Q_off=0.8 → left=0   (exploit)
  right:  Q_on=1.1 > Q_off=0.4 → right=1  (exploit)

Action: [1, 0, 0, 1]  (thrust + right)
```

Each factor has independent exploration (its own epsilon roll) and independent Q-value tracking. Training computes per-factor TD errors and per-factor bootstrap values.

### AC multi-discrete (not yet implemented)

AC would need analogous changes — each binary factor gets its own 2-way softmax group:

```
4 binary actions → 8 actor outputs + 1 critic = 9 total:
  [P_thrust_on, P_thrust_off,   ← Softmax group 1
   P_fire_on,   P_fire_off,     ← Softmax group 2
   P_left_on,   P_left_off,     ← Softmax group 3
   P_right_on,  P_right_off,    ← Softmax group 4
   V(s)]                        ← Linear (critic)

Per-factor Bernoulli sampling:
  thrust: sample from [0.8, 0.2] → thrust=1
  fire:   sample from [0.3, 0.7] → fire=0
  left:   sample from [0.1, 0.9] → left=0
  right:  sample from [0.6, 0.4] → right=1

Action: [1, 0, 0, 1]
```

This requires changes to:
1. **`sampleAction()`** — per-factor binary sampling instead of single categorical
2. **`computeACGradients()`** — per-factor log-likelihood: `dL/dp = -advantage * action / p` applied independently per factor, plus per-factor entropy bonus
3. **Output activation config** — multiple independent 2-way softmax groups: `[[2, Softmax], [2, Softmax], [2, Softmax], [2, Softmax], [1, Linear]]`

The executor already supports multiple independent softmax groups (it iterates `softmaxGroups` array in both forward and backward passes), so the activation and Jacobian math is already handled. The gap is in the agent-side action selection and gradient computation.

### Shared abstractions

QL and AC multi-discrete share these patterns:
- N binary factors → 2N paired outputs
- Per-factor action selection (epsilon-greedy or categorical sample)
- Per-factor error/gradient computation
- Per-factor bootstrap values

These could live in a shared utility, but the gradient math differs enough (TD error vs policy gradient + entropy) that a full shared abstraction may not be worth it. The more practical shared pieces are:
- Multi-discrete output layout helpers (factor index → output pair indices)
- Per-factor action decoding (2N outputs → N binary actions)
- Output activation config builder for multi-discrete

## Defaults that need generalization

### Epsilon decay

Current default: `epsilonDecayPerEpisode: 0.1` (multiply by 0.1 each episode). This is bandit-specific — by episode 1, epsilon is already at minimum.

Recommended generalized defaults:
```
epsilonInitial: 1.0          // start fully random
epsilonDecayPerEpisode: 0.995 // gentle decay
epsilonMinimum: 0.01          // always explore a little
```

These should be configurable through the EvolutionManager's evaluator config, which they already are via `agentFactoryOptions`. The issue is that the demo hardcodes aggressive values.

### Discount factor

Current default in episodic demo: `discountFactor: 0`. This means only immediate reward matters — no temporal credit assignment. Correct for bandits, wrong for almost everything else.

Recommended generalized default:
```
discountFactor: 0.99  // standard for most episodic tasks
```

The hexagonoids environment already suggests this in `getRLConfig()`:
```typescript
getRLConfig(): RLConfig {
  return {
    actionSize: DEFAULT_OUTPUT_COUNT,
    discountFactor: 0.99,
    maxStepsPerEpisode: this.config.simulation.maxTicks,
    suggestedRolloutLength: 32,
  }
}
```

The `RLConfig` returned by the environment should be the authority for these values. The demo/manager should read them from the environment rather than hardcoding.
