import { type Activation } from '@neat-js/core'

export enum PhenotypeActionType {
  Link = 'Link',
  Activation = 'Activation',
}

export interface PhenotypeLinkAction {
  type: PhenotypeActionType.Link
  from: number
  to: number
  weight: number
}

export interface PhenotypeActivationAction {
  type: PhenotypeActionType.Activation
  node: number
  bias: number
  activation: Activation
}

export type PhenotypeAction = PhenotypeLinkAction | PhenotypeActivationAction

export function isPhenotypeLinkAction(
  action: PhenotypeAction
): action is PhenotypeLinkAction {
  return action.type === PhenotypeActionType.Link
}

export function isPhenotypeActivationAction(
  action: PhenotypeAction
): action is PhenotypeActivationAction {
  return action.type === PhenotypeActionType.Activation
}
