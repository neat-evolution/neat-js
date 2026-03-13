import { method as defaultMethod, demo, Methods } from './demo.js'

function parseMethodArg(argv: string[]): Methods {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--method' && argv[i + 1]) {
      const raw = argv[i + 1] as Methods
      if (Object.values(Methods).includes(raw)) return raw
      console.warn(
        `Unsupported method "${raw}", falling back to ${defaultMethod}`
      )
      return defaultMethod
    }
  }
  return defaultMethod
}

const selectedMethod = parseMethodArg(process.argv.slice(2))

try {
  await demo({
    method: selectedMethod,
    workerConfig: {
      createEnvironmentPathname: '@neat-evolution/dataset-environment',
      pluginPaths: ['@neat-evolution/worker-rl/workerPlugin'],
    },
  })
} catch (e) {
  console.error(e)
}
