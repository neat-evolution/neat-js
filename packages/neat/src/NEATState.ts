import { State } from '@neat-js/core'
import type { StateData } from '@neat-js/core'

export class NEATState extends State<null, null> {
  constructor(data?: StateData<null, null>) {
    super(null, null, data)
  }
}
