import type {
  AnyGenome,
  FitnessData,
  GenomeEntries,
} from '@neat-evolution/core'
import type { EvaluationStrategy } from '../EvaluationStrategy.js'
import type { ParentEvaluationContext } from '../ParentEvaluationContext.js'

export class IndividualStrategy<G extends AnyGenome = AnyGenome>
  implements EvaluationStrategy<G>
{
  async *evaluate(
    context: ParentEvaluationContext<G>,
    genomeEntries: GenomeEntries<G>
  ): AsyncIterable<FitnessData> {
    const promises: Array<Promise<FitnessData>> = []

    // process in parallel
    let organismIndex = 0
    for (const entry of genomeEntries) {
      const seed = context.rng?.derive(`organism:${organismIndex}`).toSeed()
      const p = context.evaluateGenomeEntry(entry, seed)
      promises.push(p)
      organismIndex++
    }

    // yield sequentially
    while (promises.length > 0) {
      const p = promises.shift()
      if (p != null) {
        yield await p
      }
    }
  }
}
