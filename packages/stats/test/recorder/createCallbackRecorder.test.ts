import { describe, expect, it, vi } from 'vitest'

import { createCallbackRecorder } from '../../src/recorder/createCallbackRecorder.js'

describe('createCallbackRecorder', () => {
  it('calls handler when metric is recorded', () => {
    const handler = vi.fn()
    const recorder = createCallbackRecorder({ fitness: handler })

    recorder.record('fitness', 0.5)

    expect(handler).toHaveBeenCalledWith('fitness', 0.5)
  })

  it('wants returns true for registered handlers', () => {
    const recorder = createCallbackRecorder({ fitness: vi.fn() })

    expect(recorder.wants('fitness')).toBe(true)
    expect(recorder.wants('loss')).toBe(false)
  })

  it('ignores unregistered metrics', () => {
    const handler = vi.fn()
    const recorder = createCallbackRecorder({ fitness: handler })

    recorder.record('loss', 0.3)

    expect(handler).not.toHaveBeenCalled()
  })
})
