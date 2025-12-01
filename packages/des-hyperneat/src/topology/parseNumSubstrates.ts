import type { IOConfig } from '../DESHyperNEATGenomeOptions.js'

export const parseNumSubstrates = (conf: IOConfig, num: number): number => {
  switch (conf) {
    case 'line':
      return 1
    case 'separate':
      return num
    default:
      try {
        return conf.length
      } catch (_e) {
        throw new Error('Unable to parse num substrates')
      }
  }
}
