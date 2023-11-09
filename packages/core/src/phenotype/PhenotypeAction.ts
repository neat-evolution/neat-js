import { type Activation } from '../Activation.js'

export enum PhenotypeActionType {
  Link = 'Link',
  Activation = 'Activation',
}

export type PhenotypeLinkAction = [
  type: PhenotypeActionType.Link,
  from: number,
  to: number,
  weight: number
]

export type PhenotypeActivationAction = [
  type: PhenotypeActionType.Activation,
  node: number,
  bias: number,
  activation: Activation
]

export type PhenotypeAction = PhenotypeLinkAction | PhenotypeActivationAction

export function isPhenotypeLinkAction(
  action: PhenotypeAction
): action is PhenotypeLinkAction {
  return action[0] === PhenotypeActionType.Link
}

export function isPhenotypeActivationAction(
  action: PhenotypeAction
): action is PhenotypeActivationAction {
  return action[0] === PhenotypeActionType.Activation
}
