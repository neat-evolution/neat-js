export type MessageListenerFn<T = any> = (event: T) => void

export type NodeMessageListenerFn<T = any> = (message: T) => void
