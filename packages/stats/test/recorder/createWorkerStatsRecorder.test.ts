import { describe, expect, it, vi } from 'vitest'

import { createWorkerStatsRecorder } from '../../src/recorder/createWorkerStatsRecorder.js'

describe('createWorkerStatsRecorder', () => {
  it('wants() returns true for listed metrics', () => {
    const recorder = createWorkerStatsRecorder(
      { wantedMetrics: ['foo', 'bar'] },
      () => {}
    )
    expect(recorder.wants('foo')).toBe(true)
    expect(recorder.wants('bar')).toBe(true)
    expect(recorder.wants('baz')).toBe(false)
  })

  it('record() sends wanted metrics', () => {
    const send = vi.fn()
    const recorder = createWorkerStatsRecorder({ wantedMetrics: ['foo'] }, send)

    recorder.record('foo', { value: 42 })
    expect(send).toHaveBeenCalledWith('foo', { value: 42 })
  })

  it('record() does not send unwanted metrics', () => {
    const send = vi.fn()
    const recorder = createWorkerStatsRecorder({ wantedMetrics: ['foo'] }, send)

    recorder.record('bar', { value: 42 })
    expect(send).not.toHaveBeenCalled()
  })

  it('works with empty wantedMetrics', () => {
    const send = vi.fn()
    const recorder = createWorkerStatsRecorder({ wantedMetrics: [] }, send)

    expect(recorder.wants('anything')).toBe(false)
    recorder.record('anything', 1)
    expect(send).not.toHaveBeenCalled()
  })

  it('toJSON() round-trips the config', () => {
    const recorder = createWorkerStatsRecorder(
      { wantedMetrics: ['foo', 'bar'] },
      () => {}
    )
    const json = recorder.toJSON()
    expect(json.wantedMetrics).toEqual(expect.arrayContaining(['foo', 'bar']))
    expect(json.wantedMetrics).toHaveLength(2)
  })
})
