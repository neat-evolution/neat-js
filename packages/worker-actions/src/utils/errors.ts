export interface SerializedError {
  name: string
  message: string
  stack?: string
  cause?: unknown
  [key: string]: unknown
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const serialized: SerializedError = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }

    if (error.cause !== undefined) {
      serialized.cause = serializeError(error.cause)
    }

    // Capture any additional properties
    for (const key of Object.getOwnPropertyNames(error)) {
      if (
        key !== 'name' &&
        key !== 'message' &&
        key !== 'stack' &&
        key !== 'cause'
      ) {
        serialized[key] = (error as any)[key]
      }
    }

    return serialized
  }

  return {
    name: 'Error',
    message: String(error),
  }
}

export function deserializeError(serialized: unknown): Error {
  if (
    serialized == null ||
    typeof serialized !== 'object' ||
    !('message' in serialized)
  ) {
    return new Error(String(serialized))
  }

  const { name, message, stack, cause, ...rest } = serialized as SerializedError
  const error = new Error(message)
  error.name = name || 'Error'
  error.stack = stack

  if (cause !== undefined) {
    error.cause = deserializeError(cause)
  }

  Object.assign(error, rest)

  return error
}
