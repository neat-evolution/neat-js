import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultProfilePath = join(__dirname, '../profile.json')

const profilePath = process.argv[2] || defaultProfilePath

try {
  console.log(`Analyzing profile: ${profilePath}`)
  const profile = JSON.parse(readFileSync(profilePath, 'utf8'))
  const ticks = profile.ticks || []
  const code = profile.code || []

  const stats = {}

  ticks.forEach((tick) => {
    const s = tick.s || []
    s.forEach((codeIndex, depth) => {
      const entry = code[codeIndex]
      if (entry) {
        const name = entry.name
        if (!stats[name]) stats[name] = { total: 0, self: 0 }
        stats[name].total++
        if (depth === 0) stats[name].self++
      }
    })
  })

  const sorted = Object.entries(stats)
    .sort((a, b) => b[1].self - a[1].self)
    .slice(0, 20)

  console.log('Top 20 Functions by Self Time:')
  console.table(
    sorted.map(([name, data]) => ({
      Function: name.length > 100 ? name.substring(0, 97) + '...' : name,
      'Self Ticks': data.self,
      'Total Ticks': data.total,
    }))
  )
} catch (e) {
  console.error('Error analyzing profile:', e)
}
