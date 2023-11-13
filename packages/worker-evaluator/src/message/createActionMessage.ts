import type { ActionMessage } from './ActionMessage.js'

export const createActionMessage = <T, P>(
  type: T,
  payload: P
): ActionMessage<T, P> => {
  return {
    type,
    payload,
  }
}
