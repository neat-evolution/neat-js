# Phase 4 RL Comparison Workflow

This note explains how to run and interpret the episodic bandit demo that closes
Phase 4. It focuses on the three required comparisons:

1. Vanilla evolution vs Actor-Critic (Lamarckian)
2. Vanilla evolution vs Q-learning
3. Actor-Critic Lamarckian vs Actor-Critic Darwinian

The CLI lives at `yarn workspace @neat-evolution/demo episodic`. All examples
below assume you run from the repository root.

## Environment and Goals

- Environment: 3-episode multi-armed bandit, 20 steps per episode.
- Shared constants: NEAT algorithm, population defaults, `evaluateAgent(agent)`
  for RL variants, `'episode'` rollout segments, and Lamarckian writeback
  defaults for RL unless noted.
- Goal: show how the RL plugins augment the vanilla evaluation contract without
  changing the environment or evolutionary wiring.

## Command Quick Reference

```sh
yarn workspace @neat-evolution/demo episodic \
  --iterations 150 \
  --lr 0.01 \
  --seed my-run \
  --entropy 0.02 \
  --epsilon 0.2 --epsilon-decay 0.9 --epsilon-min 0.05
```

Flags:

| Flag | Meaning |
| --- | --- |
| `--iterations N` | Evaluation iterations per variant (default `100`). |
| `--seconds N` | Optional wall-time ceiling (0 = unlimited). |
| `--lr N` | Learning rate shared by AC and Q-learning plugins. |
| `--seed label` | Seeds NEAT's thread RNG (`phase4-demo` by default); use `--no-seed` for stochastic behavior. |
| `--ac-seed label` / `--ql-seed label` | Override the derived RNG used by each RL method while keeping the population seed fixed. |
| `--entropy N` | Actor-Critic entropy coefficient. |
| `--epsilon N` / `--epsilon-decay N` / `--epsilon-min N` | Q-learning epsilon schedule. |

The CLI prints the parsed configuration (path, method, Lamarckian flag, seeds,
rollout semantics), the generation-by-generation fitness table, and the
comparison summary that spells out the constants and deltas for each pairing.

## Held-Constant Checklist

- Environment, observation encoding, reward model, and fitness aggregation.
- Evolution options except for the evaluation plugin (`iterations`, selection,
  reproduction, etc.).
- Rollout settings: `'episode'` capture and `rewardThreshold = 0.1`.
- Actor-Critic vs Q-learning share the same learning rate so per-method gains
  stem from algorithmic differences, not hyperparameter drift.

## Pairwise Comparisons

### Vanilla Evolution vs Actor-Critic (Lamarckian)

- **Constants:** Everything listed above plus identical RNG seeds (unless
  `--ac-seed` overrides it).
- **Changes:** AC plugin owns `evaluateAgent()`, captures rollout segments,
  applies entropy-regularised updates, and writes weights back to the genome
  after each evaluation.
- **Readout:** Expect the AC run to show additional backward-pass time but
  higher peak fitness; the comparison summary prints the Δ best fitness and
  highlights that the only change is the RL plugin.

### Vanilla Evolution vs Q-Learning

- **Constants:** Same as above (shared RNG if `--ql-seed` is omitted).
- **Changes:** Q-learning plugin handles `evaluateAgent()`, runs an epsilon
  schedule, computes TD errors, and performs Lamarckian writeback.
- **Readout:** Watch the epsilon values in the configuration dump to confirm
  the intended schedule, then inspect the comparison summary for the fitness
  delta.

### Actor-Critic Lamarckian vs Actor-Critic Darwinian

- **Constants:** Identical AC config, seeds, rollout semantics, and training
  triggers.
- **Changes:** Lamarckian variant writes trained weights back; Darwinian
  discards them after fitness is returned.
- **Readout:** The summary makes it explicit that Lamarckian inheritance is the
  only delta so any fitness gap is attributed to weight reuse.

## Deterministic Seeding

- `--seed foo` seeds the global `threadRNG()`, which governs both evolution and
  the default RL RNGs. `--no-seed` leaves the RNG unseeded for exploratory runs.
- RL plugins derive seeds from the base seed (`<seed>:ac-lamarck`,
  `<seed>:ac-darwin`, `<seed>:q-learning`) so repeated runs are reproducible
  even when multiple variants execute sequentially.
- Use `--ac-seed` or `--ql-seed` if you need per-method determinism while
  letting the population evolve stochastically.

## Method-Specific Knobs

- **Actor-Critic:** `--entropy` feeds the plugin's `entropyCoefficient`.
  Rollout length stays in `'episode'` mode to match the multi-episode loop.
- **Q-learning:** The epsilon schedule is fully exposed via CLI flags; telemetry
  echoes `epsilonInitial`, `epsilonDecayPerEpisode`, and `epsilonMinimum` so
  logs can be audited later.

With these guardrails you can hand a teammate a single command that recreates a
specific comparison and know exactly what changed between variants.
