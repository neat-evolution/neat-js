import { describe, expect, test } from 'vitest'

import { crossentropy, crossentropySingle } from '../src/index.js'

import { readJSONLines } from './fixtures/readJSONLines.js'

describe('crossentropy', () => {
  test('should crossentropySingle all fixtures', async () => {
    for await (const { target, prediction, norm, output } of readJSONLines(
      'crossentropy_single_log.jsonl'
    )) {
      const result = crossentropySingle(target, prediction, norm)
      expect(result).toBeCloseTo(output, 6)
    }
  })
  test('should crossentropy all fixtures', async () => {
    for await (const { targets, predictions, norm, output } of readJSONLines(
      'crossentropy_log.jsonl'
    )) {
      const result = crossentropy(targets, predictions, norm)
      expect(result).toBeCloseTo(output, 10)
    }
  })
})
