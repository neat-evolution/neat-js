import { describe, expect, test } from 'vitest'

import type { Matrix, Vector } from '../src/index.js'
import { crossentropy, crossentropySingle } from '../src/index.js'

import { readTypedJSONLines } from './fixtures/readJSONLines.js'

interface CrossentropySingleFixture {
  target: Vector
  prediction: Vector
  norm: boolean
  output: number
}

interface CrossentropyFixture {
  targets: Matrix
  predictions: Matrix
  norm: boolean
  output: number
}

describe('crossentropy', () => {
  test('should crossentropySingle all fixtures', async () => {
    for await (const {
      target,
      prediction,
      norm,
      output,
    } of readTypedJSONLines<CrossentropySingleFixture>(
      'crossentropy_single_log.jsonl'
    )) {
      const result = crossentropySingle(target, prediction, norm)
      // FIXME: why is this 6?
      expect(result).toBeCloseTo(output, 6)
    }
  })
  test('should crossentropy all fixtures', async () => {
    for await (const {
      targets,
      predictions,
      norm,
      output,
    } of readTypedJSONLines<CrossentropyFixture>('crossentropy_log.jsonl')) {
      const result = crossentropy(targets, predictions, norm)
      expect(result).toBeCloseTo(output, 15)
    }
  })
})
