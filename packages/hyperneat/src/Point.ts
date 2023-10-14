export type Point = [x: number, y: number]

/** `${x},${y}` */
export type PointKey = string

export const toPointKey = ([x, y]: Point): PointKey => `${x},${y}`

export const fromPointKey = (key: string): Point => {
  const commaIndex = key.indexOf(',')
  return [
    parseInt(key.substring(0, commaIndex), 10),
    parseInt(key.substring(commaIndex + 1), 10),
  ]
}
