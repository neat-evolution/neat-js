import {
  type LinkData,
  type LinkFactoryOptions,
  type NodeKey,
  NodeType,
  toLinkKey,
  toNodeKey,
} from '@neat-evolution/core'
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
      const factoryOptions = {
        from,
        to,
        weight: 0.5,
        innovation: toLinkKey(from, to),
      }
      link = createLink(factoryOptions, null, null)
    })

    test('should return string', () => {
      expect(link.toString()).toBe(String(toLinkKey(from, to)))
    })

    test('should return identity link', () => {
      const factoryOptions = {
        from,
        to,
        weight: 0.5,
        innovation: toLinkKey(from, to),
      }
      const expected = createLink(factoryOptions, null, null)
      const result = link.identity(factoryOptions)
      expect(result).toEqual(expected)
    })

    test('should return cloneWith link', () => {
      const factoryOptions = {
        from,
        to,
        weight: 0.5,
        innovation: toLinkKey(from, to),
      }
      const expected = createLink(factoryOptions, null, null)
      const result = link.cloneWith(factoryOptions)
      expect(result).toEqual(expected)
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
      const innovation = toLinkKey(from, to)
      link1 = createLink({ from, to, weight: 0.5, innovation }, null, null)
      link2 = createLink({ from, to, weight: 0.7, innovation }, null, null)
    })

    test('should successfully perform crossover with identical links', () => {
      const resultLink = link1.crossover(link2, 10, 5)
      expect(resultLink.weight).toBeCloseTo(0.6)
      expect(resultLink.from).toEqual(from)
      expect(resultLink.to).toEqual(to)
      expect(resultLink.innovation).toBe(toLinkKey(from, to))
    })

    test('should throw an error for mismatched from node', () => {
      link2 = createLink(
        {
          from: toNodeKey(NodeType.Hidden, 3),
          to,
          weight: 0.7,
          innovation: toLinkKey(toNodeKey(NodeType.Hidden, 3), to),
        },
        null,
        null
      )
      expect(() => {
        link1.crossover(link2, 10, 5)
      }).toThrowError('Mismatch in crossover')
    })

    test('should throw an error for mismatched to node', () => {
      link2 = createLink(
        {
          from,
          to: toNodeKey(NodeType.Hidden, 3),
          weight: 0.7,
          innovation: toLinkKey(from, toNodeKey(NodeType.Hidden, 3)),
        },
        null,
        null
      )
      expect(() => {
        link1.crossover(link2, 10, 5)
      }).toThrowError('Mismatch in crossover')
    })

    test('should throw an error for mismatched innovation numbers', () => {
      link2 = createLink(
        { from, to, weight: 0.7, innovation: toLinkKey(to, from) },
        null,
        null
      )
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
      const innovation = toLinkKey(from, to)
      link1 = createLink({ from, to, weight: 0.5, innovation }, null, null)
      link2 = createLink({ from, to, weight: 0.7, innovation }, null, null)
    })

    test('should return zero distance for identical weights', () => {
      const link2 = createLink(
        { from, to, weight: 0.5, innovation: toLinkKey(from, to) },
        null,
        null
      )
      const distance = link1.distance(link2)
      expect(distance).toBeCloseTo(0)
    })

    test('should return small positive distance for slightly different weights', () => {
      const link2 = createLink(
        { from, to, weight: 0.6, innovation: toLinkKey(from, to) },
        null,
        null
      )
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
      link = createLink(
        { from, to, weight: 0.5, innovation: toLinkKey(from, to) },
        null,
        null
      )
      expect(link.toJSON()).toEqual({
        factoryOptions: {
          from: link.from,
          to: link.to,
          weight: link.weight,
          innovation: link.innovation,
        },
        config: link.config,
        state: link.state,
      })
    })

    test('should create a link from JSON data', () => {
      const data: LinkData<LinkFactoryOptions, null, null> = {
        factoryOptions: {
          from,
          to,
          weight: 0.5,
          innovation: toLinkKey(from, to),
        },
        config: null,
        state: null,
      }
      link = createLink(
        {
          from: data.factoryOptions.from,
          to: data.factoryOptions.to,
          weight: data.factoryOptions.weight,
          innovation: data.factoryOptions.innovation,
        },
        data.config,
        data.state
      )
      expect(link.from).toEqual(data.factoryOptions.from)
      expect(link.to).toEqual(data.factoryOptions.to)
      expect(link.weight).toEqual(data.factoryOptions.weight)
      expect(link.innovation).toEqual(data.factoryOptions.innovation)
      expect(link.config).toEqual(data.config)
      expect(link.state).toEqual(data.state)
    })
  })
})
