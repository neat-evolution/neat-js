import os from 'node:os'

export const hardwareConcurrency = os.cpus().length
