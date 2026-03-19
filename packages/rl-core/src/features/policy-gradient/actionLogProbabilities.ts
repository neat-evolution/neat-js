export function computeActionLogProbability(
  action: Float64Array,
  actionProbabilities: Float64Array
): number {
  if (action.length === actionProbabilities.length) {
    let chosenIndex = -1
    for (let i = 0; i < action.length; i++) {
      if (action[i] === 1) {
        chosenIndex = i
        break
      }
    }

    if (chosenIndex === -1) {
      throw new Error('Action must contain a chosen index')
    }

    return Math.log(Math.max(actionProbabilities[chosenIndex] as number, 1e-10))
  }

  if (actionProbabilities.length === 2 * action.length) {
    let logProbability = 0
    for (let factorIndex = 0; factorIndex < action.length; factorIndex++) {
      const chosenIndex =
        action[factorIndex] === 1 ? 2 * factorIndex : 2 * factorIndex + 1
      logProbability += Math.log(
        Math.max(actionProbabilities[chosenIndex] as number, 1e-10)
      )
    }
    return logProbability
  }

  throw new Error(
    'Action and action probabilities must have compatible lengths'
  )
}
