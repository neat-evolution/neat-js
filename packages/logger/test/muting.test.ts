import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  isMuted,
  muteAll,
  muteChannel,
  unmuteAll,
  unmuteChannel,
} from '../src/muting.js'

describe('muting', () => {
  beforeEach(() => {
    unmuteAll()
  })

  afterEach(() => {
    unmuteAll()
  })

  it('muteChannel mutes exact channel', () => {
    expect(isMuted('neat:evolution')).toBe(false)
    muteChannel('neat:evolution')
    expect(isMuted('neat:evolution')).toBe(true)
    unmuteChannel('neat:evolution')
    expect(isMuted('neat:evolution')).toBe(false)
  })

  it('muteAll mutes everything', () => {
    expect(isMuted('anything')).toBe(false)
    muteAll()
    expect(isMuted('anything')).toBe(true)
    expect(isMuted('neat:worker:pool')).toBe(true)
    unmuteAll()
    expect(isMuted('anything')).toBe(false)
  })

  it('prefix wildcard matching with :*', () => {
    muteChannel('neat:worker:*')
    expect(isMuted('neat:worker:pool')).toBe(true)
    expect(isMuted('neat:worker:dispatcher')).toBe(true)
    expect(isMuted('neat:worker')).toBe(true)
    expect(isMuted('neat:evolution')).toBe(false)
    unmuteChannel('neat:worker:*')
  })

  it('isMuted returns false for unknown channels', () => {
    expect(isMuted('unknown:channel')).toBe(false)
  })
})
