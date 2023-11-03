import { beforeEach, describe, expect, test } from 'vitest'

import { Connections } from '../src/Connections.js'

describe('Connections.prune', () => {
  // @ts-expect-error number
  let connections: Connections<number, void>

  beforeEach(() => {
    // @ts-expect-error number
    connections = new Connections<number, void>()
  })
  describe('pruneDanglingInputs', () => {
    beforeEach(() => {
      connections.add(5, 10, undefined)
      connections.add(6, 10, undefined)
      connections.add(7, 10, undefined)
      connections.add(0, 5, undefined)
      connections.add(1, 5, undefined)
      connections.add(2, 6, undefined)
      connections.add(3, 10, undefined)
      connections.add(4, 0, undefined)
      connections.add(4, 1, undefined)
      connections.add(10, 11, undefined)
      connections.add(10, 12, undefined)
      connections.add(10, 13, undefined)
      connections.add(11, 12, undefined)
      connections.add(14, 12, undefined)
    })
    test('should not collect pruned dangling inputs', () => {
      expect(connections.pruneDanglingInputs(new Set([3]), false)).toEqual(
        new Set()
      )
    })
    test('should prune dangling inputs', () => {
      const nodes = Array.from(
        connections.pruneDanglingInputs(new Set([3]), true, true)
      )
      nodes.sort((a, b) => a - b) // Ensure nodes are sorted for comparison
      expect(nodes).toEqual([0, 1, 2, 4, 5, 6, 7, 14])

      expect(connections.hasConnection(5, 10)).toBeFalsy()
      expect(connections.hasConnection(6, 10)).toBeFalsy()
      expect(connections.hasConnection(7, 10)).toBeFalsy()
      expect(connections.hasConnection(0, 5)).toBeFalsy()
      expect(connections.hasConnection(1, 5)).toBeFalsy()
      expect(connections.hasConnection(2, 6)).toBeFalsy()
      expect(connections.hasConnection(3, 10)).toBeTruthy()
      expect(connections.hasConnection(4, 0)).toBeFalsy()
      expect(connections.hasConnection(4, 1)).toBeFalsy()
      expect(connections.hasConnection(10, 11)).toBeTruthy()
      expect(connections.hasConnection(10, 12)).toBeTruthy()
      expect(connections.hasConnection(10, 13)).toBeTruthy()
      expect(connections.hasConnection(11, 12)).toBeTruthy()
      expect(connections.hasConnection(14, 12)).toBeFalsy()
    })
  })
  describe('pruneDanglingOutputs', () => {
    beforeEach(() => {
      connections.add(10, 5, undefined)
      connections.add(10, 6, undefined)
      connections.add(10, 7, undefined)
      connections.add(5, 0, undefined)
      connections.add(5, 1, undefined)
      connections.add(6, 2, undefined)
      connections.add(10, 3, undefined)
      connections.add(0, 4, undefined)
      connections.add(1, 4, undefined)
      connections.add(11, 10, undefined)
      connections.add(12, 10, undefined)
      connections.add(13, 10, undefined)
      connections.add(12, 11, undefined)
      connections.add(12, 14, undefined)
    })
    test('should not collect pruned dangling outputs', () => {
      expect(connections.pruneDanglingOutputs(new Set([3]), false)).toEqual(
        new Set()
      )
    })
    test('should prune dangling outputs', () => {
      const nodes = Array.from(
        connections.pruneDanglingOutputs(new Set([3]), true, undefined, true)
      )
      nodes.sort((a, b) => a - b) // Ensure nodes are sorted for comparison
      expect(nodes).toEqual([0, 1, 2, 4, 5, 6, 7, 14])

      expect(connections.hasConnection(10, 5)).toBeFalsy()
      expect(connections.hasConnection(10, 6)).toBeFalsy()
      expect(connections.hasConnection(10, 7)).toBeFalsy()
      expect(connections.hasConnection(5, 0)).toBeFalsy()
      expect(connections.hasConnection(5, 1)).toBeFalsy()
      expect(connections.hasConnection(6, 2)).toBeFalsy()
      expect(connections.hasConnection(10, 3)).toBeTruthy()
      expect(connections.hasConnection(0, 4)).toBeFalsy()
      expect(connections.hasConnection(1, 4)).toBeFalsy()
      expect(connections.hasConnection(11, 10)).toBeTruthy()
      expect(connections.hasConnection(12, 10)).toBeTruthy()
      expect(connections.hasConnection(13, 10)).toBeTruthy()
      expect(connections.hasConnection(12, 11)).toBeTruthy()
      expect(connections.hasConnection(12, 14)).toBeFalsy()
    })
  })
})
