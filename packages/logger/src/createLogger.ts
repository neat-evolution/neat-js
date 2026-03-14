import { resolveEngine } from './engine.js'
import { isMuted } from './muting.js'
import type { Logger } from './types.js'

export const createLogger = (channel: string): Logger => {
  return {
    log(...args: unknown[]) {
      if (isMuted(channel)) return
      resolveEngine(channel).log(...args)
    },
    info(...args: unknown[]) {
      if (isMuted(channel)) return
      resolveEngine(channel).info(...args)
    },
    warn(...args: unknown[]) {
      if (isMuted(channel)) return
      resolveEngine(channel).warn(...args)
    },
    error(...args: unknown[]) {
      // error always passes through — never muted
      resolveEngine(channel).error(...args)
    },
    debug(...args: unknown[]) {
      if (isMuted(channel)) return
      resolveEngine(channel).debug(...args)
    },
  }
}
