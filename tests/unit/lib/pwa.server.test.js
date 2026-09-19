/** @jest-environment node */
import fs from 'node:fs'
import BLOG from '@/blog.config'
import { writePwaManifest } from '@/lib/pwa.server'

jest.mock('node:fs', () => ({ writeFileSync: jest.fn() }))
jest.mock('@/blog.config', () => ({ PWA_ENABLE: false }))

beforeEach(() => {
  process.env.BUILD_MODE = 'true'
  BLOG.PWA_ENABLE = false
})

afterEach(() => {
  delete process.env.BUILD_MODE
})

test('runtime requests and disabled PWA never write a manifest', () => {
  process.env.BUILD_MODE = 'false'
  writePwaManifest({ notionConfig: { PWA_ENABLE: true } })
  process.env.BUILD_MODE = 'true'
  for (const PWA_ENABLE of [false, 'false', undefined]) {
    writePwaManifest({ notionConfig: { PWA_ENABLE } })
  }
  BLOG.PWA_ENABLE = true
  writePwaManifest({ notionConfig: { PWA_ENABLE: false } })
  expect(fs.writeFileSync).not.toHaveBeenCalled()
})

test.each([true, 'true', 'yes', 'on', 1])(
  'enabled value %p writes a valid manifest only once per build',
  PWA_ENABLE => {
    jest.isolateModules(() => {
      const { writePwaManifest: write } = require('@/lib/pwa.server')
      const options = {
        siteInfo: { title: 'Test' },
        notionConfig: { PWA_ENABLE }
      }
      write(options)
      write(options)
    })
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1)
    const [path, contents] = fs.writeFileSync.mock.calls[0]
    expect(path).toBe(`${process.cwd()}/public/manifest.json`)
    expect(JSON.parse(contents)).toMatchObject({
      name: 'Test',
      display: 'standalone'
    })
  }
)
