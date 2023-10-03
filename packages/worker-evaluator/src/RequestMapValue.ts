export interface RequestMapValue {
  resolve: (value: number | PromiseLike<number>) => void
  reject: (reason?: any) => void
}
