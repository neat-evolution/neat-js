import { describe, expect, test } from 'vitest'

import { toPointKey, type Point } from '../src/Point.js'

describe('toPointKey', () => {
  test('toPointKey 1, 2', () => {
    const point: Point = [1, 2]
    const key = toPointKey(point)
    expect(key).toBe('1,2')
  })

  test('toPointKey -0, 0', () => {
    const point: Point = [-0, 0]
    const key = toPointKey(point)
    expect(key).toBe('0,0')
  })

  test('toPointKey -1, -2', () => {
    const point: Point = [-1, -2]
    const key = toPointKey(point)
    expect(key).toBe('-1,-2')
  })

  test('toPointKey -0.5, -0.5', () => {
    const point: Point = [-0.5, -0.5]
    const key = toPointKey(point)
    expect(key).toBe('-0.5,-0.5')
  })
})
