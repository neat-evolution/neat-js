import type { Executor, SyncExecutor } from '@neat-evolution/executor'
import { describe, test, expect } from 'vitest'

import type {
  StandardEnvironment,
  EnvironmentDescription,
} from '../src/index.js'

describe('StandardEnvironment', () => {
  test('can be implemented without batch methods (backward compatible)', () => {
    class SimpleEnvironment implements StandardEnvironment<null> {
      description: EnvironmentDescription = { inputs: 2, outputs: 1 }
      isAsync = false

      evaluate(executor: SyncExecutor): number {
        return 1.0
      }

      async evaluateAsync(executor: Executor): Promise<number> {
        return 1.0
      }

      toFactoryOptions(): null {
        return null
      }
    }

    const env = new SimpleEnvironment()
    expect(env.evaluateBatch).toBeUndefined()
    expect(env.evaluateBatchAsync).toBeUndefined()
  })

  test('can be implemented with batch methods', () => {
    class BatchEnvironment implements StandardEnvironment<null> {
      description: EnvironmentDescription = { inputs: 2, outputs: 1 }
      isAsync = true

      evaluate(executor: SyncExecutor): number {
        throw new Error('Use async evaluation')
      }

      async evaluateAsync(executor: Executor): Promise<number> {
        return 0.5
      }

      evaluateBatch(executors: SyncExecutor[]): number[] {
        throw new Error('Use async evaluation')
      }

      async evaluateBatchAsync(executors: Executor[]): Promise<number[]> {
        // Simulate game: first executor wins
        return executors.map((_, i) => (i === 0 ? 1.0 : 0.0))
      }

      toFactoryOptions(): null {
        return null
      }
    }

    const env = new BatchEnvironment()
    expect(typeof env.evaluateBatch).toBe('function')
    expect(typeof env.evaluateBatchAsync).toBe('function')
  })

  test('batch methods return fitness in same order as input', async () => {
    class TestEnvironment implements StandardEnvironment<null> {
      description: EnvironmentDescription = { inputs: 1, outputs: 1 }
      isAsync = true

      evaluate(): number {
        return 0
      }

      async evaluateAsync(): Promise<number> {
        return 0
      }

      async evaluateBatchAsync(executors: Executor[]): Promise<number[]> {
        // Return fitness based on index
        return executors.map((_, i) => i * 0.1)
      }

      toFactoryOptions(): null {
        return null
      }
    }

    const env = new TestEnvironment()
    const mockExecutor1: Executor = {} as any
    const mockExecutor2: Executor = {} as any
    const mockExecutor3: Executor = {} as any
    const mockExecutors = [mockExecutor1, mockExecutor2, mockExecutor3]

    expect(env.evaluateBatchAsync).toBeDefined()
    if (!env.evaluateBatchAsync) {
      throw new Error('evaluateBatchAsync should be defined')
    }
    const results = await env.evaluateBatchAsync(mockExecutors)

    expect(results).toEqual([0.0, 0.1, 0.2])
    expect(results).toHaveLength(mockExecutors.length)
  })

  test('environment without batch methods is still valid', () => {
    class DatasetEnvironment implements StandardEnvironment<SharedArrayBuffer> {
      description: EnvironmentDescription = { inputs: 4, outputs: 3 }
      isAsync = false

      evaluate(executor: SyncExecutor): number {
        return 0.95
      }

      async evaluateAsync(executor: Executor): Promise<number> {
        return 0.95
      }

      toFactoryOptions(): SharedArrayBuffer {
        return new SharedArrayBuffer(0)
      }
    }

    const env = new DatasetEnvironment()

    // Should not have batch methods
    expect(env.evaluateBatch).toBeUndefined()
    expect(env.evaluateBatchAsync).toBeUndefined()

    // Single evaluation should work
    expect(typeof env.evaluate).toBe('function')
    expect(typeof env.evaluateAsync).toBe('function')
  })

  test('sync batch method can be implemented', () => {
    class SyncBatchEnvironment implements StandardEnvironment<null> {
      description: EnvironmentDescription = { inputs: 1, outputs: 1 }
      isAsync = false

      evaluate(executor: SyncExecutor): number {
        return 0.5
      }

      async evaluateAsync(executor: Executor): Promise<number> {
        return 0.5
      }

      evaluateBatch(executors: SyncExecutor[]): number[] {
        // Simple sync batch evaluation
        return executors.map(() => 0.5)
      }

      toFactoryOptions(): null {
        return null
      }
    }

    const env = new SyncBatchEnvironment()
    const mockExecutor1: SyncExecutor = {} as any
    const mockExecutor2: SyncExecutor = {} as any
    const mockExecutors = [mockExecutor1, mockExecutor2]

    expect(env.evaluateBatch).toBeDefined()
    if (!env.evaluateBatch) {
      throw new Error('evaluateBatch should be defined')
    }
    const results = env.evaluateBatch(mockExecutors)

    expect(results).toEqual([0.5, 0.5])
    expect(results).toHaveLength(mockExecutors.length)
  })

  test('only async batch method can be implemented', () => {
    class AsyncOnlyBatchEnvironment implements StandardEnvironment<null> {
      description: EnvironmentDescription = { inputs: 1, outputs: 1 }
      isAsync = true

      evaluate(): number {
        throw new Error('Use async evaluation')
      }

      async evaluateAsync(): Promise<number> {
        return 1.0
      }

      async evaluateBatchAsync(executors: Executor[]): Promise<number[]> {
        return executors.map(() => 1.0)
      }

      toFactoryOptions(): null {
        return null
      }
    }

    const env: StandardEnvironment<null> = new AsyncOnlyBatchEnvironment()

    // Should not have sync batch method
    expect(env.evaluateBatch).toBeUndefined()
    // Should have async batch method
    expect(typeof env.evaluateBatchAsync).toBe('function')
  })
})
