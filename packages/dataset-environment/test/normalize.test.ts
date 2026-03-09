import { describe, expect, test } from 'vitest'

import type { Vector } from '../src/index.js'
import { normalize } from '../src/index.js'

import { readTypedJSONLines } from './fixtures/readJSONLines.js'

interface NormalizeFixture {
  input: Vector
  output: Vector
}

describe('normalize', () => {
  test('should normalize all fixtures', async () => {
    for await (const { input, output } of readTypedJSONLines<NormalizeFixture>(
      'normalize_log.jsonl'
    )) {
      const result = normalize(input)
      expect(result).toEqual(output)
    }
  })
})
