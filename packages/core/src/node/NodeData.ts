import type { ConfigOptions } from '../config/ConfigOptions.js'

import type { NodeFactoryOptions } from './NodeFactoryOptions.js'

export interface NodeData<
  NFO extends NodeFactoryOptions,
  NCO extends ConfigOptions,
  NSD,
> {
  config: NCO
  state: NSD
  factoryOptions: NFO
}
