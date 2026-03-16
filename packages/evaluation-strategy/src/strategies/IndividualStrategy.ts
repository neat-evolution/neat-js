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
    for (const entry of genomeEntries) {
      const p = context.evaluateGenomeEntry(entry)
      promises.push(p)
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
