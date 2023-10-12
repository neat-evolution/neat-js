import { CoreState } from '@neat-js/core'
import type { StateData } from '@neat-js/core'

export class NEATState extends CoreState<null, null, null, null, StateData> {
  override node(): null {
    return null
  }

  override link(): null {
    return null
  }
}
