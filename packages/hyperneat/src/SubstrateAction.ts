export enum SubstrateActionType {
  Activation = 'Activation',
  Link = 'Link',
}

export interface SubstrateActivationAction {
  type: SubstrateActionType.Activation
  node: number
  x: number
  y: number
}

export interface SubstrateLinkAction {
  type: SubstrateActionType.Link
  from: number
  to: number
  x0: number
  y0: number
  x1: number
  y1: number
}

export type SubstrateAction = SubstrateActivationAction | SubstrateLinkAction

export function isSubstrateActivationAction(
  action: SubstrateAction
): action is SubstrateActivationAction {
  return action.type === SubstrateActionType.Activation
}

export function isSubstrateLinkAction(
  action: SubstrateAction
): action is SubstrateLinkAction {
  return action.type === SubstrateActionType.Link
}
