import { createLogger, muteChannel } from '@neat-evolution/logger'

export const createWorkerLogger = (component: string) =>
  createLogger(`neat:worker:${component}`)

muteChannel('neat:worker:verbose')

export const verboseLogger = createLogger('neat:worker:verbose')
