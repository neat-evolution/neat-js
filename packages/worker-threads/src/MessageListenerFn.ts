import type { WorkerMessageEvent } from './MessageEvent.js'

export type MessageListenerFn<T = unknown> = (
  event: WorkerMessageEvent<T>
) => void

export type NodeMessageListenerFn<T = unknown> = (message: T) => void
