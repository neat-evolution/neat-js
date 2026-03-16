import type { Transition } from '@neat-evolution/execution-manager'
import { describe, expect, it } from 'vitest'
import { RolloutBuffer } from '../src/RolloutBuffer.js'

function makeTransition(reward = 0, done = false): Transition {
  return {
    state: new Float64Array([1, 2]),
    rawOutput: new Float64Array([0.5, 0.3, 0.1]),
    action: new Float64Array([1, 0]),
    reward,
    done,
    actionProbabilities: new Float64Array([0.7, 0.3]),
    criticValue: 0.5,
  }
}

describe('RolloutBuffer', () => {
  describe('fixed capacity', () => {
    it('tracks length correctly', () => {
      const buffer = new RolloutBuffer({
        rolloutLength: 4,
        rewardThreshold: 0.1,
      })
      expect(buffer.length).toBe(0)
      buffer.push(makeTransition())
      expect(buffer.length).toBe(1)
      buffer.push(makeTransition())
      expect(buffer.length).toBe(2)
    })

    it('ring buffer overwrites oldest when at capacity', () => {
      const buffer = new RolloutBuffer({
        rolloutLength: 3,
        rewardThreshold: 0.1,
      })
      buffer.push(makeTransition(0.1))
      buffer.push(makeTransition(0.2))
      buffer.push(makeTransition(0.3))
      expect(buffer.length).toBe(3)

      // Push a 4th — should overwrite the first
      buffer.push(makeTransition(0.4))
      expect(buffer.length).toBe(3)

      const segment = buffer.capture('done')
      expect(segment).not.toBeNull()
      if (segment === null) throw new Error('Expected segment')
      expect(segment.transitions.length).toBe(3)
      // Should contain rewards 0.2, 0.3, 0.4 (oldest 0.1 was overwritten)
      expect(segment.transitions[0]?.reward).toBeCloseTo(0.2)
      expect(segment.transitions[1]?.reward).toBeCloseTo(0.3)
      expect(segment.transitions[2]?.reward).toBeCloseTo(0.4)
    })

    it('capture returns transitions and clears buffer', () => {
      const buffer = new RolloutBuffer({
        rolloutLength: 4,
        rewardThreshold: 0.1,
      })
      buffer.push(makeTransition(1))
      buffer.push(makeTransition(2))

      const segment = buffer.capture('reward')
      expect(segment).not.toBeNull()
      expect(segment?.transitions.length).toBe(2)
      expect(segment?.trigger).toBe('reward')
      expect(buffer.length).toBe(0)
    })

    it('capture returns null when buffer is empty', () => {
      const buffer = new RolloutBuffer({
        rolloutLength: 4,
        rewardThreshold: 0.1,
      })
      expect(buffer.capture('done')).toBeNull()
    })
  })

  describe('episode mode', () => {
    it('grows unbounded with rolloutLength: episode', () => {
      const buffer = new RolloutBuffer({
        rolloutLength: 'episode',
        rewardThreshold: 0.1,
      })
      for (let i = 0; i < 100; i++) {
        buffer.push(makeTransition())
      }
      expect(buffer.length).toBe(100)
    })

    it('capture returns all transitions', () => {
      const buffer = new RolloutBuffer({
        rolloutLength: 'episode',
        rewardThreshold: 0.1,
      })
      for (let i = 0; i < 10; i++) {
        buffer.push(makeTransition(i))
      }
      const segment = buffer.capture('done')
      if (segment === null) throw new Error('Expected segment')
      expect(segment.transitions.length).toBe(10)
      expect(segment.transitions[0]?.reward).toBe(0)
      expect(segment.transitions[9]?.reward).toBe(9)
    })
  })

  describe('minRolloutLength', () => {
    it('prevents capture when buffer too small', () => {
      const buffer = new RolloutBuffer({
        rolloutLength: 32,
        rewardThreshold: 0.1,
        minRolloutLength: 16,
      })
      for (let i = 0; i < 5; i++) {
        buffer.push(makeTransition())
      }
      expect(buffer.canCapture()).toBe(false)
      expect(buffer.capture('reward')).toBeNull()
    })

    it('allows capture when buffer meets minimum', () => {
      const buffer = new RolloutBuffer({
        rolloutLength: 32,
        rewardThreshold: 0.1,
        minRolloutLength: 4,
      })
      for (let i = 0; i < 4; i++) {
        buffer.push(makeTransition())
      }
      expect(buffer.canCapture()).toBe(true)
      const segment = buffer.capture('reward')
      expect(segment).not.toBeNull()
      expect(segment?.transitions.length).toBe(4)
    })

    it('defaults to 1 (no minimum)', () => {
      const buffer = new RolloutBuffer({
        rolloutLength: 32,
        rewardThreshold: 0.1,
      })
      buffer.push(makeTransition())
      expect(buffer.canCapture()).toBe(true)
    })
  })

  describe('reset', () => {
    it('clears buffer and sets episode index', () => {
      const buffer = new RolloutBuffer({
        rolloutLength: 4,
        rewardThreshold: 0.1,
      })
      buffer.push(makeTransition())
      buffer.push(makeTransition())
      buffer.reset(3)
      expect(buffer.length).toBe(0)

      buffer.push(makeTransition())
      const segment = buffer.capture('done')
      expect(segment?.episodeIndex).toBe(3)
    })
  })
})
