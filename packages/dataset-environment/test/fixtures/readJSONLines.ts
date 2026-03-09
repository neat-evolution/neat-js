import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

export async function* readJSONLines(
  filePath: string
): AsyncGenerator<Record<string, unknown>> {
  const stream = createReadStream(
    new URL(`./${filePath}`, import.meta.url).pathname
  )
  const rl = createInterface({
    input: stream,
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    yield JSON.parse(line) as Record<string, unknown>
  }

  stream.close()
}

export async function* readTypedJSONLines<T>(
  filePath: string
): AsyncGenerator<T> {
  for await (const record of readJSONLines(filePath)) {
    yield record as T
  }
}
