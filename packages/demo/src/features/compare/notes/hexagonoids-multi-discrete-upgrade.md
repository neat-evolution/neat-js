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

## The output shape mismatch

Each agent family's `act()` returns a fundamentally different shape:

| Agent | Network outputs | `act()` returns | Shape |
|-------|----------------|-----------------|-------|
| Vanilla (softmax pairs) | 8 (4 pairs) | 8 probabilities | 2N |
| AC multi-discrete | 8+1 (4 pairs + critic) | 8 (one-hot per pair) | 2N |
| QL multi-discrete | 8 (Q-value pairs) | 4 binary (0 or 1) | N |

QL multi-discrete collapses the paired Q-values into a binary decision *inside* `act()` — the environment never sees the pairs. AC and vanilla pass the pairs through. These are genuinely different contracts and can't be unified into one decoder.

**Standard (non-multi-discrete) QL would be worse** for hexagonoids — it picks one action from N (mutually exclusive), which can't press two buttons simultaneously. Multi-discrete is the right mode.

## Proposed solution: environment-supplied decoders

The environment is the authority on what button presses mean. It should supply decoders for each agent family, since it knows the action semantics and the agent families have known, fixed output contracts.

### Decoder functions

```typescript
type ActionDecoder = (outputs: ArrayLike<number>) => PlayerInputState

// For vanilla and AC: 2N paired outputs → compare pairs
// Works because vanilla outputs softmax probabilities directly,
// and AC multi-discrete act() returns one-hot per pair
const pairedDecoder: ActionDecoder = (outputs) => ({
  thrust: (outputs[0] ?? 0) >= (outputs[1] ?? 0),
  fire:   (outputs[2] ?? 0) >= (outputs[3] ?? 0),
  left:   (outputs[4] ?? 0) >= (outputs[5] ?? 0),
  right:  (outputs[6] ?? 0) >= (outputs[7] ?? 0),
})

// For QL multi-discrete: N binary outputs → threshold
const binaryDecoder: ActionDecoder = (outputs) => ({
  thrust: (outputs[0] ?? 0) > 0.5,
  fire:   (outputs[1] ?? 0) > 0.5,
  left:   (outputs[2] ?? 0) > 0.5,
  right:  (outputs[3] ?? 0) > 0.5,
})
```

### Decoder selection

The decoder is selected based on output length, which is determined by the evaluator config:

```typescript
function selectDecoder(outputLength: number): ActionDecoder {
  if (outputLength >= 8) {
    return pairedDecoder   // vanilla (8) or AC (8, critic stripped by act())
  }
  return binaryDecoder     // QL multi-discrete (4)
}
```

This is simple and correct because:
- Vanilla with softmax pairs outputs 8 values → paired decoder
- AC multi-discrete `act()` returns 8 values (critic is internal) → paired decoder
- QL multi-discrete `act()` returns 4 values → binary decoder
- Vanilla could also work with 4 Sigmoid outputs + binary decoder (for experimentation)

### Where the decoders live

The decoders are baked into the environment package (`hexagonoids-environment`), not injected from outside. The environment knows its action semantics (4 buttons), and the agent families have stable, known output contracts.

The call sites are already in the right places:

```typescript
// neatAgent.ts — vanilla path
const outputs = context.executor.execute(inputs)
return selectDecoder(outputs.length)(outputs)

// EpisodeAgentBridge.ts — RL path
const actionOutputs = rlAgent.act(floatInputs)
return selectDecoder(actionOutputs.length)(actionOutputs)
```

For future exotic agent families with new output shapes, the environment would need a new decoder. But since agent families are defined in neat-js packages with stable contracts, new decoders only appear when new agent families are added — which is infrequent enough to handle case-by-case.

The harder problem of passing custom decoders over the wire to workers (pathnames, not functions) is not needed yet. The environment already runs in the worker and owns its decoders. The evaluator config just tells it which agent factory to use, and the environment selects the right decoder based on what `act()` returns.

### Vanilla can work with either output count

Vanilla doesn't care about output semantics — evolution optimizes whatever shape you give it. So vanilla can run with:
- **8 outputs (4 softmax pairs)**: more parameters, principled on/off probabilities, shares decoder with AC
- **4 outputs (Sigmoid or 4×[1,Softmax])**: fewer parameters, simpler topology, uses binary decoder

This is worth experimenting with. The decoder adapts automatically based on output length.

## Output activation configs

```typescript
// Vanilla (paired): 4 independent softmax pairs
const vanillaPairedActivation = [
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

// QL: 8 linear Q-values (multi-discrete mode handles the pairing internally)
const qlOutputActivation = Activation.Linear
```

## Migration summary

| Component | Current | After |
|-----------|---------|-------|
| **Output count (vanilla)** | 4 | 8 (or keep 4 for comparison) |
| **Output count (AC)** | 5 (4 actor + 1 critic) | 9 (8 actor + 1 critic) |
| **Output count (QL)** | 8 (multi-discrete) | 8 (unchanged) |
| **Vanilla activation** | Sigmoid (default) | 4 × [2, Softmax] |
| **AC activation** | [4, Softmax], [1, Linear] | 4 × [2, Softmax], [1, Linear] |
| **QL activation** | Linear | Linear (unchanged) |
| **decodeOutputs** | 0.75 threshold on 4 values | replaced by pairedDecoder + binaryDecoder |
| **Left/right conflict** | explicit in decoder | removed — network learns anti-correlation |
| **Decoder selection** | none (one decoder) | by output length: >= 8 → paired, else → binary |
| **EpisodeAgentBridge** | hardcoded decodeOutputs | selectDecoder(outputs.length) |
| **neatAgent** | hardcoded decodeOutputs | selectDecoder(outputs.length) |

## What needs to happen in neat-js first

1. **AC multi-discrete feature** (`packages/actor-critic/src/features/multi-discrete/`):
   - `sampleActionMultiDiscrete()` — per-factor binary sampling from softmax pairs
   - `computeACMultiDiscreteGradients()` — per-factor policy gradient + entropy
   - Config option: `multiDiscrete: true` + `factorCount: N`
   - The executor already supports multiple independent softmax groups in both forward and backward passes — the gap is in the agent-side action selection and gradient computation
   - QL's multi-discrete implementation (`createQLAgent.ts`, `computeQLOutputErrors.ts`, `trainOnSegment.ts`) is a good reference for the per-factor patterns

2. **Output activation config validation** — ensure `[[2, Softmax], [2, Softmax], ..., [1, Linear]]` flows correctly through genome creation, phenotype building, and executor instantiation. The executor iterates softmax groups already, but this many groups hasn't been tested.

## What needs to happen in hexagonoids

1. **New decoder module** (`encoding/actionDecoders.ts`):
   - `pairedDecoder` — 2N paired outputs → N booleans (vanilla + AC)
   - `binaryDecoder` — N binary outputs → N booleans (QL)
   - `selectDecoder(outputLength)` — picks the right one
   - Deprecate/remove old `decodeOutputs.ts` with 0.75 threshold

2. **Update call sites**:
   - `neatAgent.ts`: `return selectDecoder(outputs.length)(outputs)`
   - `EpisodeAgentBridge.ts`: `return selectDecoder(actionOutputs.length)(actionOutputs)`

3. **Update `HexagonoidsEnvironment`**:
   - `description.outputs` — configurable (8 for paired vanilla/AC, 8 for QL)
   - `getRLConfig().actionSize` = 4 (number of binary factors, not output count)

4. **Update hexagonoids-demo** — configure output activations per variant in EvolutionManager setup
