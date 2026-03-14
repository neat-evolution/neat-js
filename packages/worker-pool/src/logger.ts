import { createLogger, muteChannel } from '@neat-evolution/logger'

muteChannel('neat:worker:verbose')

export const logger = createLogger('neat:worker:verbose')
