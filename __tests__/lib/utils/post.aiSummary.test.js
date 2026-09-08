/** @jest-environment node */

import { processPostData } from '@/lib/utils/post'
import { siteConfig } from '@/lib/config'

jest.mock('@/blog.config', () => ({ __esModule: true, default: {} }))
jest.mock('@/lib/config', () => ({ siteConfig: jest.fn() }))
jest.mock('@/lib/utils', () => ({ isHttpLink: () => false }))
jest.mock('@/lib/plugins/algolia', () => ({ uploadDataToAlgolia: jest.fn() }))
jest.mock('@/lib/db/notion/getPageContentText', () => ({ getPageContentText: () => '正文' }))
jest.mock('@/lib/db/notion/getPageTableOfContents', () => ({ getPageTableOfContents: () => [] }))
jest.mock('@/lib/plugins/wordCount', () => ({ countWords: () => ({ wordCount: 2, readTime: 1 }) }))
jest.mock('@/lib/utils/originalityProof', () => ({
  applyOriginalityProofRecord: () => null,
  createOriginalityProof: () => null,
  isOriginalityProofEnabled: () => false
}))
jest.mock('@/lib/utils/originalityProofManifest', () => ({
  isOriginalityProofAutoManifestEnabled: () => false,
  findOriginalityProofManifestRecord: () => null,
  recordOriginalityProofManifest: jest.fn()
}))

it('preserves only the supplied summary even if a legacy AI endpoint is configured', async () => {
  siteConfig.mockImplementation((key, fallback) => key === 'AI_SUMMARY_API' ? 'https://ai.example/generate' : fallback)
  for (const aiSummary of [undefined, '', '我选择展示的摘要']) {
    const props = { post: { id: 'post-id', aiSummary, blockMap: { block: {} } }, allPages: [] }
    await processPostData(props, 'test')
    expect(props.post.aiSummary).toBe(aiSummary)
    expect(props.post.wordCount).toBe(2)
  }
  expect(siteConfig.mock.calls.some(([key]) => key.startsWith('AI_SUMMARY_'))).toBe(false)
})
