export const mean = (values: number[]): number => {
  if (values.length === 0) return 0
  let sum = 0
  for (const v of values) {
    sum += v
  }
  return sum / values.length
}
