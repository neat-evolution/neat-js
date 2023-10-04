import { NodeType, type NodeKey, type LinkData, toNodeKey } from '@neat-js/core'
import { beforeEach, describe, expect, test } from 'vitest'

import { createLink } from '../src/createLink.js'
import type { NEATLink } from '../src/NEATLink.js'

describe('NEATLink class', () => {
  describe('NEATLink methods', () => {
    let link: NEATLink
    let from: NodeKey
    let to: NodeKey

    beforeEach(() => {
      from = toNodeKey(NodeType.Input, 0)
      to = toNodeKey(NodeType.Output, 1)
      link = createLink(from, to, 0.5, 1, null, null)
    })

    test('should return itself', () => {
      expect(link.neat()).toBe(link)
    })

    test('should return string', () => {
      expect(link.toString()).toBe('I[0] -> O[1]')
    })

    test('should return identity link', () => {
      expect(link.identity(link)).toBe(link)
    })

    test('should return cloneWith link', () => {
      expect(link.cloneWith(link)).toBe(link)
    })
  })

  describe('NEATLink crossover', () => {
    let link1: NEATLink
    let link2: NEATLink
    let from: NodeKey
    let to: NodeKey

    beforeEach(() => {
      from = toNodeKey(NodeType.Input, 0)
      to = toNodeKey(NodeType.Output, 1)
      link1 = createLink(from, to, 0.5, 1, null, null)
      link2 = createLink(from, to, 0.7, 1, null, null)
    })

    test('should successfully perform crossover with identical links', () => {
      const resultLink = link1.crossover(link2, 10, 5)
      expect(resultLink.weight).toBeCloseTo(0.6)
      expect(resultLink.from).toEqual(from)
      expect(resultLink.to).toEqual(to)
      expect(resultLink.innovation).toBe(1)
    })

    test('should throw an error for mismatched from node', () => {
      link2 = createLink(toNodeKey(NodeType.Hidden, 3), to, 0.7, 1, null, null)
      expect(() => {
        link1.crossover(link2, 10, 5)
      }).toThrowError('Mismatch in crossover')
    })

    test('should throw an error for mismatched to node', () => {
      link2 = createLink(
        from,
        toNodeKey(NodeType.Hidden, 3),
        0.7,
        1,
        null,
        null
      )
      expect(() => {
        link1.crossover(link2, 10, 5)
      }).toThrowError('Mismatch in crossover')
    })

    test('should throw an error for mismatched innovation numbers', () => {
      link2 = createLink(from, to, 0.7, 2, null, null)
      expect(() => {
        link1.crossover(link2, 10, 5)
      }).toThrowError('Mismatch in crossover')
    })

    test('should not return the same link', () => {
      const resultLink = link1.crossover(link2, 10, 5)
      expect(resultLink).not.toBe(link1)
      expect(resultLink).not.toBe(link2)
    })
  })

  describe('NEATLink distance', () => {
    let link1: NEATLink
    let link2: NEATLink
    let from: NodeKey
    let to: NodeKey

    beforeEach(() => {
      from = toNodeKey(NodeType.Input, 0)
      to = toNodeKey(NodeType.Output, 1)
      link1 = createLink(from, to, 0.5, 1, null, null)
      link2 = createLink(from, to, 0.7, 1, null, null)
    })

    test('should return zero distance for identical weights', () => {
      const link2 = createLink(from, to, 0.5, 1, null, null)
      const distance = link1.distance(link2)
      expect(distance).toBeCloseTo(0)
    })

    test('should return small positive distance for slightly different weights', () => {
      const link2 = createLink(from, to, 0.6, 1, null, null)
      const distance = link1.distance(link2)
      expect(distance).toBeGreaterThan(0)
      expect(distance).toBeLessThan(1)
    })

    test('should be symmetric', () => {
      const distance1 = link1.distance(link2)
      const distance2 = link2.distance(link1)
      expect(distance1).toBeCloseTo(distance2)
    })

    test('should return correct distance for known weights', () => {
      const distance = link1.distance(link2)
      const expectedDistance = Math.tanh(Math.abs(0.5 - 0.7))
      expect(distance).toBeCloseTo(expectedDistance)
    })
  })

  describe('NEATLink toJSON', () => {
    let link: NEATLink
    let from: NodeKey
    let to: NodeKey

    beforeEach(() => {
      from = toNodeKey(NodeType.Input, 0)
      to = toNodeKey(NodeType.Output, 1)
    })

    test('should return a JSON representation of the link', () => {
      link = createLink(from, to, 0.5, 1, null, null)
      expect(link.toJSON()).toEqual({
        from: link.from,
        to: link.to,
        weight: link.weight,
        innovation: link.innovation,
        config: link.config,
        state: link.state,
      })
    })

    test('should create a link from JSON data', () => {
      const data: LinkData<null, null> = {
        from,
        to,
        weight: 0.5,
        innovation: 1,
        config: null,
        state: null,
      }
      link = createLink(
        data.from,
        data.to,
        data.weight,
        data.innovation,
        data.config,
        data.state
      )
      expect(link.from).toEqual(data.from)
      expect(link.to).toEqual(data.to)
      expect(link.weight).toEqual(data.weight)
      expect(link.innovation).toEqual(data.innovation)
      expect(link.config).toEqual(data.config)
      expect(link.state).toEqual(data.state)
    })
  })
})
