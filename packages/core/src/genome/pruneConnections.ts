// import { nodeRefToKey, type NodeRef } from '../node/Node.js'

// import type { Connections, Edge, Target } from './Connections.js'
// import type { NodeKey } from './topologicalSort.js'

// // FIXME: Placeholder
// export class Foo<N extends NodeRef = NodeRef, E extends Edge = Edge> {
//   private readonly connections: Connections<N, E>

//   constructor(connections: Connections<N, E>) {
//     this.connections = connections
//   }

//   // FIXME: move prune to a new file
//   prune(inputs: Set<N>, outputs: Set<N>, collect: boolean): Set<N> {
//     const pruned = new Set<N>()
//     this.pruneDanglingInputs(inputs, collect, pruned)
//     this.pruneDanglingOutputs(outputs, collect, pruned)
//     return pruned
//   }

//   pruneDanglingInputs(
//     inputs: Set<N>,
//     collect: boolean,
//     prunedRef?: Set<N>
//   ): Set<N> {
//     // FIXME: NodeRefs must be compared as keys
//     const backwardCount = new Map<NodeKey, number>()
//     for (const data of this.connectionMap.values()) {
//       for (const target of data.targets) {
//         backwardCount.set(
//           nodeRefToKey(target.node),
//           (backwardCount.get(nodeRefToKey(target.node)) ?? 0) + 1
//         )
//       }
//     }

//     const pruned: Set<N> = prunedRef ?? new Set<N>()
//     const inputKeys = new Set<NodeKey>(Array.from(inputs).map(nodeRefToKey))
//     let done = false
//     while (!done) {
//       const danglingInputs = new Set<NodeKey>()

//       for (const { node } of this.connectionMap.values()) {
//         const nodeKey = nodeRefToKey(node)
//         const count = backwardCount.get(nodeKey) ?? 0
//         if (!inputKeys.has(nodeKey) && count === 0) {
//           danglingInputs.add(nodeKey)
//         }
//       }
//       if (danglingInputs.size === 0) {
//         done = true
//       }
//       for (const nodeKey of danglingInputs) {
//         const targets = this.connectionMap.get(nodeKey)?.targets

//         backwardCount.delete(nodeKey)
//         this.connectionMap.delete(nodeKey)

//         if (targets === undefined) {
//           continue
//         }

//         for (const { node } of targets) {
//           const key = nodeRefToKey(node)
//           const count = backwardCount.get(key) ?? 0
//           backwardCount.set(key, count - 1)
//         }
//       }
//       if (collect) {
//         for (const nodeKey of danglingInputs) {
//           const node = Array.from(inputs).find(
//             (n) => nodeRefToKey(n) === nodeKey
//           )
//           // FIXME: does this happen in practice?
//           if (node == null) {
//             throw new Error('cannot find node')
//           }
//           pruned.add(node)
//         }
//       }
//     }

//     return pruned
//   }

//   pruneDanglingOutputs(
//     outputs: Set<N>,
//     collect: boolean,
//     prunedRef?: Set<N>
//   ): Set<N> {
//     const pruned = prunedRef ?? new Set<N>()

//     const outputKeys = new Set<NodeKey>(Array.from(outputs).map(nodeRefToKey))

//     let done = false
//     while (!done) {
//       let deletedNode = false

//       for (const source of this.sources()) {
//         const targets =
//           this.connectionMap.get(nodeRefToKey(source))?.targets ?? []
//         const deleteIndexes: number[] = []

//         for (const [i, { node: targetNode }] of targets.entries()) {
//           const targetKey = nodeRefToKey(targetNode)
//           if (
//             !outputKeys.has(targetKey) &&
//             !this.connectionMap.has(targetKey)
//           ) {
//             deleteIndexes.push(i)
//           }
//         }

//         if (deleteIndexes.length > 0) {
//           deletedNode = true
//           if (deleteIndexes.length === targets.length) {
//             if (collect) {
//               for (const { node } of targets) {
//                 pruned.add(node)
//               }
//             }
//             this.connectionMap.delete(nodeRefToKey(source))
//           } else {
//             for (const deleteIndex of deleteIndexes) {
//               if (collect && targets[deleteIndex] !== undefined) {
//                 const node = (targets[deleteIndex] as Target<N, E>).node
//                 pruned.add(node)
//               }
//               targets.splice(deleteIndex, 1)
//             }
//           }
//         }
//       }
//       if (!deletedNode) {
//         done = true
//       }
//     }
//     return pruned
//   }
// }
