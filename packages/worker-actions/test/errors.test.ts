import { describe, expect, it } from 'vitest'
import { deserializeError, serializeError } from '../src/utils/errors.js'

describe('error serialization', () => {
  it('should serialize and deserialize a standard error', () => {
    const error = new Error('test error')
    error.name = 'TestError'

    const serialized = serializeError(error)
    expect(serialized.name).toBe('TestError')
    expect(serialized.message).toBe('test error')
    expect(serialized.stack).toBeDefined()

    const deserialized = deserializeError(serialized)
    expect(deserialized).toBeInstanceOf(Error)
    expect(deserialized.name).toBe('TestError')
    expect(deserialized.message).toBe('test error')
    expect(deserialized.stack).toBe(error.stack)
  })

  it('should handle nested causes', () => {
    const cause = new Error('inner error')
    const error = new Error('outer error', { cause })

    const serialized = serializeError(error)
    expect(serialized.cause).toBeDefined()
    expect((serialized.cause as any).message).toBe('inner error')

    const deserialized = deserializeError(serialized)
    expect(deserialized.cause).toBeInstanceOf(Error)
    expect((deserialized.cause as Error).message).toBe('inner error')
  })

  it('should capture extra properties', () => {
    const error = new Error('extra props') as any
    error.code = 'ERR_TEST'
    error.data = { foo: 'bar' }

    const serialized = serializeError(error)
    expect(serialized.code).toBe('ERR_TEST')
    expect(serialized.data).toEqual({ foo: 'bar' })

    const deserialized = deserializeError(serialized) as any
    expect(deserialized.code).toBe('ERR_TEST')
    expect(deserialized.data).toEqual({ foo: 'bar' })
  })

  it('should handle non-error objects', () => {
    const serialized = serializeError('string error')
    expect(serialized.message).toBe('string error')

    const deserialized = deserializeError(serialized)
    expect(deserialized.message).toBe('string error')
  })
})
