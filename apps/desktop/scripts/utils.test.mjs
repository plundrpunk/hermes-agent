import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { test } from 'vitest'

test.skipIf(process.platform === 'win32')('main detection follows a symlink entry without running imported scripts', () => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'script-main-')))
  try {
    const script = path.join(root, 'main.mjs')
    const alias = path.join(root, 'alias.mjs')
    const helper = new URL('./utils.mjs', import.meta.url).href
    fs.writeFileSync(script, `import { isMain } from ${JSON.stringify(helper)}; console.log(isMain(import.meta.url))`)
    fs.symlinkSync(script, alias)
    for (const entry of [script, alias]) {
      const result = spawnSync(process.execPath, [entry], { encoding: 'utf8' })
      assert.equal(result.status, 0, result.stderr)
      assert.equal(result.stdout.trim(), 'true')
    }
    const imported = spawnSync(process.execPath, ['--input-type=module', '-e', `import ${JSON.stringify(pathToFileURL(script).href)}`], { encoding: 'utf8' })
    assert.equal(imported.status, 0, imported.stderr)
    assert.equal(imported.stdout.trim(), 'false')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
