# Hexagonoids: multi-discrete output upgrade

How to bring HexagonoidsEnvironment in line with proper multi-discrete softmax outputs for all three evaluation modes (vanilla, AC, QL).

## Current state

The environment has 4 outputs: `[thrust, fire, left, right]`. The `decodeOutputs()` function applies a 0.75 threshold to convert continuous outputs to boolean button presses:

```typescript
// decodeOutputs.ts
const ACTIVATION_THRESHOLD = 0.75
return {
  thrust: outputs[0] > ACTIVATION_THRESHOLD,
  fire:   outputs[1] > ACTIVATION_THRESHOLD,
  left:   leftActive,   // with left/right conflict resolution
  right:  rightActive,
}
```

This works for vanilla NEAT with Sigmoid outputs (values in [0, 1]) but breaks down for RL agents:

- **AC agent** returns one-hot vectors from `act()` — values are 0 or 1, but the meaning is wrong. A one-hot `[1, 0, 0, 0]` means "I chose action 0" (a single categorical choice), not "thrust=on, fire=off, left=off, right=off". AC currently can't express "thrust AND fire" because it picks exactly one action.

- **QL agent** in standard mode also returns one-hot — same problem. In multi-discrete mode it returns binary `[0, 1, 0, 1]` which would work with the threshold decoder, but the network needs 8 outputs (Q_on/Q_off pairs), not 4.

- **Vanilla** works with the current setup but the 0.75 threshold is arbitrary. With multi-discrete softmax, the decision would be principled: each factor's softmax group naturally outputs a probability of on vs off.

## The core problem

There are three layers that need to agree:

```
Network outputs  →  Agent action selection  →  Environment action decoding
(activations)       (sampling/argmax)          (decodeOutputs)
```

Right now each algorithm produces different shaped outputs:
- Vanilla: 4 Sigmoid values → threshold at 0.75 → 4 booleans
- AC: 4+1 Softmax+Linear → categorical sample → 1 one-hot (wrong shape for 4 buttons)
- QL standard: 4 Linear → epsilon-greedy argmax → 1 one-hot (wrong shape for 4 buttons)
- QL multi-discrete: 8 Linear → per-factor epsilon-greedy → 4 binary (correct shape, wrong output count)

## Proposed solution: multi-discrete softmax for all modes

Standardize on multi-discrete output encoding. Each of the 4 buttons gets a 2-way softmax group (on/off probability):

```
8 outputs for vanilla/AC: [P_thrust_on, P_thrust_off, ..., P_right_on, P_right_off]
  + 1 critic for AC:       [V(s)]
  = 9 total for AC, 8 for vanilla

8 outputs for QL:          [Q_thrust_on, Q_thrust_off, ..., Q_right_on, Q_right_off]
```

### Output activation configs

```typescript
// Vanilla: 4 independent softmax pairs
const vanillaOutputActivation = [
  [2, Activation.Softmax],  // thrust on/off
  [2, Activation.Softmax],  // fire on/off
  [2, Activation.Softmax],  // left on/off
  [2, Activation.Softmax],  // right on/off
] as const

// AC: 4 softmax pairs + 1 linear critic
const acOutputActivation = [
  [2, Activation.Softmax],  // thrust on/off
  [2, Activation.Softmax],  // fire on/off
  [2, Activation.Softmax],  // left on/off
  [2, Activation.Softmax],  // right on/off
  [1, Activation.Linear],   // V(s)
] as const

// QL: 8 linear Q-values (multi-discrete mode handles the pairing)
const qlOutputActivation = Activation.Linear
```

### New `decodeOutputs` for multi-discrete

Replace the threshold-based decoder with one that reads paired outputs:

```typescript
function decodeMultiDiscreteOutputs(outputs: ArrayLike<number>): PlayerInputState {
  // Each pair: index 2*i = on probability/Q-value, 2*i+1 = off
  // Action = "on" when first value >= second value
  return {
    thrust: (outputs[0] ?? 0) >= (outputs[1] ?? 0),
    fire:   (outputs[2] ?? 0) >= (outputs[3] ?? 0),
    left:   (outputs[4] ?? 0) >= (outputs[5] ?? 0),
    right:  (outputs[6] ?? 0) >= (outputs[7] ?? 0),
  }
}
```

This works uniformly for all three modes:
- **Vanilla with softmax pairs**: P_on >= P_off means the network prefers "on" → true
- **AC with softmax pairs**: same — the one-hot from `act()` would be per-factor, so outputs[2*i] = 1 when that factor is "on"
- **QL with Q-value pairs**: Q_on >= Q_off means the agent values "on" more → true

The left/right conflict resolution currently in `decodeOutputs` may no longer be needed — with independent softmax groups, the network can learn that left and right are anti-correlated through training. But it could be kept as a post-processing step if the game engine truly can't handle both pressed.

### How each agent's `act()` output maps to `decodeOutputs`

**Vanilla (no agent, pure executor):**
```
executor.forward([...34 inputs...])
  → Softmax per pair: [0.8, 0.2,  0.3, 0.7,  0.1, 0.9,  0.6, 0.4]
  → decodeMultiDiscreteOutputs: thrust=true, fire=false, left=false, right=true
```

No sampling needed. The softmax pairs directly encode the network's preference. This replaces the 0.75 threshold with a principled comparison: is on-probability > off-probability?

**AC (multi-discrete, requires new feature):**
```
agent.act([...34 inputs...])
  → forward: [0.8, 0.2,  0.3, 0.7,  0.1, 0.9,  0.6, 0.4,  V=0.42]
  → per-factor sample: [1, 0, 0, 1] (4 binary decisions)
  → returned as Float64Array(8): [1,0, 0,1, 0,1, 1,0]  ← one-hot per factor pair
  → decodeMultiDiscreteOutputs: thrust=true, fire=false, left=false, right=true
```

AC multi-discrete `act()` would return 2N values where each pair is one-hot (the sampled action for that factor). The decoder reads them the same way.

**QL (multi-discrete, already implemented):**
```
agent.act([...34 inputs...])
  → forward: [1.5, 0.3,  -0.2, 0.8,  0.1, 0.9,  1.1, 0.4]
  → per-factor epsilon-greedy: [1, 0, 0, 1]
  → returned as Float64Array(4): [1, 0, 0, 1]  ← binary per factor
```

Wait — QL multi-discrete returns N values (one per factor, 0 or 1), not 2N. So `decodeOutputs` for QL would need to handle the 4-value binary output directly:

```typescript
function decodeBinaryOutputs(outputs: ArrayLike<number>): PlayerInputState {
  return {
    thrust: (outputs[0] ?? 0) > 0.5,
    fire:   (outputs[1] ?? 0) > 0.5,
    left:   (outputs[2] ?? 0) > 0.5,
    right:  (outputs[3] ?? 0) > 0.5,
  }
}
```

This is the same shape as the current 4-output vanilla path, just with a 0.5 threshold (since values are 0 or 1).

### The translation belongs in the environment bridge

The EpisodeAgentBridge already sits between the RL agent and the game simulation:

```typescript
// Current bridge (EpisodeAgentBridge.ts)
const actionOutputs = rlAgent.act(floatInputs)
return decodeOutputs(actionOutputs)  // ← this is where translation happens
```

The bridge should select the right decoder based on the agent type or output count:

```typescript
const actionOutputs = rlAgent.act(floatInputs)
if (actionOutputs.length >= 8) {
  return decodeMultiDiscreteOutputs(actionOutputs)  // AC/vanilla with paired outputs
} else {
  return decodeBinaryOutputs(actionOutputs)          // QL multi-discrete binary
}
```

Or more cleanly, the decoder could be configured at bridge creation time based on the evaluator config.

### Vanilla path needs the same treatment

The vanilla path in `neatAgent.ts` also calls `decodeOutputs`:

```typescript
const outputs = context.executor.execute(inputs)
return decodeOutputs(outputs)
```

If vanilla switches to 8 softmax-paired outputs, the neatAgent needs to use the paired decoder too. This means the environment's `description.outputs` changes from 4 to 8, and genome creation must use the paired softmax activation config.

## Migration summary

| Component | Current | After |
|-----------|---------|-------|
| **Output count (vanilla)** | 4 | 8 |
| **Output count (AC)** | 5 (4 actor + 1 critic) | 9 (8 actor + 1 critic) |
| **Output count (QL)** | 4 or 8 (standard or multi-discrete) | 8 (multi-discrete only) |
| **Vanilla activation** | Sigmoid (default) | 4 × [2, Softmax] |
| **AC activation** | [4, Softmax], [1, Linear] | 4 × [2, Softmax], [1, Linear] |
| **QL activation** | Linear | Linear (unchanged) |
| **decodeOutputs** | 0.75 threshold on 4 values | paired comparison on 8 values (or binary on 4 for QL) |
| **Left/right conflict** | explicit in decoder | removed — network learns anti-correlation |
| **EpisodeAgentBridge** | calls decodeOutputs directly | selects decoder based on output shape |
| **neatAgent** | calls decodeOutputs directly | uses paired decoder |

## What needs to happen in neat-js first

1. **AC multi-discrete feature** (`packages/actor-critic/src/features/multi-discrete/`):
   - `sampleActionMultiDiscrete()` — per-factor binary sampling from softmax pairs
   - `computeACMultiDiscreteGradients()` — per-factor policy gradient + entropy
   - Config option: `multiDiscrete: true` + `factorCount: N`
   - The executor's softmax group support already handles multiple independent groups

2. **Output activation config validation** — ensure `[[2, Softmax], [2, Softmax], ..., [1, Linear]]` flows correctly through genome creation, phenotype building, and executor instantiation. The executor iterates softmax groups already, but this many groups hasn't been tested.

## What needs to happen in hexagonoids

1. **Update `HexagonoidsEnvironment`**:
   - `description.outputs` = 8 (or 9 for AC)
   - `getRLConfig().actionSize` = 4 (number of binary factors, not output count)
   - Config option for output mode (vanilla/ac/ql) or derive from evaluator config

2. **New decoder functions**:
   - `decodeMultiDiscreteOutputs(8 values)` — paired comparison
   - `decodeBinaryOutputs(4 values)` — simple threshold for QL returns
   - Factory that selects the right one based on output shape

3. **Update EpisodeAgentBridge** — use the right decoder

4. **Update neatAgent** — use paired decoder, or make it configurable

5. **Update hexagonoids-demo** — configure output activations per variant in EvolutionManager setup
