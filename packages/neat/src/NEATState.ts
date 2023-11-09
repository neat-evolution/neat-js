import { CoreState } from '@neat-evolution/core'
import type { StateData } from '@neat-evolution/core'

export class NEATState extends CoreState<null, null, null, null, StateData> {
  override node(): null {
    return null
  }

  override link(): null {
    return null
  }
}
