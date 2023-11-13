import type { RequestMapValue } from '../types.js'

export const handleResponse = (
  payload: any,
  requestMap: Map<number, RequestMapValue<any>>
) => {
  const { requestId } = payload
  const { resolve } = requestMap.get(requestId) ?? {}
  if (resolve == null) {
    throw new Error('no request found')
  }
  resolve(payload)
}
