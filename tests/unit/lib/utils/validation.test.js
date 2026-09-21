import { Validator, Sanitizer, RateLimiter } from '@/lib/utils/validation'

// Representative valid/invalid inputs and boundaries; avoid separate tests for
// cosmetic variations that exercise the same branch.
test.each([
  [
    'isValidEmail',
    ['user+tag@example.org'],
    ['user..name@example.com', 'user@', '']
  ],
  [
    'isValidUrl',
    ['https://example.com/path?q=1', 'http://localhost:3000'],
    ['javascript:alert(1)', 'ftp://example.com', 'not-a-url']
  ],
  ['isValidSlug', ['hello-world-123'], ['Hello World', 'test_post', '']],
  [
    'isValidNotionId',
    [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567e89b12d3a456426614174000'
    ],
    ['123-456', '']
  ]
])(
  '%s distinguishes valid inputs and rejects missing values',
  (method, valid, invalid) => {
    for (const value of valid) expect(Validator[method](value)).toBe(true)
    for (const value of [...invalid, null, undefined])
      expect(Validator[method](value)).toBe(false)
  }
)

test('length and numeric ranges include their boundaries', () => {
  expect(Validator.isValidLength('', 0, 5)).toBe(true)
  expect(Validator.isValidLength('test', 4, 4)).toBe(true)
  expect(Validator.isValidLength('test', 5, 10)).toBe(false)
  expect(Validator.isValidLength('test', 0, 3)).toBe(false)
  expect(Validator.isValidNumber(0, 0, 0)).toBe(true)
  expect(Validator.isValidNumber(-5, -10, 0)).toBe(true)
  for (const value of [-1, 11, NaN])
    expect(Validator.isValidNumber(value, 0, 10)).toBe(false)
})

test('text sanitizers retain text and handle HTML, unsafe patterns and filenames', () => {
  expect(Sanitizer.stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world')
  for (const value of [null, undefined, ''])
    expect(Sanitizer.stripHtml(value)).toBe('')
  for (const value of [
    '<script>alert(1)</script>',
    '<iframe src="evil.com"></iframe>',
    'javascript:alert(1)'
  ])
    expect(Sanitizer.sanitizeXss(value)).toBe('')
  expect(Sanitizer.sanitizeXss('Hello world')).toBe('Hello world')
  expect(Sanitizer.sanitizeFilename('...my <file>|?.txt...')).toBe(
    'my_file.txt'
  )
  expect(Sanitizer.escapeHtml('<script>"Tom & Jerry"')).toBe(
    '&lt;script&gt;&quot;Tom &amp; Jerry&quot;'
  )
})

test('rate limiting enforces the boundary per user and expires the window', () => {
  jest.useFakeTimers()
  try {
    const limiter = new RateLimiter()
    for (let i = 0; i < 5; i++)
      expect(limiter.isRateLimited('reader', 5, 60000)).toBe(false)
    expect(limiter.isRateLimited('reader', 5, 60000)).toBe(true)
    expect(limiter.isRateLimited('other-reader', 5, 60000)).toBe(false)
    jest.advanceTimersByTime(61000)
    expect(limiter.isRateLimited('reader', 5, 60000)).toBe(false)
  } finally {
    jest.useRealTimers()
  }
})
