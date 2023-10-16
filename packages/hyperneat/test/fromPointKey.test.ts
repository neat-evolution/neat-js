import { describe, expect, test } from 'vitest'

import { fromPointKey, toPointKey } from '../src/Point.js'

describe('fromPointKey', () => {
  test('fromPointKey 1, 2', () => {
    const key = toPointKey([1, 2])
    const point = fromPointKey(key)
    expect(point).toEqual([1, 2])
  })

  test('fromPointKey -0, 0', () => {
    const key = toPointKey([-0, 0])
    const point = fromPointKey(key)
    expect(point).toEqual([0, 0])
  })

  test('fromPointKey -1, -2', () => {
    const key = toPointKey([-1, -2])
    const point = fromPointKey(key)
    expect(point).toEqual([-1, -2])
  })

  test('fromPointKey -0.5, -0.5', () => {
    const key = toPointKey([-0.5, -0.5])
    const point = fromPointKey(key)
    expect(point).toEqual([-0.5, -0.5])
  })
})
