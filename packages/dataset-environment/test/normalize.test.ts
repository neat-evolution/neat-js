import { describe, expect, test } from 'vitest'

import { normalize } from '../src/index.js'

import { readJSONLines } from './fixtures/readJSONLines.js'

describe('normalize', () => {
  test('should normalize all fixtures', async () => {
    for await (const { input, output } of readJSONLines(
      'normalize_log.jsonl'
    )) {
      const result = normalize(input)
      expect(result).toEqual(output)
    }
  })
})
