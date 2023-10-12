import type { Activation, NodeFactoryOptions } from '@neat-js/core'

export interface CPPNNodeFactoryOptions extends NodeFactoryOptions {
  bias?: number
  activation?: Activation
}
