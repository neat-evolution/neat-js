import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

export async function* readJSONLines(
  filePath: string
): AsyncGenerator<Record<string, any>> {
  const stream = createReadStream(
    new URL(`./${filePath}`, import.meta.url).pathname
  )
  const rl = createInterface({
    input: stream,
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    yield JSON.parse(line)
  }

  stream.close()
}
