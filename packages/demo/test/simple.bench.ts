import { bench, describe } from 'vitest'

describe('simple benchmark', () => {
  bench('math', () => {
    Math.sqrt(100)
  })
})
