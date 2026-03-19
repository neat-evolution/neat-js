import type { PhenotypeAction } from './phenotype/PhenotypeAction.js'

/**
 * Algorithm-agnostic payload returned by `transformWriteback` and consumed by
 * `Algorithm.writeBackWeights`. Carries the primary CPPN actions plus optional
 * per-sub-CPPN auxiliary writebacks (used by DES-HyperNEAT).
 *
 * `auxiliary` uses a plain array of tuples instead of Map so the payload is
 * structured-cloneable (required for worker transport).
 */
export interface WritebackPayload {
  actions: PhenotypeAction[]
  auxiliary?: Array<[key: number, actions: PhenotypeAction[]]>
  /** Per-node bias deltas. Applied directly to node.bias. DES-HyperNEAT only. */
  nodeBiasDeltas?: Array<[nodeKey: number, delta: number]>
}
