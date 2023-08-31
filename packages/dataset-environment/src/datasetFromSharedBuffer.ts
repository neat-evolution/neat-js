import type { Dataset } from './Dataset.js'

// Converting SharedArrayBuffer to Dataset
export const datasetFromSharedBuffer = (buffer: SharedArrayBuffer): Dataset => {
  const intView = new Int32Array(buffer, 0, 10)
  const floatView = new Float64Array(buffer, intView.byteLength)

  // Reconstruct the Dataset object
  let offset = 0

  const create2DArray = (count: number, length: number) => {
    const arr2d: number[][] = []
    for (let i = 0; i < count; i++) {
      // assuming each array is of length `dimensions.inputs` for simplicity
      const arr = Array.from(floatView.slice(offset, offset + length))
      arr2d.push(arr)
      offset += length
    }
    return arr2d
  }

  return {
    dimensions: {
      inputs: intView[0] as number,
      outputs: intView[1] as number,
    },
    isClassification: Boolean(intView[2]),
    oneHotOutput: Boolean(intView[3]),
    trainingInputs: create2DArray(intView[5] as number, intView[0] as number),
    trainingTargets: create2DArray(intView[5] as number, intView[1] as number),
    validationInputs: create2DArray(intView[6] as number, intView[0] as number),
    validationTargets: create2DArray(
      intView[6] as number,
      intView[1] as number
    ),
    testInputs: create2DArray(intView[7] as number, intView[0] as number),
    testTargets: create2DArray(intView[7] as number, intView[1] as number),
    totalCount: intView[4] as number,
    trainingCount: intView[5] as number,
    validationCount: intView[6] as number,
    testCount: intView[7] as number,
  }
}
