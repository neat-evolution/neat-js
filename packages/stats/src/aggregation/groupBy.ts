export const groupBy = <T>(
  items: T[],
  keyFn: (item: T) => string
): Map<string, T[]> => {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = keyFn(item)
    let group = groups.get(key)
    if (group == null) {
      group = []
      groups.set(key, group)
    }
    group.push(item)
  }
  return groups
}
