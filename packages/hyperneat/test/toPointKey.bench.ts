import { bench, describe, expect } from 'vitest'

import { toPointKey, type Point } from '../src/Point.js'

const toBinaryPointKey = (point: Point): number => {
  return (point[0] << 16) | point[1]
}

const toJSONPointKey = (point: Point): string => {
  return JSON.stringify(point)
}

const toJoinPointKey = (point: Point): string => {
  return point.join(',')
}

const toPlusPointKey = (point: Point): string => {
  return point[0] + ',' + point[1]
}

const toTemplatePointKey = (point: Point): string => {
  return `${point[0]},${point[1]}`
}

describe('toPointKey', () => {
  test('toBinaryPointKey', () => {
    const point: Point = [1, 2]
    const key = toBinaryPointKey(point)
    expect(key).toBe(65538)
  })
  test('toJSONPointKey', () => {
    const point: Point = [1, 2]
    const key = toJSONPointKey(point)
    expect(key).toBe('[1,2]')
  })
  test('toJoinPointKey', () => {
    const point: Point = [1, 2]
    const key = toJoinPointKey(point)
    expect(key).toBe('1,2')
  })
  test('toPlusPointKey', () => {
    const point: Point = [1, 2]
    const key = toPlusPointKey(point)
    expect(key).toBe('1,2')
  })
  test('toTemplatePointKey', () => {
    const point: Point = [1, 2]
    const key = toTemplatePointKey(point)
    expect(key).toBe('1,2')
  })
  test('toPointKey', () => {
    const point: Point = [1, 2]
    const key = toPointKey(point)
    expect(key).toBe('1,2')
  })
})
