import * as workerpool from 'workerpool'

import type {
  Evaluator,
  FitnessData,
  PhenotypeData,
} from '@neat-js/evaluator'

export class WorkerpoolEvaluator implements Evaluator {
  private readonly pool: workerpool.WorkerPool

  constructor(taskCount: number, threadCount: number) {
    this.pool = workerpool.pool(
      new URL('/workerpoolEvaluator.js', import.meta.url).href,
      {
        maxWorkers: threadCount,
        // @ts-expect-error missing types
        maxQueueSize: taskCount,
      }
    )
  }

  async *evaluate(
    organisms: Iterable<PhenotypeData>
  ): AsyncIterable<FitnessData> {
    const tasks: Array<Promise<FitnessData>> = []
    for (const organism of organisms) {
      tasks.push(
        this.pool.exec<(input: PhenotypeData) => FitnessData>('evaluateTask', [
          organism,
        ]) as unknown as Promise<FitnessData>
      )
    }
    for (const task of tasks) {
      yield await task
    }
  }

  // Terminate the worker pool when you're done
  async terminate() {
    await this.pool.terminate()
  }
}
