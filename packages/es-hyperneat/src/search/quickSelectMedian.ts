export const quickSelectMedian = (arr: number[]): number => {
  const len = arr.length
  const k = Math.floor(len / 2)
  return quickSelect(arr, k, 0, len - 1)
}

export const quickSelect = (
  arr: number[],
  k: number,
  left: number,
  right: number
): number => {
  if (left === right) {
    return arr[left] as number
  }
  const pivotIndex = partition(arr, left, right)
  if (k === pivotIndex) {
    return arr[k] as number
  } else if (k < pivotIndex) {
    return quickSelect(arr, k, left, pivotIndex - 1)
  } else {
    return quickSelect(arr, k, pivotIndex + 1, right)
  }
}

export const partition = (
  arr: number[],
  left: number,
  right: number
): number => {
  const pivotValue = arr[right] as number
  let storeIndex = left
  for (let i = left; i < right; i++) {
    if ((arr[i] as number) < pivotValue) {
      ;[arr[storeIndex], arr[i]] = [arr[i], arr[storeIndex]] as [number, number]
      storeIndex++
    }
  }
  ;[arr[right], arr[storeIndex]] = [arr[storeIndex], arr[right]] as [
    number,
    number,
  ]
  return storeIndex
}
