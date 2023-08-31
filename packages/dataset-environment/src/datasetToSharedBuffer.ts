import type { Dataset } from './Dataset.js'

// Converting Dataset to SharedArrayBuffer
export const datasetToSharedBuffer = (dataset: Dataset): SharedArrayBuffer => {
  // Calculate the total size needed
  const totalNumbers = [
    dataset.trainingInputs,
    dataset.trainingTargets,
    dataset.validationInputs,
    dataset.validationTargets,
    dataset.testInputs,
    dataset.testTargets,
  ].reduce((acc, arr) => acc + arr.flat().length, 0)

  const bufferSize =
    totalNumbers * Float64Array.BYTES_PER_ELEMENT + // for the number arrays
    9 * Int32Array.BYTES_PER_ELEMENT // for the 9 integers and booleans

  // Create the buffer and views
  const buffer = new SharedArrayBuffer(bufferSize + 4) // Adding 4 bytes for padding
  const intView = new Int32Array(buffer, 0, 10) // 10 integers including the padding
  const floatView = new Float64Array(buffer, intView.byteLength)

  // Populate the integer view
  intView[0] = dataset.dimensions.inputs
  intView[1] = dataset.dimensions.outputs
  intView[2] = dataset.isClassification ? 1 : 0
  intView[3] = dataset.oneHotOutput ? 1 : 0
  intView[4] = dataset.totalCount
  intView[5] = dataset.trainingCount
  intView[6] = dataset.validationCount
  intView[7] = dataset.testCount

  // Flatten all the 2D arrays and populate the float view
  let offset = 0
  for (const arr2d of [
    dataset.trainingInputs,
    dataset.trainingTargets,
    dataset.validationInputs,
    dataset.validationTargets,
    dataset.testInputs,
    dataset.testTargets,
  ]) {
    for (const arr of arr2d) {
      floatView.set(arr, offset)
      offset += arr.length
    }
  }

  return buffer
}
