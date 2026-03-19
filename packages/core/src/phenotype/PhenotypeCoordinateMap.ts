import type { Phenotype } from './Phenotype.js'

export interface LinkCoord {
  actionIndex: number
  x0: number
  y0: number
  x1: number
  y1: number
  /** Key identifying the sub-CPPN that produced this connection (DES-HyperNEAT only). */
  sourceKey?: number
  /** Whether this coordinate came from a link CPPN or node CPPN phase. */
  sourceType?: 'link' | 'node'
  /** Raw output from the sub-CPPN before applying genome link weight. */
  subCPPNOutput?: number
  /** Genome link weight that scaled the sub-CPPN output (link CPPNs only). */
  linkWeight?: number
}

export interface NodeCoord {
  actionIndex: number
  x: number
  y: number
  /** Key identifying the sub-CPPN that produced this node (DES-HyperNEAT only). */
  sourceKey?: number
  /** Whether this coordinate came from a link CPPN or node CPPN phase. */
  sourceType?: 'link' | 'node'
  /** NodeKey of the target substrate node for bias gradient routing (DES-HyperNEAT only). */
  targetNodeKey?: number
}

/**
 * Maps substrate actions back to the CPPN query coordinates that produced them.
 * Populated by HyperNEAT createPhenotype when Lamarckian training is enabled.
 * Used by `chainBackward` to replay coordinates through the CPPN backward pass.
 */
export interface PhenotypeCoordinateMap {
  linkCoords: LinkCoord[]
  nodeCoords: NodeCoord[]
  /** The CPPN phenotype used to generate this substrate. */
  cppnPhenotype: Phenotype
}
