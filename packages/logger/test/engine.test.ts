import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createLogger } from '../src/createLogger.js'
import { resolveEngine, setChannelEngine, setEngine } from '../src/engine.js'
import { unmuteAll } from '../src/muting.js'
import type { LogEngine } from '../src/types.js'

const createMockEngine = (): LogEngine => ({
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
})

describe('engine', () => {
  beforeEach(() => {
    unmuteAll()
  })

  afterEach(() => {
    setEngine(console)
  })

  it('setEngine swaps the global engine', () => {
    const engine = createMockEngine()
    setEngine(engine)

    const logger = createLogger('any:channel')
    logger.log('test')

    expect(engine.log).toHaveBeenCalledWith('test')
  })

  it('setChannelEngine overrides for a specific channel', () => {
    const globalEngine = createMockEngine()
    const channelEngine = createMockEngine()
    setEngine(globalEngine)
    setChannelEngine('neat:evolution', channelEngine)

    const evolutionLogger = createLogger('neat:evolution')
    const otherLogger = createLogger('neat:other')

    evolutionLogger.log('evo')
    otherLogger.log('other')

    expect(channelEngine.log).toHaveBeenCalledWith('evo')
    expect(globalEngine.log).toHaveBeenCalledWith('other')
  })

  it('resolveEngine walks prefix chain', () => {
    const parentEngine = createMockEngine()
    setChannelEngine('neat:worker', parentEngine)

    const resolved = resolveEngine('neat:worker:pool')
    expect(resolved).toBe(parentEngine)
  })

  it('resolveEngine falls back to global when no prefix match', () => {
    const globalEngine = createMockEngine()
    setEngine(globalEngine)

    const resolved = resolveEngine('unregistered:channel')
    expect(resolved).toBe(globalEngine)
  })
})
