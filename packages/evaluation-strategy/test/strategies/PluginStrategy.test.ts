import type { EpisodicContext } from '@neat-evolution/environment'
import type { FitnessData, GenomeEntry } from '@neat-evolution/evaluator'
import { describe, expect, test, vi } from 'vitest'

import type { EvaluationContext } from '../../src/EvaluationContext.js'
import type {
  EvaluationPlugin,
  EvaluationResult,
  PluginContext,
} from '../../src/EvaluationPlugin.js'
import { PluginStrategy } from '../../src/strategies/PluginStrategy.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TestGenome = GenomeEntry[2]

const dummyGenome = {} as unknown as TestGenome

function makeMockContext(fitnessValue = 1.0): EvaluationContext {
  return {
    evaluateGenomeEntry: vi.fn(
      async (entry: GenomeEntry): Promise<FitnessData> => {
        return [entry[0], entry[1], fitnessValue]
      }
    ),
    evaluateGenomeEntryBatch: vi.fn(),
    send: vi.fn(),
    call: vi.fn(),
    broadcast: vi.fn(),
    addMessageHandler: vi.fn(),
    removeMessageHandler: vi.fn(),
    dispatch: vi.fn(),
    request: vi.fn(),
    addActionHandler: vi.fn(),
    removeActionHandler: vi.fn(),
  } as unknown as EvaluationContext
}

function makeMockPluginContext(): PluginContext {
  return {
    algorithm: {
      createPhenotype: vi.fn(),
      writeBackWeights: vi.fn(),
    },
    environment: {},
    supportsTraining: false,
  } as unknown as PluginContext
}

async function collect(
  iterable: AsyncIterable<FitnessData>
): Promise<FitnessData[]> {
  const results: FitnessData[] = []
  for await (const item of iterable) {
    results.push(item)
  }
  return results
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PluginStrategy', () => {
  describe('initialize', () => {
    test('calls initialize() on each plugin at construction', () => {
      const pluginContext = makeMockPluginContext()
      const initA = vi.fn()
      const initB = vi.fn()

      const pluginA: EvaluationPlugin = { initialize: initA }
      const pluginB: EvaluationPlugin = { initialize: initB }

      new PluginStrategy([pluginA, pluginB], pluginContext)

      expect(initA).toHaveBeenCalledOnce()
      expect(initA).toHaveBeenCalledWith(pluginContext)
      expect(initB).toHaveBeenCalledOnce()
      expect(initB).toHaveBeenCalledWith(pluginContext)
    })

    test('works with plugins that have no initialize()', () => {
      const pluginContext = makeMockPluginContext()
      const plugin: EvaluationPlugin = {}

      expect(() => new PluginStrategy([plugin], pluginContext)).not.toThrow()
    })
  })

  describe('evaluateGenome — replacement pattern', () => {
    test('plugin evaluateGenome replaces default evaluation', async () => {
      const pluginContext = makeMockPluginContext()
      const context = makeMockContext(999)

      const plugin: EvaluationPlugin = {
        evaluateGenome: vi.fn(
          async (): Promise<EvaluationResult> => ({
            fitness: 0.42,
          })
        ),
      }

      const strategy = new PluginStrategy([plugin], pluginContext)
      const entries: GenomeEntry[] = [[0, 0, dummyGenome]]
      const results = await collect(strategy.evaluate(context, entries))

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual([0, 0, 0.42])
      // Default evaluation should NOT have been called
      expect(context.evaluateGenomeEntry).not.toHaveBeenCalled()
    })

    test('plugin receives genome and defaultEvaluate', async () => {
      const pluginContext = makeMockPluginContext()
      const context = makeMockContext()

      const plugin: EvaluationPlugin = {
        evaluateGenome: vi.fn(async (_genome, _defaultEvaluate, _ctx) => ({
          fitness: 0.5,
        })),
      }

      const strategy = new PluginStrategy([plugin], pluginContext)
      const entries: GenomeEntry[] = [[2, 3, dummyGenome]]
      await collect(strategy.evaluate(context, entries))

      expect(plugin.evaluateGenome).toHaveBeenCalledWith(
        dummyGenome,
        expect.any(Function),
        context
      )
    })
  })

  describe('evaluateGenome — augmentation pattern', () => {
    test('plugin can delegate to defaultEvaluate', async () => {
      const pluginContext = makeMockPluginContext()
      const context = makeMockContext(0.75)

      const plugin: EvaluationPlugin = {
        evaluateGenome: vi.fn(async (_genome, defaultEvaluate, _ctx) => {
          const fitness = await defaultEvaluate(_genome)
          return { fitness }
        }),
      }

      const strategy = new PluginStrategy([plugin], pluginContext)
      const entries: GenomeEntry[] = [[0, 0, dummyGenome]]
      const results = await collect(strategy.evaluate(context, entries))

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual([0, 0, 0.75])
      // Default evaluation WAS called via the plugin
      expect(context.evaluateGenomeEntry).toHaveBeenCalledOnce()
    })
  })

  describe('no evaluateGenome plugin', () => {
    test('falls back to default evaluation when no plugin has evaluateGenome', async () => {
      const pluginContext = makeMockPluginContext()
      const context = makeMockContext(0.9)

      // Plugin with only afterFitness, no evaluateGenome
      const plugin: EvaluationPlugin = {
        afterFitness: vi.fn(),
      }

      const strategy = new PluginStrategy([plugin], pluginContext)
      const entries: GenomeEntry[] = [[1, 2, dummyGenome]]
      const results = await collect(strategy.evaluate(context, entries))

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual([1, 2, 0.9])
      expect(context.evaluateGenomeEntry).toHaveBeenCalledOnce()
    })
  })

  describe('afterFitness', () => {
    test('afterFitness called for each genome after all fitness is assigned', async () => {
      const pluginContext = makeMockPluginContext()
      const context = makeMockContext(0.5)
      const afterFitness = vi.fn()

      const plugin: EvaluationPlugin = {
        afterFitness,
      }

      const strategy = new PluginStrategy([plugin], pluginContext)
      const genomeA = { id: 'a' } as unknown as TestGenome
      const genomeB = { id: 'b' } as unknown as TestGenome
      const entries: GenomeEntry[] = [
        [0, 0, genomeA],
        [0, 1, genomeB],
      ]
      await collect(strategy.evaluate(context, entries))

      expect(afterFitness).toHaveBeenCalledTimes(2)
      expect(afterFitness).toHaveBeenCalledWith(genomeA, 0.5, pluginContext)
      expect(afterFitness).toHaveBeenCalledWith(genomeB, 0.5, pluginContext)
    })

    test('afterFitness receives correct fitness from plugin evaluation', async () => {
      const pluginContext = makeMockPluginContext()
      const context = makeMockContext()
      const afterFitness = vi.fn()

      const plugin: EvaluationPlugin = {
        evaluateGenome: vi.fn(async () => ({ fitness: 0.88 })),
        afterFitness,
      }

      const strategy = new PluginStrategy([plugin], pluginContext)
      const entries: GenomeEntry[] = [[0, 0, dummyGenome]]
      await collect(strategy.evaluate(context, entries))

      expect(afterFitness).toHaveBeenCalledWith(
        dummyGenome,
        0.88,
        pluginContext
      )
    })
  })

  describe('multiple plugins', () => {
    test('first plugin with evaluateGenome wins', async () => {
      const pluginContext = makeMockPluginContext()
      const context = makeMockContext()

      const pluginA: EvaluationPlugin = {
        evaluateGenome: vi.fn(async () => ({ fitness: 0.1 })),
      }
      const pluginB: EvaluationPlugin = {
        evaluateGenome: vi.fn(async () => ({ fitness: 0.2 })),
      }

      const strategy = new PluginStrategy([pluginA, pluginB], pluginContext)
      const entries: GenomeEntry[] = [[0, 0, dummyGenome]]
      const results = await collect(strategy.evaluate(context, entries))

      expect(results[0]).toEqual([0, 0, 0.1])
      expect(pluginA.evaluateGenome).toHaveBeenCalledOnce()
      expect(pluginB.evaluateGenome).not.toHaveBeenCalled()
    })

    test('all plugins receive afterFitness', async () => {
      const pluginContext = makeMockPluginContext()
      const context = makeMockContext()

      const afterA = vi.fn()
      const afterB = vi.fn()
      const pluginA: EvaluationPlugin = {
        evaluateGenome: vi.fn(async () => ({ fitness: 0.3 })),
        afterFitness: afterA,
      }
      const pluginB: EvaluationPlugin = {
        afterFitness: afterB,
      }

      const strategy = new PluginStrategy([pluginA, pluginB], pluginContext)
      const entries: GenomeEntry[] = [[0, 0, dummyGenome]]
      await collect(strategy.evaluate(context, entries))

      expect(afterA).toHaveBeenCalledOnce()
      expect(afterB).toHaveBeenCalledOnce()
    })

    test('throws when multiple replacement plugins are registered', () => {
      const pluginContext = makeMockPluginContext()
      const pluginA: EvaluationPlugin = {
        mode: 'replacement',
        evaluateGenome: vi.fn(async () => ({ fitness: 0.3 })),
      }
      const pluginB: EvaluationPlugin = {
        mode: 'replacement',
        evaluateGenome: vi.fn(async () => ({ fitness: 0.4 })),
      }

      expect(
        () => new PluginStrategy([pluginA, pluginB], pluginContext)
      ).toThrow('Only one replacement evaluation plugin can be registered')
    })

    test('throws when mixing replacement and augmentation plugins', () => {
      const pluginContext = makeMockPluginContext()
      const replacement: EvaluationPlugin = {
        mode: 'replacement',
        evaluateGenome: vi.fn(async () => ({ fitness: 0.3 })),
      }
      const augmentation: EvaluationPlugin = {
        getContextHooks: () => ({ reward: vi.fn() }),
      }

      expect(
        () => new PluginStrategy([replacement, augmentation], pluginContext)
      ).toThrow(
        'Replacement evaluation plugins cannot compose with additional plugins.'
      )
    })
  })

  describe('multiple genomes', () => {
    test('yields one FitnessData per genome entry', async () => {
      const pluginContext = makeMockPluginContext()
      const context = makeMockContext(0.5)

      const plugin: EvaluationPlugin = {
        evaluateGenome: vi.fn(async () => ({ fitness: 0.6 })),
      }

      const strategy = new PluginStrategy([plugin], pluginContext)
      const entries: GenomeEntry[] = [
        [0, 0, dummyGenome],
        [0, 1, dummyGenome],
        [1, 0, dummyGenome],
      ]
      const results = await collect(strategy.evaluate(context, entries))

      expect(results).toHaveLength(3)
      expect(results[0]).toEqual([0, 0, 0.6])
      expect(results[1]).toEqual([0, 1, 0.6])
      expect(results[2]).toEqual([1, 0, 0.6])
    })

    test('preserves speciesIndex and organismIndex', async () => {
      const pluginContext = makeMockPluginContext()
      const context = makeMockContext()

      const plugin: EvaluationPlugin = {
        evaluateGenome: vi.fn(async () => ({ fitness: 0.7 })),
      }

      const strategy = new PluginStrategy([plugin], pluginContext)
      const entries: GenomeEntry[] = [
        [2, 5, dummyGenome],
        [3, 8, dummyGenome],
      ]
      const results = await collect(strategy.evaluate(context, entries))

      expect(results[0]![0]).toBe(2)
      expect(results[0]![1]).toBe(5)
      expect(results[1]![0]).toBe(3)
      expect(results[1]![1]).toBe(8)
    })
  })

  describe('context hooks', () => {
    test('merges hooks from plugins with getContextHooks', async () => {
      const pluginContext = makeMockPluginContext()
      const context = makeMockContext(0.5)

      const rewardHook = vi.fn()
      const episodeStartHook = vi.fn()

      const plugin: EvaluationPlugin = {
        evaluateGenome: vi.fn(async (_genome, _defaultEvaluate, ctx) => {
          // Verify episodicContext was injected into the context
          const evalCtx = ctx as EvaluationContext & {
            episodicContext?: EpisodicContext
          }
          expect(evalCtx.episodicContext).toBeDefined()
          expect(evalCtx.episodicContext?.reward).toBeTypeOf('function')
          expect(evalCtx.episodicContext?.episodeStart).toBeTypeOf('function')
          return { fitness: 0.6 }
        }),
        getContextHooks: vi.fn(
          (): Partial<EpisodicContext> => ({
            reward: rewardHook,
            episodeStart: episodeStartHook,
          })
        ),
      }

      const strategy = new PluginStrategy([plugin], pluginContext)
      const entries: GenomeEntry[] = [[0, 0, dummyGenome]]
      await collect(strategy.evaluate(context, entries))

      expect(plugin.getContextHooks).toHaveBeenCalled()
    })

    test('does not inject episodicContext when no plugins provide hooks', async () => {
      const pluginContext = makeMockPluginContext()
      const context = makeMockContext(0.5)

      const plugin: EvaluationPlugin = {
        evaluateGenome: vi.fn(async (_genome, _defaultEvaluate, ctx) => {
          // Without getContextHooks, the context should be the original
          expect(ctx).toBe(context)
          return { fitness: 0.6 }
        }),
      }

      const strategy = new PluginStrategy([plugin], pluginContext)
      const entries: GenomeEntry[] = [[0, 0, dummyGenome]]
      await collect(strategy.evaluate(context, entries))
    })

    test('merges hooks from multiple plugins', async () => {
      const pluginContext = makeMockPluginContext()
      const context = makeMockContext(0.5)

      const rewardA = vi.fn()
      const rewardB = vi.fn()
      const mockExecutor =
        {} as unknown as import('@neat-evolution/executor').Executor

      const pluginA: EvaluationPlugin = {
        evaluateGenome: vi.fn(async (_genome, _defaultEvaluate, ctx) => {
          const evalCtx = ctx as EvaluationContext & {
            episodicContext?: EpisodicContext
          }
          // Call the merged reward hook — both plugins should fire
          evalCtx.episodicContext?.reward?.(mockExecutor, 1.0, false)
          return { fitness: 0.5 }
        }),
        getContextHooks: () => ({ reward: rewardA }),
      }

      const pluginB: EvaluationPlugin = {
        getContextHooks: () => ({ reward: rewardB }),
      }

      const strategy = new PluginStrategy([pluginA, pluginB], pluginContext)
      const entries: GenomeEntry[] = [[0, 0, dummyGenome]]
      await collect(strategy.evaluate(context, entries))

      expect(rewardA).toHaveBeenCalledOnce()
      expect(rewardB).toHaveBeenCalledOnce()
      expect(rewardA).toHaveBeenCalledWith(mockExecutor, 1.0, false)
      expect(rewardB).toHaveBeenCalledWith(mockExecutor, 1.0, false)
    })

    test('per-genome context does not mutate shared context', async () => {
      const pluginContext = makeMockPluginContext()
      const context = makeMockContext(0.5)

      const plugin: EvaluationPlugin = {
        evaluateGenome: vi.fn(async (_genome, _defaultEvaluate, ctx) => {
          // The per-genome context should be a different object
          expect(ctx).not.toBe(context)
          // But should have all original context methods
          expect(ctx.evaluateGenomeEntry).toBe(context.evaluateGenomeEntry)
          return { fitness: 0.5 }
        }),
        getContextHooks: () => ({ reward: vi.fn() }),
      }

      const strategy = new PluginStrategy([plugin], pluginContext)
      const entries: GenomeEntry[] = [[0, 0, dummyGenome]]
      await collect(strategy.evaluate(context, entries))

      // Original context should not have episodicContext
      expect(
        (context as EvaluationContext & { episodicContext?: unknown })
          .episodicContext
      ).toBeUndefined()
    })
  })
})
