export interface DatasetOptions {
  dataset: string
  seed: string
  validationFraction: number
  testFraction: number
  addBiasInput: boolean
}

export const defaultDatasetOptions: DatasetOptions = {
  // FIXME: use new URL(pathname, import.meta.url).pathname
  dataset: './generated/iris',
  seed: '0',
  validationFraction: 0.1,
  testFraction: 0.1,
  addBiasInput: false,
}
