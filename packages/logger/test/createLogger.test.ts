import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createLogger } from '../src/createLogger.js'
import { setEngine } from '../src/engine.js'
import {
  muteAll,
  muteChannel,
  unmuteAll,
  unmuteChannel,
} from '../src/muting.js'
import type { LogEngine } from '../src/types.js'

describe('createLogger', () => {
  let engine: LogEngine

  beforeEach(() => {
    unmuteAll()
    engine = {
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }
    setEngine(engine)
  })

  afterEach(() => {
    setEngine(console)
  })

  it('delegates all methods to the engine', () => {
    const logger = createLogger('test:channel')

    logger.log('hello')
    logger.info('info msg')
    logger.warn('warn msg')
    logger.error('error msg')
    logger.debug('debug msg')

    expect(engine.log).toHaveBeenCalledWith('hello')
    expect(engine.info).toHaveBeenCalledWith('info msg')
    expect(engine.warn).toHaveBeenCalledWith('warn msg')
    expect(engine.error).toHaveBeenCalledWith('error msg')
    expect(engine.debug).toHaveBeenCalledWith('debug msg')
  })

  it('muting suppresses log, info, warn, debug but not error', () => {
    const logger = createLogger('test:muted')

    muteChannel('test:muted')

    logger.log('should not appear')
    logger.info('should not appear')
    logger.warn('should not appear')
    logger.debug('should not appear')
    logger.error('should appear')

    expect(engine.log).not.toHaveBeenCalled()
    expect(engine.info).not.toHaveBeenCalled()
    expect(engine.warn).not.toHaveBeenCalled()
    expect(engine.debug).not.toHaveBeenCalled()
    expect(engine.error).toHaveBeenCalledWith('should appear')

    unmuteChannel('test:muted')
  })

  it('muteAll suppresses everything except error', () => {
    const logger = createLogger('test:any')

    muteAll()

    logger.log('no')
    logger.info('no')
    logger.warn('no')
    logger.debug('no')
    logger.error('yes')

    expect(engine.log).not.toHaveBeenCalled()
    expect(engine.error).toHaveBeenCalledWith('yes')
  })
})
