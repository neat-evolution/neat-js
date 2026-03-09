export class CompatMessageEvent<T = unknown> {
  readonly data: T
  readonly type: 'message'

  constructor(data: T) {
    this.data = data
    this.type = 'message'
  }
}

export type WorkerMessageEvent<T = unknown> =
  | MessageEvent<T>
  | CompatMessageEvent<T>
