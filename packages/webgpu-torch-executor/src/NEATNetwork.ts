import { NodeType } from '@neat-js/core'
import type { NEATConnection, NEATGenome, type NEATNode } from '@neat-js/core'
import {
  type ActivationFunction,
  toActivationFunction,
} from '@neat-js/executor/Activation.js'
import * as torch from 'webgpu-torch'
import type { Tensor, TensorArrayData } from 'webgpu-torch'

const cat = async (tensors: Tensor[]): Promise<Tensor> => {
  const values: number[][] = []
  for (const tensor of tensors) {
    const value = (await tensor.toArrayAsync()) as number[]
    values.push(value)
  }
  return torch.tensor(values.flat())
}

export class NEATNetwork {
  private readonly weights: Map<string, Tensor>
  private readonly activations: Map<number, ActivationFunction>
  private readonly biases: Map<number, Tensor>

  private readonly genome: NEATGenome
  private readonly inputNodes: NEATNode[]
  private readonly hiddenNodes: NEATNode[]
  private readonly outputNodes: NEATNode[]
  private readonly incomingEdges: Map<number, NEATConnection[]>

  constructor(genome: NEATGenome) {
    this.genome = genome

    this.inputNodes = genome.nodes.filter(
      (node) => node.type === NodeType.Input
    )
    this.hiddenNodes = genome.nodes.filter(
      (node) => node.type === NodeType.Hidden
    )
    this.outputNodes = genome.nodes.filter(
      (node) => node.type === NodeType.Output
    )

    this.weights = new Map()

    for (const edge of genome.edges) {
      this.weights.set(`${edge.from}-${edge.to}`, torch.tensor([edge.weight]))
    }

    this.biases = new Map()
    this.activations = new Map()
    this.incomingEdges = new Map()

    for (const node of genome.nodes) {
      this.biases.set(node.id, torch.tensor([node.bias]))
      this.activations.set(node.id, toActivationFunction(node.activation))
      this.incomingEdges.set(
        node.id,
        genome.edges.filter((edge) => edge.to === node.id)
      )
    }
  }

  async forward(input: Tensor): Promise<Tensor> {
    const nodeValues = new Map<number, Tensor>()
    const inputData = await input.toArrayAsync()

    // Set initial input values
    for (const [i, inputNode] of this.inputNodes.entries()) {
      const value = inputData[i] as number | TensorArrayData
      nodeValues.set(inputNode.id, torch.tensor([value]))
    }

    for (const node of this.genome.nodes) {
      if (node.type !== NodeType.Input) {
        const incomingEdges = this.incomingEdges.get(
          node.id
        ) as NEATConnection[]

        let sumInput = incomingEdges.reduce((sum, edge) => {
          const inputValue = nodeValues.get(edge.from) as Tensor
          const weight = this.weights.get(`${edge.from}-${edge.to}`) as Tensor
          return sum.add(inputValue.mul(weight))
        }, torch.zeros([1]))

        const bias = this.biases.get(node.id) as Tensor
        sumInput = sumInput.add(bias)
        const activate = this.activations.get(node.id) as ActivationFunction
        nodeValues.set(node.id, activate(sumInput))
      }
    }

    const outputValues = this.outputNodes.map(
      (node) => nodeValues.get(node.id) as Tensor
    )
    return await cat(outputValues)
  }

  async evaluate(input: number[]): Promise<Array<number | TensorArrayData>> {
    const inputTensor = torch.tensor(input)
    const outputTensor = await this.forward(inputTensor)
    return await outputTensor.toArrayAsync()
  }

  toModel(): NEATGenome {
    return this.genome
  }
}
