import { CoreState } from '@neat-js/core'

import { CustomState } from './CustomState.js'
import type { CustomStateData } from './CustomStateData.js'
import type { DESHyperNEATStateData } from './DESHyperNEATStateData.js'

export class DESHyperNEATState extends CoreState<
  CustomStateData,
  CustomStateData,
  CustomState,
  CustomState,
  DESHyperNEATStateData
> {
  public readonly custom: CustomState

  constructor(factoryOptions?: DESHyperNEATStateData) {
    super(factoryOptions)
    this.custom = new CustomState(factoryOptions?.custom)
  }

  override node(): CustomState {
    return this.custom
  }

  override link(): CustomState {
    return this.custom
  }

  override toJSON(): DESHyperNEATStateData {
    return {
      ...super.toJSON(),
      custom: this.custom.toJSON(),
    }
  }
}
