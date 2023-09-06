import { State } from '@neat-js/core'
import type { StateFactoryOptions } from '@neat-js/core'

export class NEATState extends State<null, null, NEATState> {
  constructor(stateFactoryOptions?: StateFactoryOptions<null, null>) {
    super(null, null, stateFactoryOptions)
  }
}
