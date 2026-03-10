// @vitest-environment jsdom
import type { GenomeFactoryOptions } from '@neat-evolution/core'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { handleEvaluateBatch } from '../../src/worker/handleEvaluateBatch.js'
import type { ThreadContext } from '../../src/worker/ThreadContext.js'

const stubConfigProvider = {} as unknown as NonNullable<
  ThreadContext['genomeFactoryConfig']
>['configProvider']
const stubStateProvider = {} as unknown as NonNullable<
  ThreadContext['genomeFactoryConfig']
>['stateProvider']
const stubGenomeOptions = {} as unknown as NonNullable<
  ThreadContext['genomeFactoryConfig']
>['genomeOptions']
const stubInitConfig = {} as unknown as NonNullable<
  ThreadContext['genomeFactoryConfig']
>['initConfig']
const stubThreadInfo = {} as unknown as NonNullable<ThreadContext['threadInfo']>
const stubGenomeFactoryOptions = {
  genomeData: { nodes: [], links: [] },
} as unknown as GenomeFactoryOptions

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
        configProvider: stubConfigProvider,
        stateProvider: stubStateProvider,
        genomeOptions: stubGenomeOptions,
        initConfig: stubInitConfig,
      },
      executorCache: undefined,
      threadInfo: {
        createGenome: vi.fn().mockReturnValue({}),
        createPhenotype: vi.fn().mockReturnValue({}),
        createExecutor: vi.fn().mockReturnValue({ isAsync: false }),
        environment: mockEnvironment,
      } as unknown as typeof stubThreadInfo,
    }

    const batchGenomeOptions: Array<GenomeFactoryOptions> = [
      stubGenomeFactoryOptions,
      stubGenomeFactoryOptions,
    ]

    const result = await handleEvaluateBatch(
      { genomeOptions: batchGenomeOptions },
      mockThreadContext
    )

    expect(mockEnvironment.evaluateBatch).toHaveBeenCalledTimes(1)
    expect(result).toEqual([1.0, 2.0])
  })
})
