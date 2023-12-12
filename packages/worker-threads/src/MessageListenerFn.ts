import type { WorkerMessageEvent } from './MessageEvent.js'

export type MessageListenerFn<T = any> = (event: WorkerMessageEvent<T>) => void

export type NodeMessageListenerFn<T = any> = (message: T) => void
