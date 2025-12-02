# State Management in neat-js

This document provides a detailed comparison between the original Rust
implementation's state management approach and the simplified approach used in
neat-js. It also discusses the algorithmic implications of each approach for the
NEAT (NeuroEvolution of Augmenting Topologies) algorithm.

## Table of Contents

1. [Overview](#overview)
2. [Original Rust Implementation](#original-rust-implementation)
3. [neat-js Implementation](#neat-js-implementation)
4. [Algorithmic Comparison](#algorithmic-comparison)
5. [Concerns and Considerations](#concerns-and-considerations)
6. [Conclusion](#conclusion)

---

## Overview

State management in NEAT is primarily concerned with tracking **innovations** —
structural mutations to neural network topologies. The innovation system serves
a critical purpose: enabling meaningful crossover between genomes with different
structures by providing a historical record of how each gene (node or link) was
introduced.

The original NEAT paper by Kenneth Stanley establishes that:

> "Whenever a new gene appears (through structural mutation), a global
> innovation number is incremented and assigned to that gene. The innovation
> numbers thus represent a chronology of the appearance of every gene in the
> system."

Both implementations track innovations, but they use fundamentally different
strategies.

---

## Original Rust Implementation

**Source:** `/Users/heygrady/projects/des-hyperneat/evolution/src/neat/state.rs`

### Architecture

The Rust implementation uses a centralized `InnovationLog` with multiple lookup
tables:

```rust
pub struct InnovationLog {
    // Hidden node id -> Innovation
    pub hidden_node_innovations: HashMap<u64, Innovation>,
    // Link split innovation -> Innovation
    pub split_innovations: HashMap<u64, Innovation>,
    // Source and target node -> link connect innovation
    pub connect_innovations: HashMap<(NodeRef, NodeRef), u64>,
    // Link connect innovation -> Source and target node
    pub reverse_connect_innovations: HashMap<u64, (NodeRef, NodeRef)>,
    // Hidden node -> Source and target node
    pub hidden_to_link: HashMap<NodeRef, (NodeRef, NodeRef)>,
}

pub struct Innovation {
    pub node_number: u64,
    pub innovation_number: u64,
}
```

### How It Works

1. **Incrementing Counters**: The state maintains `next_innovation` containing
   the next available `node_number` and `innovation_number`.

2. **Connection Innovation (`get_connect_innovation`)**:
   - Checks if a connection between `(from, to)` already exists in
     `connect_innovations`
   - If not, assigns the next innovation number, stores it, and increments the
     counter
   - Returns the same innovation number for identical connections discovered
     independently

3. **Split Innovation (`get_split_innovation`)**:
   - When splitting a link, checks if that link's innovation has been split
     before
   - If not, assigns a new hidden node ID and two new connection innovations
   - Increments counters: `node_number += 1`, `innovation_number += 3` (for the
     two new links and the hidden node)
   - Stores bidirectional mappings for future lookups

### Key Characteristics

- **Registry-based**: All innovations are registered in a central mutable state
- **Deterministic ordering**: Innovation numbers reflect chronological order of
  discovery
- **Global synchronization required**: In multi-threaded/worker scenarios, this
  state must be synchronized
- **Memory growth**: The registry grows unboundedly as evolution progresses

---

## neat-js Implementation

**Source:** `./CoreState.ts`, `./StateProvider.ts`, `./hashInnovationKey.ts`

### Architecture

The neat-js implementation eliminates the registry entirely in favor of
deterministic hashing:

```typescript
// CoreState.ts
class CoreState {
   getSplitInnovation(
      innovationKey: InnovationKey,
   ): NodeKey | Promise<NodeKey> {
      const nodeId = hashInnovationKey(innovationKey);
      const nodeKey = toNodeKey(NodeType.Hidden, nodeId);
      return nodeKey;
   }

   getConnectInnovation(
      from: NodeKey,
      to: NodeKey,
   ): InnovationKey | Promise<InnovationKey> {
      return from + ":" + to;
   }
}
```

### How It Works

1. **Connection Innovation**: Simply concatenates the source and target node
   keys: `"h123:o0"` (hidden node 123 to output 0)

2. **Split Innovation**:
   - Takes the existing link's innovation key (e.g., `"i0:o0"`)
   - Hashes it deterministically using a djb2-style hash function
   - Returns a new hidden node key based on the hash

3. **Hash Function** (`hashInnovationKey`):
   ```typescript
   const hashNodeKey = (key: string, hash: number = 0) => {
      for (let i = 0; i < key.length; i++) {
         const char = key.charCodeAt(i);
         hash = (hash << 5) - hash + char;
         hash >>>= 0;
      }
      return hash;
   };
   ```

### Key Characteristics

- **Stateless**: No mutable registry; innovations are computed on-demand
- **Deterministic**: Same structural mutation always produces the same
  innovation identifier
- **Worker-friendly**: No synchronization needed; each worker can compute
  innovations independently
- **Bounded memory**: No registry growth; only a small LRU cache for performance
- **String-based keys**: Uses human-readable string keys instead of numeric IDs

---

## Algorithmic Comparison

### Innovation Tracking Purpose in NEAT

The original NEAT paper describes three key uses for innovation numbers:

1. **Gene alignment during crossover**: Matching genes (same innovation) are
   inherited from the fitter parent or randomly; disjoint/excess genes come from
   the fitter parent
2. **Speciation**: Comparing genome structure via innovation differences
3. **Historical marking**: Tracking when mutations occurred

### Equivalence Analysis

| Aspect                  | Rust (Registry)        | neat-js (Hashing)     | Equivalent?   |
| ----------------------- | ---------------------- | --------------------- | ------------- |
| Same mutation → same ID | ✅ Registry lookup     | ✅ Deterministic hash | **Yes**       |
| Gene alignment          | ✅ Numeric comparison  | ✅ String comparison  | **Yes**       |
| Speciation              | ✅ Innovation counting | ✅ Key set comparison | **Yes**       |
| Temporal ordering       | ✅ Chronological       | ❌ Hash-based         | **No**        |
| Cross-run consistency   | ❌ Run-dependent       | ✅ Always consistent  | **Different** |

### Critical Insight: What Really Matters

The **essential property** for NEAT crossover is:

> If two genomes independently evolve the same structural mutation, that
> mutation should be recognized as the same gene.

Both implementations satisfy this property:

- **Rust**: Looks up `(from, to)` in the registry; returns same innovation if
  found
- **neat-js**: Computes `from + ':' + to`; identical by construction

The **non-essential property** that differs:

> Innovation numbers reflect the temporal order of discovery across the
> population.

The original NEAT paper uses chronological ordering primarily for distinguishing
"disjoint" vs "excess" genes during crossover. However, the actual crossover
implementation in both Rust and neat-js treats all non-matching genes the same
way (inherited from fitter parent), making this distinction algorithmically
irrelevant.

---

## Concerns and Considerations

### Potential Concerns

#### 1. Hash Collisions

**Risk**: Two different link splits could theoretically produce the same hash.

**Mitigation**:

- The djb2-style hash has good distribution properties
- Node keys include type prefixes (`i`, `h`, `o`) reducing collision likelihood
- Even with 32-bit hashes, billions of unique innovations are possible
- The LRU cache prevents recomputation but doesn't affect correctness

**Assessment**: Low risk. Hash collisions in this context would need to occur
between commonly-split links, and even then, the result is merely that two
different structural mutations might share an identifier — which could slightly
reduce diversity but wouldn't break the algorithm.

#### 2. Loss of Temporal Information

**Risk**: Cannot distinguish "old" vs "new" genes.

**Impact**:

- Original NEAT distinguishes disjoint (within range) vs excess (beyond range)
  genes
- This distinction was used for weighting in the distance calculation

**Mitigation**:

- Modern NEAT implementations often ignore this distinction
- The distance calculation in `CoreGenome.distance()` treats all non-matching
  genes equally
- Speciation still works effectively based on structural differences alone

**Assessment**: Minimal impact. The temporal aspect of innovation numbers is
largely a vestige of the original implementation's concerns about genome size
normalization.

#### 3. Determinism Across Runs

**Difference**: Registry-based approaches produce different innovation numbers
across runs (dependent on mutation order), while hash-based approaches are fully
deterministic.

**Impact**:

- Hash-based: Same initial conditions → same innovation identifiers
- Registry-based: Same initial conditions → different IDs based on random
  mutation order

**Assessment**: This is actually an **advantage** of the hash-based approach for
reproducibility and debugging.

### Confirmed Safe Design Decisions

1. **Worker Parallelization**: The hash-based approach is inherently thread-safe
   with no coordination overhead. The registry approach would require:
   - Mutex/lock protection, or
   - Message passing for innovation requests, or
   - Post-reproduction synchronization

2. **Serialization**: Hash-based innovation keys are self-describing strings
   that serialize/deserialize naturally without needing to preserve counter
   state.

3. **Memory Efficiency**: No unbounded growth of innovation registries.

---

## Conclusion

### Is the neat-js Approach a Faithful NEAT Implementation?

**Yes**, with a minor caveat.

The core algorithmic requirements of NEAT are preserved:

1. ✅ **Structural innovation tracking**: Same mutation → same identifier
2. ✅ **Meaningful crossover**: Gene alignment works correctly via string key
   comparison
3. ✅ **Speciation**: Genome distance calculation remains valid
4. ✅ **Competing conventions protection**: Identical structural mutations in
   different lineages are recognized as the same gene

The minor deviation:

- ❌ **No chronological ordering**: The distinction between disjoint and excess
  genes is lost

This deviation has **no practical impact** on the algorithm's effectiveness
because:

1. The crossover implementation treats all non-matching genes identically
2. The distance function doesn't weight genes by age
3. Modern NEAT research has shown this distinction is not critical for
   performance

### Advantages of the neat-js Approach

1. **Simplicity**: No complex registry management
2. **Parallelization**: Trivially worker-safe without synchronization
3. **Reproducibility**: Deterministic across runs
4. **Memory**: Bounded memory usage
5. **Debugging**: Human-readable innovation keys (e.g., `"i0:h3c2f:o1"`)

### Recommendation

The hash-based approach in neat-js is a valid and arguably superior
implementation choice for JavaScript/TypeScript environments where worker
parallelization is essential. The algorithmic trade-off (loss of temporal
ordering) has negligible impact on NEAT's evolutionary effectiveness while
providing significant engineering benefits.

If temporal ordering becomes necessary for future research, it could be added as
an optional overlay without changing the core innovation identification system.
