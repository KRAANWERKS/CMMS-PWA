import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

// Vite transpiles TypeScript without checking undeclared names. In production
// that turned a missing useI18n import in WorkOrderCard into a blank My Work page.
// Check every TSX/TS source file before creating a deployable PWA bundle.
const root = fileURLToPath(new URL('../src/', import.meta.url))

function listSources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name)
    if (entry.isDirectory()) return listSources(file)
    return /\.tsx?$/.test(entry.name) ? [file] : []
  })
}

test('every PWA component using useI18n imports it explicitly', () => {
  const missing = []
  for (const file of listSources(root)) {
    if (file.endsWith('i18n.tsx')) continue // the hook is defined here
    const code = readFileSync(file, 'utf8')
    if (!/\buseI18n\s*\(/.test(code)) continue
    if (!/import\s*\{\s*useI18n\s*\}\s*from\s*['"][^'"]+['"]/.test(code)) {
      missing.push(file.slice(root.length))
    }
  }
  assert.deepEqual(missing, [], 'useI18n must be imported in: ' + missing.join(', '))
})
