import type { Dispatcher } from '../Dispatcher.js'
import type { WorkerAction } from '../types.js'

// --- Core Action Creators ---
const identityPayloadCreator = <P>(payload: P) => payload

export function createAction<P = any>(
  type: string,
  payloadCreator: (...args: any[]) => P = identityPayloadCreator<P>,
  metaCreator?: (...args: any[]) => any
) {
  const actionCreator = (...args: any[]): WorkerAction<P> => {
    const payload = payloadCreator(...args)
    const action: WorkerAction<P> = { type, payload }

    if (metaCreator != null) {
      action.meta = metaCreator(...args)
    }

    return action
  }

  actionCreator.toString = () => type
  return actionCreator
}

// --- Bulk Creation Utilities (redux-actions style) ---

type PayloadCreator = (...args: any[]) => any

interface ActionMap {
  [key: string]: PayloadCreator | ActionMap
}

export function createActions(actionMap: ActionMap, prefix = ''): any {
  const actions: any = {}

  for (const [key, value] of Object.entries(actionMap)) {
    const type = prefix.length > 0 ? `${prefix}/${key}` : key

    if (typeof value === 'function') {
      // It's a payload creator
      actions[key] = createAction(type, value as any)
    } else if (typeof value === 'object' && value !== null) {
      // Recursive definition
      actions[key] = createActions(value, type)
    }
  }

  return actions
}

// --- Binding Utilities ---

export function bindActionCreators(
  actionCreators: Record<string, PayloadCreator>,
  dispatcher: Dispatcher
) {
  const bound: Record<string, PayloadCreator> = {}

  for (const [key, creator] of Object.entries(actionCreators)) {
    bound[key] = async (...args: any[]) => {
      const action = creator(...args)
      // Default to request (RPC) for bound actions as it covers both use cases safely
      return await dispatcher.request(action)
    }
  }

  return bound
}

export function isWorkerAction(action: any): action is WorkerAction {
  return (
    typeof action === 'object' &&
    action !== null &&
    typeof action.type === 'string'
  )
}
