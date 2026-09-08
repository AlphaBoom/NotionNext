import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getWritingModeInfo,
  getWritingModeSummary,
  normalizeWritingMode,
  prependWritingModeNotice
} from '../lib/utils/writingMode.mjs'

test('legacy articles and blank Notion selects retain their original output', () => {
  for (const writingMode of [undefined, null, '', ' ', [], ['']]) {
    assert.equal(normalizeWritingMode(writingMode), '')
    assert.equal(getWritingModeInfo(writingMode), null)
    assert.equal(getWritingModeSummary({ summary: '原摘要', writingMode }), '原摘要')
    assert.equal(prependWritingModeNotice('<p>原正文</p>', writingMode), '<p>原正文</p>')
  }
})

test('Notion selects and cached values give the same distinct disclosures', () => {
  for (const [label, mode, description] of [
    ['AI 润色', 'ai-polished', '本文由我撰写初稿，使用 AI 辅助润色措辞和语句，保留原有观点和主要内容。'],
    ['AI 生成', 'ai-generated', '本文由我提供大纲和写作思路，使用 AI 辅助生成正文。']
  ]) {
    for (const value of [label, [label], ` ${label} `, mode]) {
      assert.deepEqual(getWritingModeInfo(value), { mode, label, description })
    }
  }
})

test('unexpected property values cannot inject markup or render object properties', () => {
  for (const value of ['<script>alert(1)</script>', 'constructor', '__proto__', {}, 1, ['unknown']]) {
    assert.equal(getWritingModeInfo(value), null)
    assert.equal(prependWritingModeNotice('<p>内容</p>', value), '<p>内容</p>')
  }
})

test('feed readers see authorship before summary or full content without changing the post', () => {
  const post = Object.freeze({ title: '原标题', summary: '原摘要', writingMode: ['AI 生成'] })
  assert.equal(getWritingModeSummary(post), '[AI 生成] 本文由我提供大纲和写作思路，使用 AI 辅助生成正文。 原摘要')
  assert.equal(prependWritingModeNotice('<h2>正文</h2>', post.writingMode), '<p>本文由我提供大纲和写作思路，使用 AI 辅助生成正文。</p><h2>正文</h2>')
  assert.equal(post.title, '原标题')
  assert.equal(post.summary, '原摘要')
})

test('empty summaries and unavailable full content still disclose AI involvement', () => {
  assert.equal(getWritingModeSummary({ writingMode: 'ai-polished' }), '[AI 润色] 本文由我撰写初稿，使用 AI 辅助润色措辞和语句，保留原有观点和主要内容。')
  assert.equal(prependWritingModeNotice(undefined, 'ai-generated'), '<p>本文由我提供大纲和写作思路，使用 AI 辅助生成正文。</p>')
})
