import type { Dispatcher } from '../Dispatcher.js'
import type { WorkerMessage } from '../types.js'

// --- Core Message Creators ---
const identityPayloadCreator = <P>(payload: P) => payload

export function createMessage<P = any>(
  type: string,
  payloadCreator: (...args: any[]) => P = identityPayloadCreator<P>,
  metaCreator?: (...args: any[]) => any
) {
  const messageCreator = (...args: any[]): WorkerMessage<P> => {
    const payload = payloadCreator(...args)
    const message: WorkerMessage<P> = { type, payload }

    if (metaCreator != null) {
      message.meta = metaCreator(...args)
    }

    return message
  }

  messageCreator.toString = () => type
  return messageCreator
}

/** @deprecated Use createMessage */
export const createAction = createMessage

// --- Bulk Creation Utilities ---

type PayloadCreator = (...args: any[]) => any

interface MessageMap {
  [key: string]: PayloadCreator | MessageMap
}

export function createMessages(messageMap: MessageMap, prefix = ''): any {
  const messages: any = {}

  for (const [key, value] of Object.entries(messageMap)) {
    const type = prefix.length > 0 ? `${prefix}/${key}` : key

    if (typeof value === 'function') {
      // It's a payload creator
      messages[key] = createMessage(type, value as any)
    } else if (typeof value === 'object' && value !== null) {
      // Recursive definition
      messages[key] = createMessages(value, type)
    }
  }

  return messages
}

/** @deprecated Use createMessages */
export const createActions = createMessages

// --- Binding Utilities ---

export function bindMessageCreators(
  messageCreators: Record<string, PayloadCreator>,
  dispatcher: Dispatcher
) {
  const bound: Record<string, PayloadCreator> = {}

  for (const [key, creator] of Object.entries(messageCreators)) {
    bound[key] = async (...args: any[]) => {
      const message = creator(...args)
      // Default to call (RPC) for bound messages as it covers both use cases safely
      return await dispatcher.call(message)
    }
  }

  return bound
}

/** @deprecated Use bindMessageCreators */
export const bindActionCreators = bindMessageCreators

export function isWorkerMessage(message: any): message is WorkerMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    typeof message.type === 'string'
  )
}

/** @deprecated Use isWorkerMessage */
export const isWorkerAction = isWorkerMessage
