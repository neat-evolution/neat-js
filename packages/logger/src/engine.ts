import type { LogEngine } from './types.js'

const channelEngines = new Map<string, LogEngine>()
let globalEngine: LogEngine = console

export const setEngine = (engine: LogEngine): void => {
  globalEngine = engine
}

export const setChannelEngine = (channel: string, engine: LogEngine): void => {
  channelEngines.set(channel, engine)
}

export const resolveEngine = (channel: string): LogEngine => {
  // Exact match
  const exact = channelEngines.get(channel)
  if (exact != null) return exact

  // Prefix walk: neat:worker:pool → neat:worker → neat
  let prefix = channel
  while (true) {
    const lastColon = prefix.lastIndexOf(':')
    if (lastColon === -1) break
    prefix = prefix.slice(0, lastColon)
    const parent = channelEngines.get(prefix)
    if (parent != null) return parent
  }

  return globalEngine
}
