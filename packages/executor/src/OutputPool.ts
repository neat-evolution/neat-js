/**
 * A Float64Array augmented with pool lifecycle methods.
 *
 * Read values via indexed access: `output[0]`, `output[1]`, etc.
 * When done reading, either:
 * - Call `output.release()` to return the array to the pool (hot path)
 * - Call `output.readAndRelease()` to get a durable copy and auto-release
 */
export interface PooledFloat64Array extends Float64Array {
  /** Return this output array to the pool. Values become invalid after release. */
  release(): void
  /** Create a durable Float64Array copy and release this array back to the pool. */
  readAndRelease(): Float64Array
}

export class OutputPool {
  private readonly pool: PooledFloat64Array[] = []
  private readonly size: number

  constructor(outputSize: number) {
    this.size = outputSize
  }

  private create(): PooledFloat64Array {
    const arr = new Float64Array(this.size)
    const pool = this

    // Add non-enumerable lifecycle methods directly on the Float64Array instance.
    // This preserves full indexed access (arr[0], arr[1], etc.) while adding
    // pool management. Non-enumerable so they don't interfere with iteration.
    Object.defineProperty(arr, 'release', {
      value() {
        pool.return(arr as PooledFloat64Array)
      },
      enumerable: false,
      configurable: false,
    })

    Object.defineProperty(arr, 'readAndRelease', {
      value() {
        const copy = new Float64Array(arr)
        pool.return(arr as PooledFloat64Array)
        return copy
      },
      enumerable: false,
      configurable: false,
    })

    return arr as PooledFloat64Array
  }

  /** Get a pooled output array. Caller must release() or readAndRelease() when done. */
  acquire(): PooledFloat64Array {
    return this.pool.pop() ?? this.create()
  }

  private return(output: PooledFloat64Array): void {
    this.pool.push(output)
  }
}
