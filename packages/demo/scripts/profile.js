import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const distDir = join(rootDir, 'dist/esm')
const demoJs = join(distDir, 'demo.js')

async function ensureBuild() {
  if (!existsSync(demoJs)) {
    console.log('Build missing, running build...')
    await execa('yarn', ['build'], { cwd: rootDir, stdio: 'inherit' })
  }
}

async function runProfile() {
  await ensureBuild()

  // Import from dist
  const { createEvaluator } = await import('@neat-evolution/evaluator')
  const { createReproducer } = await import('@neat-evolution/evolution')
  const { createExecutor } = await import('@neat-evolution/executor')
  const { demo } = await import('../dist/esm/demo.js')

  try {
    console.log('Starting profiling demo...')
    const best = await demo(createReproducer, createEvaluator, createExecutor, {
      evolutionOptions: {
        iterations: 2,
        secondsLimit: 5,
      },
    })
    console.log('Best fitness:', best.fitness)
  } catch (e) {
    console.error('Error running demo:', e)
    process.exit(1)
  }
}

runProfile()
