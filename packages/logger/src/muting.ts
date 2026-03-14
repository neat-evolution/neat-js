const mutedChannels = new Set<string>()
let globalMuted = false

export const muteChannel = (channel: string): void => {
  mutedChannels.add(channel)
}

export const unmuteChannel = (channel: string): void => {
  mutedChannels.delete(channel)
}

export const muteAll = (): void => {
  globalMuted = true
}

export const unmuteAll = (): void => {
  globalMuted = false
}

export const isMuted = (channel: string): boolean => {
  if (globalMuted) return true

  // Exact match
  if (mutedChannels.has(channel)) return true

  // Check wildcard patterns: neat:worker:* matches neat:worker:pool
  for (const pattern of mutedChannels) {
    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -2)
      if (channel === prefix || channel.startsWith(`${prefix}:`)) {
        return true
      }
    }
  }

  return false
}

const isTestEnv = (): boolean => {
  if (typeof process !== 'undefined' && process.env != null) {
    return (
      process.env.NODE_ENV === 'test' ||
      process.env.VITEST === 'true' ||
      process.env.JEST_WORKER_ID !== undefined
    )
  }
  return false
}

// Auto-mute in test environments
if (isTestEnv()) {
  muteAll()
}
