// FIXME: Rename this to CoreOptions
export interface NEATConfigOptions {
  addNodeProbability: number
  addLinkProbability: number
  initialLinkWeightSize: number
  mutateLinkWeightProbability: number
  mutateLinkWeightSize: number
  removeNodeProbability: number
  removeLinkProbability: number
  onlyHiddenNodeDistance: boolean
  linkDistanceWeight: number
  mutateOnlyOneLink: boolean
}

export const defaultNEATConfigOptions: NEATConfigOptions = {
  addNodeProbability: 0.03,
  addLinkProbability: 0.2,
  initialLinkWeightSize: 0.5,
  mutateLinkWeightProbability: 0.9,
  mutateLinkWeightSize: 0.5,
  removeNodeProbability: 0.006,
  removeLinkProbability: 0.08,
  onlyHiddenNodeDistance: true,
  linkDistanceWeight: 0.5,
  mutateOnlyOneLink: true,
}
