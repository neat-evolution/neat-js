import { bench, describe, expect } from 'vitest'

import { toPointKey, fromPointKey, type Point } from '../src/Point.js'

const fromPointKeySplit = (key: string): Point => {
  const [x, y] = key.split(',') as [string, string]
  return [parseInt(x, 10), parseInt(y, 10)]
}

const regex = /^(\d+),(\d+)$/
const fromPointKeyRegExp = (key: string): Point => {
  const [, x, y] = key.match(regex) as [string, string, string]
  return [parseInt(x, 10), parseInt(y, 10)]
}

const fromPointKeySubstring = (key: string): Point => {
  const commaIndex = key.indexOf(',')
  return [
    parseInt(key.substring(0, commaIndex), 10),
    parseInt(key.substring(commaIndex + 1), 10),
  ]
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
  return [
    parseInt(key.slice(0, commaIndex), 10),
    parseInt(key.slice(commaIndex + 1), 10),
  ]
}

const fromPointKeyManualParseInt = (key: string): Point => {
  let commaIndex = -1
  for (let i = 0; i < key.length; i++) {
    if (key[i] === ',') {
      commaIndex = i
      break
    }
  }
  return [
    parseInt(key.slice(0, commaIndex), 10),
    parseInt(key.slice(commaIndex + 1), 10),
  ]
}

const key = toPointKey([1, 2])
describe('fromPointKey', () => {
  bench('fromPointKey', () => {
    const point = fromPointKey(key)
    expect(point).toEqual([1, 2])
  })
  bench('fromPointKeySplit', () => {
    const point = fromPointKeySplit(key)
    expect(point).toEqual([1, 2])
  })
  bench('fromPointKeyRegExp', () => {
    const point = fromPointKeyRegExp(key)
    expect(point).toEqual([1, 2])
  })
  bench('fromPointKeySubstring', () => {
    const point = fromPointKeySubstring(key)
    expect(point).toEqual([1, 2])
  })
  bench('fromPointKeyManual', () => {
    const point = fromPointKeyManual(key)
    expect(point).toEqual([1, 2])
  })
  bench('fromPointKeyManualCharCode', () => {
    const point = fromPointKeyManualCharCode(key)
    expect(point).toEqual([1, 2])
  })
  bench('fromPointKeyManualParseInt', () => {
    const point = fromPointKeyManualParseInt(key)
    expect(point).toEqual([1, 2])
  })
})
