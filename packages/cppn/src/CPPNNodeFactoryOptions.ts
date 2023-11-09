import type { Activation, NodeFactoryOptions } from '@neat-evolution/core'

export interface CPPNNodeFactoryOptions extends NodeFactoryOptions {
  bias?: number
  activation?: Activation
}
