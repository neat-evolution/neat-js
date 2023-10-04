import { NodeType } from '@neat-js/core'
import { beforeEach, describe, expect, test } from 'vitest'

import { createNode } from '../src/createNode.js'
import type { NEATNode } from '../src/NEATNode.js'

describe('NEATNode class', () => {
  describe('NEATNode methods', () => {
    let node: NEATNode

    beforeEach(() => {
      node = createNode(NodeType.Input, 1, null, null)
    })

    test('should return itself', () => {
      expect(node.neat()).toBe(node)
    })

    test('should return 0', () => {
      expect(node.distance(node)).toBe(0)
    })

    test('should return string', () => {
      expect(node.toString()).toBe('I[1]')
    })
  })

  describe('NEATNode crossover', () => {
    let node1: NEATNode
    let node2: NEATNode

    beforeEach(() => {
      node1 = createNode(NodeType.Input, 1, null, null)
      node2 = createNode(NodeType.Input, 1, null, null)
    })

    test('should successfully perform crossover when both nodes have the same type and ID', () => {
      const resultNode = node1.crossover(node2, 10, 5)
      expect(resultNode.type).toBe(NodeType.Input)
      expect(resultNode.id).toBe(1)
    })

    test('should throw an error for mismatched node types', () => {
      node2 = createNode(NodeType.Output, 1, null, null)
      expect(() => {
        node1.crossover(node2, 10, 5)
      }).toThrowError('Mismatch in crossover')
    })

    test('should throw an error for mismatched node IDs', () => {
      node2 = createNode(NodeType.Input, 2, null, null)
      expect(() => {
        node1.crossover(node2, 10, 5)
      }).toThrowError('Mismatch in crossover')
    })

    test('should not return the same node', () => {
      const resultNode = node1.crossover(node2, 10, 5)
      expect(resultNode).not.toBe(node1)
      expect(resultNode).not.toBe(node2)
    })

    test('should clone the fittest node', () => {
      const resultNode = node1.crossover(node2, 10, 5)
      expect(resultNode).toEqual(node1)
    })
  })

  describe('NEATNode toJSON', () => {
    test('should return a JSON representation of the node', () => {
      const node = createNode(NodeType.Input, 1, null, null)
      expect(node.toJSON()).toEqual({
        type: NodeType.Input,
        id: 1,
        config: null,
        state: null,
      })
    })

    test('should create a node from JSON data', () => {
      const data = {
        type: NodeType.Input,
        id: 1,
        config: null,
        state: null,
      }
      const node = createNode(data.type, data.id, data.config, data.state)
      expect(node.id).toEqual(data.id)
      expect(node.type).toEqual(data.type)
      expect(node.config).toEqual(data.config)
      expect(node.state).toEqual(data.state)
    })
  })
})
