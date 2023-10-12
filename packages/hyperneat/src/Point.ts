export type Point = [x: number, y: number]

/** `${x},${y}` */
export type PointKey = string

export const toPointKey = (point: Point): PointKey => `${point[0]},${point[1]}`

export const fromPointKey = (key: PointKey): Point => {
  const coords = key.split(',') as [x: string, y: string]
  return [+coords[0], +coords[1]]
}
