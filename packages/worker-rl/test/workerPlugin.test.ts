import { PhenotypeActionType } from '@neat-evolution/core'
import type { Handler, WorkerContext } from '@neat-evolution/worker-actions'
import type { ThreadContext } from '@neat-evolution/worker-evaluator/worker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import workerPlugin from '../src/workerPlugin.js'

const mockUpdatedActions = [[PhenotypeActionType.Link, 0, 1, 0.42] as const]

const mockTrainableExecutor = () => ({
  forward: vi.fn(),
  backward: vi.fn(),
  getUpdatedActions: vi.fn().mockReturnValue(mockUpdatedActions),
})

const mockSegment =
  (): import('@neat-evolution/environment').RolloutSegment => ({
    transitions: [
      {
        state: new Float64Array([0]),
        rawOutput: new Float64Array([0, 0, 0]),
        action: new Float64Array([1, 0]),
        reward: 1,
        done: true,
        actionProbabilities: new Float64Array([0.25, 0.75]),
      },
    ],
    trigger: 'reward',
    episodeIndex: 0,
  })

let mockACAgentConfig: {
  onSegmentTrained?: (
    segment: import('@neat-evolution/environment').RolloutSegment
  ) => void
}
let mockQLAgentConfig: {
  onSegmentTrained?: (
    segment: import('@neat-evolution/environment').RolloutSegment
  ) => void
}

vi.mock('@neat-evolution/backprop', () => ({
  createTrainableExecutor: vi.fn(() => mockTrainableExecutor()),
}))

vi.mock('@neat-evolution/actor-critic', () => ({
  createACAgent: vi.fn((_trainable, config) => {
    mockACAgentConfig = config
    return {
      act: vi.fn(),
      reward: vi.fn(() => {
        mockACAgentConfig.onSegmentTrained?.(mockSegment())
      }),
      startEpisode: vi.fn(),
      endEpisode: vi.fn(),
      setTransitionInfo: vi.fn(),
    }
  }),
}))

vi.mock('@neat-evolution/q-learning', () => ({
  createQLAgent: vi.fn((_trainable, config) => {
    mockQLAgentConfig = config
    return {
      act: vi.fn(),
      reward: vi.fn(() => {
        mockQLAgentConfig.onSegmentTrained?.(mockSegment())
      }),
      startEpisode: vi.fn(),
      endEpisode: vi.fn(),
      setTransitionInfo: vi.fn(),
    }
  }),
}))

// biome-ignore lint/suspicious/noExplicitAny: test mock
const makeAgentEnvironment = (): any => ({
  isAsync: false,
  evaluate: vi.fn(),
  evaluateAsync: vi.fn(),
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  evaluateAgent: vi.fn((agent: any) => {
    agent.startEpisode({ episodeIndex: 0 })
    agent.reward(1, true)
    agent.endEpisode({
      fitness: 1,
      episodeReturn: 1,
      totalSteps: 1,
      terminated: true,
    })
    return 42
  }),
})

const makeThreadContext = (
  pluginData?: Record<string, unknown>
): ThreadContext => {
  const environment = makeAgentEnvironment()
  return {
    handler: undefined,
    executorCache: undefined,
    pluginData,
    threadInfo: {
      createConfig: vi.fn(),
      createExecutor: vi.fn(),
      createGenome: vi.fn(() => ({})),
      createPhenotype: vi.fn(() => ({
        length: 2,
        inputs: [0],
        outputs: [1],
        actions: [],
      })),
      createState: vi.fn(),
      environment:
        environment as unknown as import('@neat-evolution/environment').Environment,
    },
    genomeFactoryConfig: {
      configProvider: {} as never,
      stateProvider: {} as never,
      genomeOptions: {} as never,
      initConfig: {} as never,
    },
  } as unknown as ThreadContext
}

const makeHandler = (): Handler =>
  ({
    register: vi.fn(),
  }) as unknown as Handler

describe('workerPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('declares RL capabilities on threadContext', () => {
    const handler = makeHandler()
    const threadContext = makeThreadContext()

    workerPlugin(handler, threadContext as ThreadContext & WorkerContext)

    const rlCapabilities = threadContext.workerCapabilities?.rl
    expect(rlCapabilities?.supported).toBe(true)
    expect(rlCapabilities?.methods?.['actor-critic']?.supported).toBe(true)
    expect(
      rlCapabilities?.methods?.['actor-critic']?.supportsLamarckianWriteback
    ).toBe(true)
    expect(rlCapabilities?.methods?.['q-learning']?.supported).toBe(true)
    expect(
      rlCapabilities?.methods?.['q-learning']?.supportsLamarckianWriteback
    ).toBe(true)
  })

  it('does not install evaluationEnhancer when no pluginData.rl', () => {
    const handler = makeHandler()
    const threadContext = makeThreadContext()

    workerPlugin(handler, threadContext as ThreadContext & WorkerContext)

    expect(threadContext.evaluationEnhancer).toBeUndefined()
  })

  it('installs evaluationEnhancer when pluginData.rl is present', () => {
    const handler = makeHandler()
    const threadContext = makeThreadContext({
      rl: {
        method: 'actor-critic',
        isLamarckian: true,
        config: {
          learningRate: 0.01,
          actionCount: 2,
          gradientConfig: {
            discountFactor: 0.99,
            entropyCoefficient: 0.01,
            clipGradients: false,
            gradientClipValue: 1,
          },
          rolloutConfig: {
            rolloutLength: 4,
            rewardThreshold: 0.1,
          },
        },
      },
    })

    workerPlugin(handler, threadContext as ThreadContext & WorkerContext)

    expect(threadContext.evaluationEnhancer).toBeTypeOf('function')
  })

  it('evaluates actor-critic via enhancer and returns fitness/writeback/telemetry', () => {
    const handler = makeHandler()
    const threadContext = makeThreadContext({
      rl: {
        method: 'actor-critic',
        isLamarckian: true,
        config: {
          learningRate: 0.01,
          actionCount: 2,
          gradientConfig: {
            discountFactor: 0.99,
            entropyCoefficient: 0.01,
            clipGradients: false,
            gradientClipValue: 1,
          },
          rolloutConfig: {
            rolloutLength: 4,
            rewardThreshold: 0.1,
          },
        },
      },
    })

    workerPlugin(handler, threadContext as ThreadContext & WorkerContext)

    const enhancer = threadContext.evaluationEnhancer
    if (enhancer == null) {
      throw new Error('Expected evaluationEnhancer to be installed')
    }

    const result = enhancer({ mock: true } as never, threadContext, 'abc')

    expect(result).not.toBeInstanceOf(Promise)
    const syncResult =
      result as import('@neat-evolution/worker-evaluator').EvaluateGenomeResult
    expect(syncResult.fitness).toBe(42)
    expect(syncResult.updatedActions).toEqual(mockUpdatedActions)

    const telemetry =
      syncResult.telemetry as import('../src/actions.js').ActorCriticTelemetry
    expect(telemetry.episodes).toBe(1)
    expect(telemetry.rolloutSegments).toBe(1)
    expect(telemetry.transitionsTrained).toBe(1)
    expect(telemetry.segmentReturn).toBeDefined()
    expect(telemetry.episodeReturn).toBeDefined()
    expect(telemetry.policyEntropy).toBeDefined()
    expect(telemetry.triggerCounts.reward).toBe(1)
    expect(telemetry.triggerCounts.done).toBe(0)
    expect(telemetry.segmentReturn?.mean).toBeCloseTo(1)
    expect(telemetry.episodeReturn?.mean).toBeCloseTo(1)
    if (telemetry.policyEntropy != null) {
      expect(telemetry.policyEntropy.samples).toBeGreaterThan(0)
    }
  })

  it('evaluates Q-learning via enhancer without writeback when disabled', () => {
    const handler = makeHandler()
    const threadContext = makeThreadContext({
      rl: {
        method: 'q-learning',
        isLamarckian: false,
        config: {
          learningRate: 0.02,
          actionCount: 2,
          discountFactor: 0.95,
          rolloutConfig: {
            rolloutLength: 8,
            rewardThreshold: 0.1,
          },
          epsilonInitial: 0.5,
          epsilonDecayPerEpisode: 0.9,
          epsilonMinimum: 0.05,
          multiDiscrete: true,
        },
      },
    })

    workerPlugin(handler, threadContext as ThreadContext & WorkerContext)

    const enhancer = threadContext.evaluationEnhancer
    if (enhancer == null) {
      throw new Error('Expected evaluationEnhancer to be installed')
    }

    const result = enhancer(
      { mock: true } as never,
      threadContext
    ) as import('@neat-evolution/worker-evaluator').EvaluateGenomeResult

    expect(result.fitness).toBe(42)
    expect(result.updatedActions).toBeUndefined()

    const telemetry =
      result.telemetry as import('../src/actions.js').QLearningTelemetry
    expect(telemetry.rolloutSegments).toBe(1)
    expect(telemetry.episodes).toBe(1)
    expect(telemetry.epsilonInitial).toBeCloseTo(0.5)
    expect(telemetry.epsilonFinal).toBeCloseTo(0.5)
    expect(telemetry.epsilonDecayPerEpisode).toBeCloseTo(0.9)
    expect(telemetry.epsilonMinimum).toBeCloseTo(0.05)
    expect(telemetry.multiDiscrete).toBe(true)
  })
})
