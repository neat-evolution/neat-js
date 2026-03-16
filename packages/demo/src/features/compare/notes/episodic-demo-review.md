# Episodic demo review

Notes from reviewing the episodic demo (`packages/demo/src/features/episodic/`), the BanditEnvironment, and the AC/QL agent implementations.

## How it works

All four variants go through the same `BanditEnvironment.evaluate()` entry point:

```typescript
evaluate(executor: StaticExecutor): number {
  const factory = this.runtimeOptions?.createAgent ?? createVanillaAgent
  const agent = factory(executor, options, context)
  return this.evaluateAgent(agent)
}
```

The environment always runs the same game loop (`evaluateAgent`): 3 episodes x 20 steps, one-hot observation, argmax action selection, reward = 1 if best arm chosen. The only thing that changes is what the agent does inside `act()` and `reward()`.

### Vanilla

- `createVanillaAgent` wraps a `StaticExecutor` in a no-op `EpisodicAgent`
- `act()` = `executor.forward(inputs)` — pure feed-forward
- `reward()`, `startEpisode()`, `endEpisode()` = no-ops
- 3 outputs, default activation (Sigmoid)
- Fitness = average reward across all episodes

### Actor-Critic (AC-Lamarck, AC-Darwin)

- Plugin: `@neat-evolution/actor-critic/plugin` creates an `ACAgent` wrapping a `TrainableExecutor`
- 4 outputs: 3 actor (Softmax group) + 1 critic (Linear)
- `act()`: forward pass → read softmax probabilities from first 3 outputs, critic value from output 4 → sample action from probabilities (stochastic, not argmax) → record transition in rollout buffer → return one-hot action
- `reward()`: records reward on transition, checks trigger conditions (|reward| > threshold, done, interesting info) → if triggered, captures segment from buffer → `trainOnSegment()` computes n-step returns backward, calls `forward(state)` then `backward(errors, lr)` for each transition
- Training: policy gradient `dL/dp_i = -advantage * action_i / p_i` + entropy bonus + critic MSE gradient. Softmax Jacobian applied in executor's `backward()` to convert probability-space gradients to logit-space
- Lamarckian: `context.scheduleWriteback(executor)` at creation → flushed after evaluation → `executor.getUpdatedActions()` writes trained weights/biases back to genome
- Darwinian: same training during evaluation, but no writeback scheduled — learned weights discarded

### Q-Learning

- Plugin: `@neat-evolution/q-learning/plugin` creates a `QLAgent` wrapping a `TrainableExecutor`
- 3 outputs, all Linear activation — outputs are raw Q-values
- `act()`: forward pass → epsilon-greedy action selection (random with probability epsilon, otherwise argmax of Q-values) → record transition → return one-hot action
- `reward()`: same trigger logic as AC → `trainOnSegment()` computes n-step returns, TD error = `Q(s,a) - G_t`, sparse error vector (only chosen action index gets the error)
- Epsilon decays per episode: `epsilon *= decay`, floored at minimum
- Lamarckian writeback: same mechanism as AC

## Evaluation dispatch — where it diverges

The divergence is entirely in the agent factory, injected via pathname:

| Config | Vanilla | AC | QL |
|--------|---------|-----|-----|
| `createExecutorPathname` | default (`@neat-evolution/executor`) | `@neat-evolution/executor/backprop` | `@neat-evolution/executor/backprop` |
| `createAgent` pathname | none (uses `createVanillaAgent`) | `@neat-evolution/actor-critic/plugin` | `@neat-evolution/q-learning/plugin` |
| Executor type | `StaticExecutor` | `TrainableExecutor` | `TrainableExecutor` |
| Output count | 3 | 4 (3 actor + 1 critic) | 3 |
| Output activation | default (Sigmoid) | `[3, Softmax], [1, Linear]` | Linear |

The environment loop is identical for all variants. The agent implementation determines what happens inside `act()` and `reward()`.

## Is this a fair test?

### Yes, structurally

- All variants use the same EvolutionManager, same population options, same iteration count
- Same environment, same episodes, same reward structure
- Same RNG seeding strategy (deterministic when seed is set)
- Vanilla serves as a proper control — no learning, pure evolution

### But the environment is too simple to draw conclusions

The 3-arm bandit with one-hot observations is trivially solvable by evolution alone (vanilla hits 1.0 by gen 10). The RL agents are handicapped:

1. **AC starts worse and converges slower** because it samples stochastically from softmax probabilities instead of using argmax. This is correct for policy gradient (exploration is essential for learning), but on a trivial problem it just adds noise.

2. **AC-Darwin never improves** because it discards weights every generation. The topology alone (with random initial weights) isn't enough to solve the problem — unlike Baldwinian in the compare demo where backprop on a good topology reliably converges. AC training within a single evaluation lifetime may not be enough to learn a good policy from scratch.

3. **Q-Learning converges but slowly** because epsilon-greedy exploration wastes steps, and the epsilon schedule decays per episode within a single evaluation, meaning early episodes are noisier.

4. **The environment gives no partial credit** — reward is binary (1 or 0), which makes gradient signals noisy for both AC and QL.

This is fine as a proof-of-concept that the pipeline works end-to-end, but the results don't validate RL effectiveness.

## Output activation questions

### Does AC prefer softmax on the actor?

The demo configures `[3, Softmax], [1, Linear]` and the ACAgent reads actor outputs directly as probabilities. **Softmax is required** — the agent calls `sampleAction(actionProbabilities, rng)` which treats outputs as a categorical distribution. Without softmax normalization the probabilities wouldn't sum to 1 and sampling would be incorrect.

The executor applies softmax per-group in its forward pass and stores the probabilities for the backward pass Jacobian. This is handled correctly.

### Does AC prefer linear on the critic?

**Yes, linear is correct.** The critic estimates V(s), which is an unbounded value. Sigmoid would clamp it to [0,1], which happens to work for this environment (rewards are 0 or 1) but would break for environments with larger reward ranges. Linear is the standard choice.

### Does vanilla evaluate differently?

Yes, in one subtle way: **vanilla uses argmax** to select an arm (via the `argmax()` helper in BanditEnvironment), while AC uses **stochastic sampling** from softmax probabilities. This gives vanilla a deterministic advantage on exploitation.

However, looking more carefully at the code — `argmax()` in BanditEnvironment is called on the agent's output, not on raw executor outputs. For vanilla, `act()` returns `executor.forward(inputs)` which goes through default activation (Sigmoid), and then the environment takes argmax of those outputs. For AC, `act()` returns a one-hot action vector (already argmax'd via sampling), and the environment takes argmax of that — which is just the selected action. For QL, `act()` also returns a one-hot action vector.

So the action selection is:
- **Vanilla**: environment does `argmax(executor.forward(obs))` on Sigmoid outputs
- **AC**: agent does `sampleAction(softmax(outputs))`, returns one-hot, environment does `argmax(one-hot)` = identity
- **QL**: agent does epsilon-greedy argmax on Q-values, returns one-hot, environment does `argmax(one-hot)` = identity

The environment's `argmax(output, armCount)` only looks at the first `armCount` outputs, so the AC critic (output index 3) is correctly ignored.

## Issues and kinks

### 1. Action selection asymmetry

Vanilla uses Sigmoid activation + environment argmax. AC uses Softmax + stochastic sampling. QL uses Linear + epsilon-greedy. These are all "correct" for their respective algorithms, but it means fitness isn't measuring the same thing — vanilla is always exploiting, RL agents are always exploring.

A fairer comparison might include an "exploitation-only" evaluation pass (epsilon=0, greedy sampling) after training, similar to how the compare demo does a separate test evaluation.

### 2. No separate test/validation evaluation

Unlike the compare demo, the episodic demo has no post-evolution test evaluation. The fitness reported is from the training loop itself. For RL agents that explore during evaluation, this understates their true capability.

### 3. Epsilon decay is per-episode within a single evaluation

QL's epsilon starts at 0.3 and decays each of the 3 episodes. With decay=0.1 (per the default `epsilonDecayPerEpisode: 0.1`):
- Episode 0: epsilon = 0.3
- Episode 1: epsilon = max(0.01, 0.3 * 0.1) = 0.03
- Episode 2: epsilon = max(0.01, 0.03 * 0.1) = 0.01

This means episode 0 is very noisy (30% random actions) but episodes 1-2 are nearly greedy. The decay is aggressive — by episode 1 it's already near minimum. This may be intentional for this small environment but should be tuned for more complex ones.

**Wait** — looking at the arg parsing more carefully, `epsilonDecayPerEpisode` defaults to `0.1` in parseArgs, not `0.95`. The CLI flag is `--epsilon-decay`. So the default decay is extremely aggressive (multiply by 0.1 each episode). This works here but would be wrong for most RL tasks.

### 4. Discount factor = 0

Both AC and QL use `discountFactor: 0`. This means future rewards are completely ignored — only immediate reward matters. This is correct for the bandit (each step is independent, no temporal credit assignment needed), but it makes this a poor test of the n-step return machinery.

### 5. AC entropy coefficient may be too low

Default entropy = 0.01. With only 3 episodes of 20 steps, this provides minimal exploration pressure. Higher entropy might help AC explore more effectively on this small problem, though the real issue is that the problem is too simple.

### 6. Output count mismatch for QL

QL uses 3 outputs (one Q-value per arm) with Linear activation. This is correct for standard DQN-style Q-learning. But the user mentioned a concern about multi-discrete environments where outputs aren't mutually exclusive — that would need the `multiDiscrete` mode with 2N outputs (Q_on, Q_off per factor). The episodic demo doesn't exercise that path.

### 7. No multi-discrete demo

The QL `multiDiscrete` mode (paired Q-values per binary action) exists in the implementation but isn't exercised by any demo. For environments where actions aren't mutually exclusive (e.g., the hexagonoids game where thrust/rotate/fire are independent), this mode would be needed with a translation layer to map 2N Q-outputs back to N environment actions.

## Proposed improvements

1. **Add a greedy evaluation pass** after evolution — run each variant's best genome with exploration disabled (epsilon=0, argmax instead of sampling) to show true learned capability
2. **Consider a harder environment** — the bandit is solved by vanilla in 10 generations, leaving no room for RL to demonstrate value. A longer-horizon task with delayed rewards would be more revealing
3. **Document the epsilon decay default** — 0.1 is very aggressive, should be clearly noted as bandit-specific
4. **Exercise multi-discrete mode** — either in this demo or a separate one
5. **Consider output translation layer** — for environments where RL output shape differs from environment action shape, a configurable translation function would be cleaner than requiring environments to handle it
