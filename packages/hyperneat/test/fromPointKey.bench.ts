import { bench, describe, expect } from 'vitest'

import { toPointKey, fromPointKey, type Point } from '../src/Point.js'

const fromPointKeySplit = (key: string): Point => {
  const [x, y] = key.split(',') as [string, string]
  return [+x, +y]
}

const regex = /^(\d+),(\d+)$/
const fromPointKeyRegExp = (key: string): Point => {
  const [, x, y] = key.match(regex) as [string, string, string]
  return [+x, +y]
}

const fromPointKeySubstring = (key: string): Point => {
  const commaIndex = key.indexOf(',')
  return [+key.substring(0, commaIndex), +key.substring(commaIndex + 1)]
}

const fromPointKeyManual = (key: string): Point => {
  let commaIndex = -1
  for (let i = 0; i < key.length; i++) {
    if (key[i] === ',') {
      commaIndex = i
      break
    }
  }
  return [+key.slice(0, commaIndex), +key.slice(commaIndex + 1)]
}

const fromPointKeyManualCharCode = (key: string): Point => {
  let commaIndex = -1
  for (let i = 0; i < key.length; i++) {
    if (key.charCodeAt(i) === 44) {
      commaIndex = i
      break
    }
  }
  return [+key.slice(0, commaIndex), +key.slice(commaIndex + 1)]
}

const fromPointKeyManualParseInt = (key: string): Point => {
  let commaIndex = -1
  for (let i = 0; i < key.length; i++) {
    if (key[i] === ',') {
      commaIndex = i
      break
    }
  }
  return [+key.slice(0, commaIndex), +key.slice(commaIndex + 1)]
}

const key = toPointKey([1, 2])
describe('fromPointKey', () => {
  test('fromPointKey', () => {
    const point = fromPointKey(key)
    expect(point).toEqual([1, 2])
  })
  test('fromPointKeySplit', () => {
    const point = fromPointKeySplit(key)
    expect(point).toEqual([1, 2])
  })
  test('fromPointKeyRegExp', () => {
    const point = fromPointKeyRegExp(key)
    expect(point).toEqual([1, 2])
  })
  test('fromPointKeySubstring', () => {
    const point = fromPointKeySubstring(key)
    expect(point).toEqual([1, 2])
  })
  test('fromPointKeyManual', () => {
    const point = fromPointKeyManual(key)
    expect(point).toEqual([1, 2])
  })
  test('fromPointKeyManualCharCode', () => {
    const point = fromPointKeyManualCharCode(key)
    expect(point).toEqual([1, 2])
  })
  test('fromPointKeyManualParseInt', () => {
    const point = fromPointKeyManualParseInt(key)
    expect(point).toEqual([1, 2])
  })
})
