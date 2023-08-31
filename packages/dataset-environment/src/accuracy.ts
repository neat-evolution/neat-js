type Matrix = number[][]

export const argmax = (vec: number[]): number => {
  let bestIdx = 0
  for (let i = 0; i < vec.length; i++) {
    if ((vec[i] as number) > (vec[bestIdx] as number)) {
      bestIdx = i
    }
  }
  return bestIdx
}

export const oneHotAccuracy = (targets: Matrix, outputs: Matrix): number => {
  let correctMatches = 0

  for (let i = 0; i < targets.length; i++) {
    if (argmax(targets[i] as number[]) === argmax(outputs[i] ?? [0])) {
      correctMatches += 1
    }
  }

  return correctMatches / targets.length
}

export const roundedAccuracy = (targets: Matrix, outputs: Matrix): number => {
  let matchedRoundedVals = 0

  for (let i = 0; i < targets.length; i++) {
    const targetRow = targets[i] as number[]
    const outputRow = outputs[i] as number[]
    let matchedCounts = 0

    for (let j = 0; j < targetRow.length; j++) {
      if (
        Math.round(targetRow[j] as number) === Math.round(outputRow[j] ?? 0)
      ) {
        matchedCounts++
      }
    }

    matchedRoundedVals += matchedCounts / targetRow.length
  }

  return matchedRoundedVals / targets.length
}

export const binaryAccuracy = (targets: Matrix, outputs: Matrix): number => {
  let matchedBinaryVals = 0

  for (let i = 0; i < targets.length; i++) {
    const targetRow = targets[i] as number[]
    const outputRow = outputs[i] as number[]
    let matchedCounts = 0

    for (let j = 0; j < targetRow.length; j++) {
      if ((targetRow[j] as number) > 0 === (outputRow[j] ?? 0) > 0) {
        matchedCounts++
      }
    }

    matchedBinaryVals += matchedCounts / targetRow.length
  }

  return matchedBinaryVals / targets.length
}
