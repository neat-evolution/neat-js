import { State } from './state/State.js'
import type { StateData } from './state/StateData.js'

export class NEATState extends State<null, null> {
  constructor(data?: StateData<null, null>) {
    super(null, null, data)
  }
}
