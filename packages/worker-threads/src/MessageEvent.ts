export class CompatMessageEvent<T = any> {
  readonly data: T
  readonly type: 'message'

  constructor(data: T) {
    this.data = data
    this.type = 'message'
  }
}

export type WorkerMessageEvent<T = any> =
  | MessageEvent<T>
  | CompatMessageEvent<T>
