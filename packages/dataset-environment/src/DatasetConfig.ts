export interface DatasetConfig {
  dataset: string
  seed: string
  validationFraction: number
  testFraction: number
  addBiasInput: boolean
}

export const defaultDatasetConfig: DatasetConfig = {
  dataset: './generated/iris',
  seed: '0',
  validationFraction: 0.0,
  testFraction: 0.0,
  addBiasInput: false,
}
