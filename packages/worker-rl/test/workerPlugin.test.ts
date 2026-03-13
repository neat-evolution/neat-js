import { PhenotypeActionType } from '@neat-evolution/core'
import type { Handler, WorkerContext } from '@neat-evolution/worker-actions'
import type { ThreadContext } from '@neat-evolution/worker-evaluator/worker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RLWorkerActionType } from '../src/actions.js'
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
        rawOutput: new Float64Array([0]),
        action: new Float64Array([1]),
        reward: 1,
        done: true,
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

type RegisteredHandler = (
  payload: unknown,
  context: unknown
) => Promise<unknown> | unknown

const registerPlugin = () => {
  const handlers = new Map<string, RegisteredHandler>()
  const handler = {
    register: vi.fn((type: string, fn: RegisteredHandler) => {
      handlers.set(type, fn)
    }),
  } as unknown as Handler

  const environment = {
    isAsync: false,
    evaluate: vi.fn(),
    evaluateAsync: vi.fn(),
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
  }

  const threadContext = {
    handler: undefined,
    executorCache: undefined,
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

  workerPlugin(handler, threadContext as ThreadContext & WorkerContext)

  const registered = handlers.get(RLWorkerActionType.REQUEST_EVALUATE_AGENT)
  if (!registered) {
    throw new Error('Handler not registered')
  }
  return {
    invoke: (payload: unknown) => registered(payload, threadContext),
    threadContext,
    environment,
  }
}

describe('workerPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('evaluates actor-critic payloads and returns fitness/writeback/telemetry', async () => {
    const { invoke, environment } = registerPlugin()

    const payload = {
      method: 'actor-critic',
      genomeOptions: { mock: true },
      isLamarckian: true,
      seed: 'abc',
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
        actorActivation: 'softmax' as const,
      },
    }

    const result = (await invoke(
      payload
    )) as import('../src/actions.js').EvaluateRLAgentResult

    expect(environment.evaluateAgent).toHaveBeenCalledOnce()
    expect(result.method).toBe('actor-critic')
    expect(result.fitness).toBe(42)
    expect(result.updatedActions).toEqual(mockUpdatedActions)
    expect(result.telemetry.episodes).toBe(1)
    expect(result.telemetry.rolloutSegments).toBe(1)
    expect(result.telemetry.transitionsTrained).toBe(1)
  })

  it('evaluates Q-learning payloads without writeback when disabled', async () => {
    const { invoke } = registerPlugin()

    const payload = {
      method: 'q-learning',
      genomeOptions: { mock: true },
      isLamarckian: false,
      config: {
        learningRate: 0.02,
        actionCount: 2,
        discountFactor: 0.95,
        rolloutConfig: {
          rolloutLength: 8,
          rewardThreshold: 0.1,
        },
        epsilon: 0.5,
        epsilonDecay: 0.9,
        epsilonMin: 0.05,
        multiDiscrete: true,
      },
    }

    const result = (await invoke(
      payload
    )) as import('../src/actions.js').EvaluateRLAgentResult

    expect(result.method).toBe('q-learning')
    expect(result.fitness).toBe(42)
    expect(result).not.toHaveProperty('updatedActions')
    expect(result.telemetry.rolloutSegments).toBe(1)
    expect(result.telemetry.episodes).toBe(1)
    if (result.method === 'q-learning') {
      expect(result.telemetry.epsilonInitial).toBeCloseTo(0.5)
      expect(result.telemetry.epsilonFinal).toBeCloseTo(0.45)
      expect(result.telemetry.multiDiscrete).toBe(true)
    }
  })
})
