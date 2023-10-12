import { beforeEach, describe, expect, test } from 'vitest'

import { Connections } from '../src/Connections.js'
import { NodeType, type NodeKey, toNodeKey } from '../src/index.js'

describe('Connections', () => {
  describe('Connections constructor', () => {
    test('should instantiate without errors', () => {
      const instance = new Connections<NodeKey, number>()
      expect(instance).not.toBeNull()
    })
  })

  describe('Connections add method', () => {
    let connections: Connections<NodeKey, number>
    let node1: NodeKey
    let node2: NodeKey
    let node3: NodeKey
    let node4: NodeKey

    beforeEach(() => {
      connections = new Connections()
      node1 = toNodeKey(NodeType.Input, 0)
      node2 = toNodeKey(NodeType.Hidden, 0)
      node3 = toNodeKey(NodeType.Hidden, 1)
      node4 = toNodeKey(NodeType.Output, 0)
    })

    test('should add a new connection when connections is empty', () => {
      connections.add(node1, node2, 1)
      expect(connections.hasConnection(node1, node2)).toBe(true)
    })

    test('should add a new edge between two existing nodes', () => {
      connections.add(node1, node2, 1)
      connections.add(node2, node3, 1)
      expect(connections.hasConnection(node1, node2)).toBe(true)
      expect(connections.hasConnection(node2, node3)).toBe(true)
    })

    test('should add a new node and an edge when the node does not exist', () => {
      connections.add(node1, node2, 1)
      connections.add(node3, node4, 1)
      expect(connections.hasConnection(node1, node2)).toBe(true)
      expect(connections.hasConnection(node3, node4)).toBe(true)
    })

    test('should throw an error when adding an edge that creates a cycle', () => {
      connections.add(node1, node2, 1)
      connections.add(node2, node3, 1)
      connections.add(node3, node4, 1)
      expect(() => connections.add(node4, node1, 1)).toThrow(
        'cannot add link that creates cycle'
      )
    })

    test('should throw an error when adding an existing connection', () => {
      connections.add(node1, node2, 1)
      expect(() => connections.add(node1, node2, 1)).toThrow(
        'cannot add existing connection'
      )
    })
  })

  describe('Connections setEdge method', () => {
    let connections: Connections<NodeKey, number>
    let node1: NodeKey
    let node2: NodeKey
    let node3: NodeKey

    beforeEach(() => {
      connections = new Connections()
      node1 = toNodeKey(NodeType.Input, 0)
      node2 = toNodeKey(NodeType.Hidden, 0)
      node3 = toNodeKey(NodeType.Hidden, 1)
    })

    test('should update the edge of an existing connection', () => {
      connections.add(node1, node2, 1)
      connections.setEdge(node1, node2, 2)
      // Assuming you have a method to get an edge value, otherwise adjust this line
      expect(connections.getEdge(node1, node2)).toBe(2)
    })

    test('should throw an error if the "from" node does not exist', () => {
      expect(() => connections.setEdge(node1, node2, 1)).toThrow(
        'cannot set non-existent edge'
      )
    })

    test('should throw an error if the "to" node does not exist in the connections of the "from" node', () => {
      connections.add(node1, node2, 1)
      expect(() => connections.setEdge(node1, node3, 1)).toThrow(
        'cannot set non-existent edge'
      )
    })

    test('should throw an error if both nodes do not exist', () => {
      expect(() => connections.setEdge(node3, node1, 1)).toThrow(
        'cannot set non-existent edge'
      )
    })
  })

  describe('Connections getEdge method', () => {
    let connections: Connections<NodeKey, number>
    let node1: NodeKey
    let node2: NodeKey
    let node3: NodeKey

    beforeEach(() => {
      connections = new Connections()
      node1 = toNodeKey(NodeType.Input, 0)
      node2 = toNodeKey(NodeType.Hidden, 0)
      node3 = toNodeKey(NodeType.Hidden, 1)
    })

    test('should retrieve the edge of an existing connection', () => {
      connections.add(node1, node2, 1)
      const edge = connections.getEdge(node1, node2)
      expect(edge).toBe(1)
    })

    test('should throw an error if the "from" node does not exist', () => {
      expect(() => connections.getEdge(node1, node2)).toThrow(
        'cannot get non-existent edge'
      )
    })

    test('should throw an error if the "to" node does not exist in the connections of the "from" node', () => {
      connections.add(node1, node2, 1)
      expect(() => connections.getEdge(node1, node3)).toThrow(
        'cannot get non-existent edge'
      )
    })

    test('should throw an error if both nodes do not exist', () => {
      expect(() => connections.getEdge(node3, node1)).toThrow(
        'cannot get non-existent edge'
      )
    })
  })

  describe('Connections.connections method', () => {
    let connections: Connections<NodeKey, number>
    let node1: NodeKey
    let node2: NodeKey
    let node3: NodeKey
    let node4: NodeKey

    beforeEach(() => {
      connections = new Connections()
      node1 = toNodeKey(NodeType.Input, 0)
      node2 = toNodeKey(NodeType.Hidden, 0)
      node3 = toNodeKey(NodeType.Hidden, 1)
      node4 = toNodeKey(NodeType.Output, 0)
    })

    test('should return an empty list for an empty graph', () => {
      const allConnections = Array.from(connections.connections())
      expect(allConnections).toEqual([])
    })

    test('should return a list with one connection for a graph with one connection', () => {
      connections.add(node1, node2, 1)
      const allConnections = Array.from(connections.connections())
      expect(allConnections).toEqual([[node1, node2, 1]])
    })

    test('should return a list with multiple connections', () => {
      connections.add(node1, node2, 1)
      connections.add(node2, node3, 2)
      const allConnections = Array.from(connections.connections())
      expect(allConnections).toEqual([
        [node1, node2, 1],
        [node2, node3, 2],
      ])
    })

    test('should return all connections from the same source node', () => {
      connections.add(node1, node2, 1)
      connections.add(node1, node3, 2)
      const allConnections = Array.from(connections.connections())
      expect(allConnections).toEqual([
        [node1, node2, 1],
        [node1, node3, 2],
      ])
    })

    test('should return all connections to the same target node', () => {
      connections.add(node1, node4, 1)
      connections.add(node2, node4, 2)
      const allConnections = Array.from(connections.connections())
      expect(allConnections).toEqual([
        [node1, node4, 1],
        [node2, node4, 2],
      ])
    })
  })

  describe('Connections remove method', () => {
    let connections: Connections<NodeKey, number>
    let node1: NodeKey
    let node2: NodeKey
    let node3: NodeKey
    beforeEach(() => {
      connections = new Connections()
      node1 = toNodeKey(NodeType.Input, 0)
      node2 = toNodeKey(NodeType.Hidden, 0)
      node3 = toNodeKey(NodeType.Output, 0)
    })

    test('should remove a connection without errors', () => {
      connections.add(node1, node2, 1)
      const edge = connections.delete(node1, node2)
      expect(edge).toBe(1)
      expect(connections.hasConnection(node1, node2)).toBe(false)
    })

    test('should throw an error when removing a non-existent connection', () => {
      expect(() => connections.delete(node1, node2)).toThrow(
        'cannot remove non-existent connection'
      )
    })

    test('should not remove other connections when removing one', () => {
      connections.add(node1, node2, 1)
      connections.add(node1, node3, 2)
      connections.delete(node1, node2)
      expect(connections.hasConnection(node1, node3)).toBe(true)
    })

    test('should remove node entry when removing the last edge', () => {
      connections.add(node1, node2, 1)
      connections.delete(node1, node2)
      // Add some method or check to validate that `node1` no longer exists in `connections`.
      expect(connections.hasNode(node1)).toBe(false)
    })

    test('should return the correct edge data when removing', () => {
      connections.add(node1, node2, 42)
      const edge = connections.delete(node1, node2)
      expect(edge).toBe(42)
    })
  })

  describe('Connections removeNode method', () => {
    let connections: Connections<NodeKey, number>
    let node1: NodeKey
    let node2: NodeKey
    let node3: NodeKey
    beforeEach(() => {
      connections = new Connections()
      node1 = toNodeKey(NodeType.Input, 0)
      node2 = toNodeKey(NodeType.Hidden, 1)
      node3 = toNodeKey(NodeType.Output, 2)
    })

    test('should remove a node without errors', () => {
      connections.add(node1, node2, 1)
      const removed = connections.deleteNode(node1)
      expect(removed.length).toBe(1)
    })

    test('should remove all outgoing edges from the node', () => {
      connections.add(node1, node2, 1)
      connections.add(node1, node3, 2)
      connections.deleteNode(node1)
      expect(connections.hasConnection(node1, node2)).toBe(false)
      expect(connections.hasConnection(node1, node3)).toBe(false)
    })

    test('should remove all inbound edges to the node', () => {
      connections.add(node2, node1, 1)
      connections.add(node3, node1, 2)
      connections.deleteNode(node1)
      expect(connections.hasConnection(node2, node1)).toBe(false)
      expect(connections.hasConnection(node3, node1)).toBe(false)
    })

    test('should remove nodes with no remaining connections', () => {
      connections.add(node1, node2, 1)
      connections.deleteNode(node1)
      expect(connections.hasConnection(node1, node2)).toBe(false)
      expect(connections.hasNode(node1)).toBe(false)
      expect(connections.hasNode(node2)).toBe(false)
    })

    test('should return all removed connections', () => {
      const node4: NodeKey = toNodeKey(NodeType.Output, 3)

      connections.add(node1, node2, 1)
      connections.add(node2, node3, 2)
      connections.add(node3, node4, 3)

      const removed = connections.deleteNode(node2)

      expect(removed).toEqual([
        [node2, node3, 2],
        [node1, node2, 1],
      ])
    })
  })

  describe('Connections createsCycle method', () => {
    let connections: Connections<NodeKey, number>
    let node1: NodeKey
    let node2: NodeKey
    let node3: NodeKey
    let node4: NodeKey

    beforeEach(() => {
      connections = new Connections()
      node1 = toNodeKey(NodeType.Input, 0)
      node2 = toNodeKey(NodeType.Hidden, 0)
      node3 = toNodeKey(NodeType.Hidden, 1)
      node4 = toNodeKey(NodeType.Output, 0)
    })

    test('should return false when the graph is empty', () => {
      expect(connections.createsCycle(node1, node2)).toBe(false)
    })

    test('should return true when addition creates a cycle in a simple graph', () => {
      connections.add(node1, node2, 1)
      expect(connections.createsCycle(node2, node1)).toBe(true)
    })

    test('should return false when nodes are not connected', () => {
      connections.add(node1, node2, 1)
      connections.add(node3, node4, 1)
      expect(connections.createsCycle(node4, node1)).toBe(false)
    })
  })

  describe('Connections sortTopologically method', () => {
    let connections: Connections<NodeKey, number>
    let node1: NodeKey
    let node2: NodeKey
    let node3: NodeKey
    let node4: NodeKey

    beforeEach(() => {
      connections = new Connections()
      node1 = toNodeKey(NodeType.Input, 1)
      node2 = toNodeKey(NodeType.Hidden, 2)
      node3 = toNodeKey(NodeType.Hidden, 3)
      node4 = toNodeKey(NodeType.Output, 4)
    })

    test('should return empty array for empty graph', () => {
      const result = Array.from(connections.sortTopologically())
      expect(result).toEqual([]) // Expects an empty array
    })

    test('should correctly sort a single connection', () => {
      connections.add(node1, node2, 1)
      const result = Array.from(connections.sortTopologically())
      expect(result).toEqual([[node1], [node1, node2, 1], [node2]])
    })

    test('should correctly sort a linear chain', () => {
      connections.add(node1, node2, 1)
      connections.add(node2, node3, 2)
      connections.add(node3, node4, 3)

      const result = Array.from(connections.sortTopologically())

      expect(result).toEqual([
        [node1],
        [node1, node2, 1],
        [node2],
        [node2, node3, 2],
        [node3],
        [node3, node4, 3],
        [node4],
      ])
    })

    test('should correctly sort a tree structure', () => {
      connections.add(node1, node2, 1)
      connections.add(node1, node3, 2)
      connections.add(node2, node4, 3)
      connections.add(node3, node4, 4)

      const result = Array.from(connections.sortTopologically())

      expect(result).toEqual([
        [node1],
        [node1, node2, 1],
        [node1, node3, 2],
        [node3],
        [node3, node4, 4],
        [node2],
        [node2, node4, 3],
        [node4],
      ])
    })

    test('should correctly sort a tree structure (reverse add)', () => {
      connections.add(node3, node4, 4)
      connections.add(node2, node4, 3)
      connections.add(node1, node3, 2)
      connections.add(node1, node2, 1)

      const result = Array.from(connections.sortTopologically())

      expect(result).toEqual([
        [node1],
        [node1, node3, 2],
        [node1, node2, 1],
        [node2],
        [node2, node4, 3],
        [node3],
        [node3, node4, 4],
        [node4],
      ])
    })
  })
})
