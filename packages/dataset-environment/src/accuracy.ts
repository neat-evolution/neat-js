type Matrix = number[][]

export const argmax = (vec: number[]): number => {
  return vec.reduce(
    (bestIdx, currVal, currIdx, arr) =>
      currVal > (arr[bestIdx] ?? 0) ? currIdx : bestIdx,
    0
  )
}

export const oneHotAccuracy = (targets: Matrix, outputs: Matrix): number => {
  const correctMatches = targets
    .map<number>((targetRow, index) =>
      argmax(targetRow) === argmax(outputs[index] ?? [0]) ? 1 : 0
    )
    .reduce((acc, curr) => acc + curr, 0)

  return correctMatches / targets.length
}

export const roundedAccuracy = (targets: Matrix, outputs: Matrix): number => {
  const matchedRoundedVals = targets
    .map((targetRow, index) => {
      const outputRow = outputs[index] as number[]
      const matchedCounts = targetRow
        .map<number>((tVal, tIndex) =>
          Math.round(tVal) === Math.round(outputRow[tIndex] ?? 0) ? 1 : 0
        )
        .reduce((acc, curr) => acc + curr, 0)
      return matchedCounts / targetRow.length
    })
    .reduce((acc, curr) => acc + curr, 0)

  return matchedRoundedVals / targets.length
}

export const binaryAccuracy = (targets: Matrix, outputs: Matrix): number => {
  const matchedBinaryVals = targets
    .map((targetRow, index) => {
      const outputRow = outputs[index] as number[]
      const matchedCounts = targetRow
        .map<number>((tVal, tIndex) =>
          tVal > 0 === (outputRow[tIndex] ?? 0) > 0 ? 1 : 0
        )
        .reduce((acc, curr) => acc + curr, 0)
      return matchedCounts / targetRow.length
    })
    .reduce((acc, curr) => acc + curr, 0)

  return matchedBinaryVals / targets.length
}
