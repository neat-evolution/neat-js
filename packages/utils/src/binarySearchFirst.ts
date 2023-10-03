/**
 * Trying to replicate Vec::binary_search from Rust.
 * Example: let source_index = wheel.binary_search(&val).unwrap_or_else(|x| x);
 * @see https://github.com/tenstad/des-hyperneat/blob/431d3bf99789111dd8093cae7c26bdfb9930f9f0/evolution/src/neat/genome.rs#L508
 * @param {number[]} arr Array to search
 * @param {number} val The value to search for
 * @returns {number} The index of the value if found, or the index where the value should be inserted
 */
export const binarySearchFirst = <T>(arr: T[], val: T): number => {
  let left = 0
  let right = arr.length - 1
  let result: number | null = null

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    if ((arr[mid] as T) < val) {
      left = mid + 1
    } else {
      right = mid - 1
      if (arr[mid] === val) {
        result = mid
      }
    }
  }

  if (result !== null) {
    return result
  } else {
    return left
  }
}
