import { promises as fs } from 'node:fs'

/**
 * Asynchronously reads the 'iris.data' file and writes processed content to 'generated/iris'.
 */
async function processIrisData() {
  const outputPath = new URL('../generated/iris', import.meta.url).pathname

  try {
    await fs.access(outputPath)
    console.log('Output file already exists. Exiting.')
    return
  } catch {
    // The file does not exist, and the error is expected in this case
  }

  // Read lines from iris.data
  const lines = (
    await fs.readFile(new URL('./iris.data', import.meta.url).pathname, 'utf8')
  ).split('\n')

  // Process and write to generated/iris
  let output = 'true\ntrue\n\n'

  // Process the features
  for (const line of lines) {
    if (!line) continue // Skip empty lines
    const parts = line.trim().split(',')
    output += parts.slice(0, -1).join(', ') + '\n'
  }

  output += '\n'

  // Process the labels
  for (const line of lines) {
    if (!line) continue // Skip empty lines
    const parts = line.trim().split(',')
    const label = parts[parts.length - 1][8] // Get the first character of the species name
    console.log({ parts, label })
    const mapping = { o: '0, 0, 1', s: '0, 1, 0', g: '1, 0, 0' }
    output += mapping[label] + '\n'
  }

  // Ensure the 'generated' directory exists
  await fs.mkdir(new URL('../generated', import.meta.url).pathname, {
    recursive: true,
  })
  // Write to file in the 'generated' directory
  await fs.writeFile(outputPath, output, 'utf8')

  console.log('Generated iris data.')
}

// Call the function to process the data
processIrisData().catch((error) => {
  console.error(error)
  process.exit(1)
})
