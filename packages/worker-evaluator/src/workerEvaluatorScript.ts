import { handleEvaluateGenome } from './worker/handleEvaluateGenome.js'
import { handleInitEvaluator } from './worker/handleInitEvaluator.js'
import { handleInitGenomeFactory } from './worker/handleInitGenomeFactory.js'
import { startWorker } from './worker/startWorker.js'

startWorker({
  handleInitEvaluator,
  handleInitGenomeFactory,
  handleEvaluateGenome,
})
