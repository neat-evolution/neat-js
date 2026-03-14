import { describe, expect, it } from 'vitest'

import { createMemoryRecorder } from '../../src/recorder/createMemoryRecorder.js'

describe('createMemoryRecorder', () => {
  it('records values for subscribed metrics', () => {
    const recorder = createMemoryRecorder(['fitness', 'loss'])

    recorder.record('fitness', 0.5)
    recorder.record('fitness', 0.8)
    recorder.record('loss', 0.3)

    expect(recorder.get<number>('fitness')).toEqual([0.5, 0.8])
    expect(recorder.get<number>('loss')).toEqual([0.3])
  })

  it('ignores unsubscribed metrics', () => {
    const recorder = createMemoryRecorder(['fitness'])

    recorder.record('loss', 0.3)

    expect(recorder.get('loss')).toEqual([])
  })

  it('wants returns true only for subscribed metrics', () => {
    const recorder = createMemoryRecorder(['fitness'])

    expect(recorder.wants('fitness')).toBe(true)
    expect(recorder.wants('loss')).toBe(false)
  })

  it('clear removes all data', () => {
    const recorder = createMemoryRecorder(['fitness'])

    recorder.record('fitness', 1)
    recorder.clear()

    expect(recorder.get('fitness')).toEqual([])
  })
})
