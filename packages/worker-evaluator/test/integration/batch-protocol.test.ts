// @vitest-environment jsdom
import type { GenomeFactoryOptions } from '@neat-evolution/core'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { handleEvaluateBatch } from '../../src/worker/handleEvaluateBatch.js'
import type { ThreadContext } from '../../src/worker/ThreadContext.js'

describe('handleEvaluateBatch', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  test('should call environment.evaluateBatch and post a response', async () => {
    const mockEnvironment = {
      evaluateBatch: vi.fn().mockReturnValue([1.0, 2.0]),
      evaluateBatchAsync: vi.fn(),
      isAsync: false,
    }

    const mockThreadContext: ThreadContext = {
      genomeFactoryConfig: {
        configProvider: {} as any,
        stateProvider: {} as any,
        genomeOptions: {} as any,
        initConfig: {} as any,
      },
      threadInfo: {
        createGenome: vi.fn().mockReturnValue({}),
        createPhenotype: vi.fn().mockReturnValue({}),
        createExecutor: vi.fn().mockReturnValue({ isAsync: false }),
        environment: mockEnvironment,
      } as any,
    }

    const batchGenomeOptions: Array<GenomeFactoryOptions<any, any>> = [
      { genomeData: { nodes: [], links: [] } } as any,
      { genomeData: { nodes: [], links: [] } } as any,
    ]

    const result = await handleEvaluateBatch(
      { genomeOptions: batchGenomeOptions },
      mockThreadContext
    )

    expect(mockEnvironment.evaluateBatch).toHaveBeenCalledTimes(1)
    expect(result).toEqual([1.0, 2.0])
  })
})
