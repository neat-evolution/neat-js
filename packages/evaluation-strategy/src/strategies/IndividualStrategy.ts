import type {
  AnyGenome,
  FitnessData,
  GenomeEntries,
} from '@neat-evolution/evaluator'

import type { EvaluationContext } from '../EvaluationContext.js'
import type { EvaluationStrategy } from '../EvaluationStrategy.js'

export class IndividualStrategy<G extends AnyGenome<G>>
  implements EvaluationStrategy<G>
{
  async *evaluate(
    context: EvaluationContext<G>,
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
