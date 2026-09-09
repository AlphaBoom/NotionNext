import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import SurvivorsLeaderboard from '@/themes/medium/components/SurvivorsLeaderboard'
import {
  loadLeaderboard,
  submitLeaderboardRun
} from '@/themes/medium/lib/survivorsLeaderboard'

jest.mock('@/themes/medium/lib/survivorsLeaderboard', () => ({
  loadLeaderboard: jest.fn(),
  submitLeaderboardRun: jest.fn(),
  savedNickname: () => '',
  formatSurvivalTime: value => String(value)
}))
const entry = {
  ticket: Promise.resolve({}),
  result: { durationMs: 90000, kills: 30, bosses: 1, level: 5 }
}
const row = {
  id: 'one',
  rank: 1,
  nickname: '刺猬',
  durationMs: 90000,
  kills: 30,
  bosses: 1
}
beforeEach(() => {
  loadLeaderboard.mockReset().mockResolvedValue({ entries: [] })
  submitLeaderboardRun.mockReset()
})

test('loads only when expanded, shows empty/error states and can retry', async () => {
  render(<SurvivorsLeaderboard />)
  expect(loadLeaderboard).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /无限模式排行榜/ }))
  expect(await screen.findByText(/还没有成绩/)).toBeTruthy()
  loadLeaderboard.mockRejectedValueOnce(new Error('网络中断'))
  fireEvent.click(screen.getByRole('button', { name: '刷新排行' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('网络中断')
  fireEvent.click(screen.getByRole('button', { name: '刷新排行' }))
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
})

test('submission is explicit; retries preserve the result; duplicate clicks are ignored', async () => {
  render(<SurvivorsLeaderboard entry={entry} finished />)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '刺猬' } })
  submitLeaderboardRun.mockRejectedValueOnce(new Error('请重试'))
  fireEvent.click(screen.getByRole('button', { name: '上传成绩' }))
  expect(await screen.findByText('请重试')).toBeTruthy()
  let resolve
  submitLeaderboardRun.mockReturnValueOnce(
    new Promise(done => {
      resolve = done
    })
  )
  fireEvent.click(screen.getByRole('button', { name: '上传成绩' }))
  fireEvent.submit(screen.getByRole('textbox').closest('form'))
  expect(submitLeaderboardRun).toHaveBeenCalledTimes(2)
  await act(async () =>
    resolve({ personalBest: true, best: row, entries: [row] })
  )
  expect(screen.getByRole('button', { name: '已上传' })).toBeDisabled()
  expect(screen.getByText(/当前第 1 名/)).toBeTruthy()
  expect(screen.getByRole('cell', { name: '刺猬' })).toBeTruthy()
  expect(submitLeaderboardRun).toHaveBeenLastCalledWith(entry, '刺猬')
})

test('an older GET cannot overwrite standings returned by a successful upload', async () => {
  let resolveLoad
  loadLeaderboard.mockReturnValueOnce(
    new Promise(done => {
      resolveLoad = done
    })
  )
  submitLeaderboardRun.mockResolvedValueOnce({
    personalBest: true,
    best: row,
    entries: [row]
  })
  render(<SurvivorsLeaderboard entry={entry} finished />)
  fireEvent.click(screen.getByRole('button', { name: /无限模式排行榜/ }))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '刺猬' } })
  fireEvent.click(screen.getByRole('button', { name: '上传成绩' }))
  await screen.findByRole('button', { name: '已上传' })
  await act(async () => resolveLoad({ entries: [] }))
  expect(screen.getByRole('cell', { name: '刺猬' })).toBeTruthy()
})
