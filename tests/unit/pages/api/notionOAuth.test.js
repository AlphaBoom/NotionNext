/** @jest-environment node */
import axios from 'axios'
import callback from '@/pages/api/auth/callback/notion'
import { getServerSideProps } from '@/pages/auth'

jest.mock('axios', () => ({ post: jest.fn() }))
jest.mock('@/lib/db/SiteDataApi', () => ({
  fetchGlobalAllData: async () => ({ allPages: [] })
}))
jest.mock('@/pages/[prefix]', () => () => null)
const response = () => ({
  setHeader: jest.fn(),
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  redirect: jest.fn()
})

beforeEach(() => {
  process.env.OAUTH_CLIENT_ID = 'test-client'
  process.env.OAUTH_CLIENT_SECRET = 'test-secret'
  process.env.OAUTH_REDIRECT_URI = 'https://example.com/auth'
})
afterEach(() => {
  delete process.env.OAUTH_CLIENT_ID
  delete process.env.OAUTH_CLIENT_SECRET
  delete process.env.OAUTH_REDIRECT_URI
})

test('both callback routes keep credentials out of URLs, page props and logs', async () => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => {})
  axios.post.mockResolvedValue({
    status: 200,
    data: {
      access_token: 'test-access-token',
      owner: { email: 'private@example.com' }
    }
  })
  const res = response()
  await callback({ query: { code: 'test-code' } }, res)
  expect(res.redirect).toHaveBeenCalledWith(
    302,
    expect.stringContaining('/auth/result?')
  )
  const props = await getServerSideProps({ query: { code: 'test-code' }, res })
  const output = JSON.stringify([
    res.redirect.mock.calls,
    props,
    log.mock.calls
  ])
  expect(output).not.toMatch(
    /test-access-token|test-secret|test-code|private@example.com/
  )
  expect(props.props.redirect_query).toEqual({ msg: '授权成功' })
  expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
})

test('Axios failures are logged without their credential-bearing request or response', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  axios.post.mockRejectedValue({
    config: { headers: { Authorization: 'test-secret' } },
    response: { data: { access_token: 'test-access-token' } }
  })
  const res = response()
  await callback({ query: { code: 'test-code' } }, res)
  const props = await getServerSideProps({ query: { code: 'test-code' }, res })
  expect(
    JSON.stringify([log.mock.calls, res.redirect.mock.calls, props])
  ).not.toMatch(/test-secret|test-access-token/)
  expect(log).toHaveBeenCalled()
})
