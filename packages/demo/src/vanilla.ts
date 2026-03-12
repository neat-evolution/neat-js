import { demo } from './demo.js'

try {
  await demo()
} catch (error) {
  console.error(error)
  throw error
}
