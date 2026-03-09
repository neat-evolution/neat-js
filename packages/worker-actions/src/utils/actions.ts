import type { Dispatcher } from '../Dispatcher.js'
import type { WorkerMessage } from '../types.js'

// --- Core Message Creators ---
const identityPayloadCreator = <P>(payload: P) => payload

export function createMessage<
  P = unknown,
  Args extends unknown[] = [payload: P],
>(
  type: string,
  payloadCreator: (...args: Args) => P = identityPayloadCreator as unknown as (
    ...args: Args
  ) => P,
  metaCreator?: (...args: Args) => WorkerMessage<P>['meta']
) {
  const messageCreator = (...args: Args): WorkerMessage<P> => {
    const payload = payloadCreator(...args)
    const message: WorkerMessage<P> = { type, payload }

    if (metaCreator != null) {
      const meta = metaCreator(...args)
      if (meta != null) {
        message.meta = meta
      }
    }

    return message
  }

  messageCreator.toString = () => type
  return messageCreator
}

/** @deprecated Use createMessage */
export const createAction = createMessage

// --- Bulk Creation Utilities ---

type PayloadCreator<Args extends unknown[] = unknown[], Result = unknown> = (
  ...args: Args
) => Result

interface MessageMap {
  [key: string]: PayloadCreator | MessageMap
}

export function createMessages(
  messageMap: MessageMap,
  prefix = ''
): Record<string, unknown> {
  const messages: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(messageMap)) {
    const type = prefix.length > 0 ? `${prefix}/${key}` : key

    if (typeof value === 'function') {
      // It's a payload creator
      messages[key] = createMessage(type, value)
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
    bound[key] = async (...args: unknown[]) => {
      const message = creator(...args)
      if (!isWorkerMessage(message)) {
        throw new Error('Message creator must return a WorkerMessage')
      }
      // Default to call (RPC) for bound messages as it covers both use cases safely
      return await dispatcher.call(message)
    }
  }

  return bound
}

/** @deprecated Use bindMessageCreators */
export const bindActionCreators = bindMessageCreators

export function isWorkerMessage(message: unknown): message is WorkerMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    typeof message.type === 'string'
  )
}

/** @deprecated Use isWorkerMessage */
export const isWorkerAction = isWorkerMessage
