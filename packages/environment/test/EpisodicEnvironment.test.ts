import { describe, expect, test } from 'vitest'

import type {
  EpisodicEnvironment,
  RLConfig,
} from '../src/EpisodicEnvironment.js'
import { isEpisodicEnvironment } from '../src/EpisodicEnvironment.js'
import type { SupervisedEnvironment } from '../src/SupervisedEnvironment.js'

describe('isEpisodicEnvironment', () => {
  test('returns true for objects with getRLConfig', () => {
    const env: EpisodicEnvironment = {
      getRLConfig(): RLConfig {
        return {
          actionSize: 3,
          discountFactor: 0.99,
        }
      },
    }
    expect(isEpisodicEnvironment(env)).toBe(true)
  })

  test('returns false for plain objects', () => {
    expect(isEpisodicEnvironment({})).toBe(false)
    expect(isEpisodicEnvironment({ foo: 'bar' })).toBe(false)
  })

  test('returns false for null and undefined', () => {
    expect(isEpisodicEnvironment(null)).toBe(false)
    expect(isEpisodicEnvironment(undefined)).toBe(false)
  })

  test('returns false for non-objects', () => {
    expect(isEpisodicEnvironment(42)).toBe(false)
    expect(isEpisodicEnvironment('string')).toBe(false)
    expect(isEpisodicEnvironment(true)).toBe(false)
  })

  test('returns false for SupervisedEnvironment (no getRLConfig)', () => {
    const supervised: SupervisedEnvironment = {
      getTrainingData: () => ({
        inputs: [],
        targets: [],
        count: 0,
      }),
      getValidationData: () => ({
        inputs: [],
        targets: [],
        count: 0,
      }),
      getLossConfig: () => ({
        isClassification: false,
        oneHotOutput: false,
      }),
      computeFitness: () => 0,
    }
    expect(isEpisodicEnvironment(supervised)).toBe(false)
  })
})

describe('RLConfig', () => {
  test('accepts required fields', () => {
    const config: RLConfig = {
      actionSize: 5,
      discountFactor: 0.99,
    }
    expect(config.actionSize).toBe(5)
    expect(config.discountFactor).toBe(0.99)
    expect(config.maxStepsPerEpisode).toBeUndefined()
    expect(config.suggestedRolloutLength).toBeUndefined()
  })

  test('accepts all optional fields', () => {
    const config: RLConfig = {
      actionSize: 3,
      discountFactor: 0.95,
      maxStepsPerEpisode: 2048,
      suggestedRolloutLength: 32,
    }
    expect(config.maxStepsPerEpisode).toBe(2048)
    expect(config.suggestedRolloutLength).toBe(32)
  })

  test('accepts episode as suggestedRolloutLength', () => {
    const config: RLConfig = {
      actionSize: 9,
      discountFactor: 0.99,
      suggestedRolloutLength: 'episode',
    }
    expect(config.suggestedRolloutLength).toBe('episode')
  })
})
