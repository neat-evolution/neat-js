export interface DatasetOptions {
  dataset: string
  seed: string
  validationFraction: number
  testFraction: number
  addBiasInput: boolean
}

export const defaultDatasetOptions: DatasetOptions = {
  dataset: './generated/iris',
  seed: '10',
  validationFraction: 0.1,
  testFraction: 0.1,
  addBiasInput: false,
}
