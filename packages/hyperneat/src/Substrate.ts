import { type SubstrateAction } from './SubstrateAction.js'

export interface Substrate {
  length: number
  inputs: number[]
  outputs: number[]
  actions: SubstrateAction[]
}
