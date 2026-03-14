import { describe, expect, it, vi } from 'vitest'

import { createCallbackRecorder } from '../../src/recorder/createCallbackRecorder.js'
import { createMemoryRecorder } from '../../src/recorder/createMemoryRecorder.js'
import { createFanoutRecorder } from '../../src/recorder/fanout.js'

describe('createFanoutRecorder', () => {
  it('delegates record to all children that want the metric', () => {
    const memory = createMemoryRecorder(['fitness'])
    const handler = vi.fn()
    const callback = createCallbackRecorder({ fitness: handler })
    const fanout = createFanoutRecorder([memory, callback])

    fanout.record('fitness', 0.9)

    expect(memory.get('fitness')).toEqual([0.9])
    expect(handler).toHaveBeenCalledWith('fitness', 0.9)
  })

  it('wants is union of children', () => {
    const a = createMemoryRecorder(['fitness'])
    const b = createMemoryRecorder(['loss'])
    const fanout = createFanoutRecorder([a, b])

    expect(fanout.wants('fitness')).toBe(true)
    expect(fanout.wants('loss')).toBe(true)
    expect(fanout.wants('other')).toBe(false)
  })
})
