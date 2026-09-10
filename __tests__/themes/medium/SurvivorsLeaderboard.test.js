import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import SurvivorsLeaderboard from '@/themes/medium/components/SurvivorsLeaderboard'
import SurvivorsResult from '@/themes/medium/components/SurvivorsResult'
import { useSurvivorsLeaderboard } from '@/themes/medium/lib/useSurvivorsLeaderboard'
import {
  loadLeaderboard,
  submitLeaderboardRun
} from '@/themes/medium/lib/survivorsLeaderboard'

jest.mock('@/themes/medium/lib/survivorsLeaderboard', () => ({
  ...jest.requireActual('@/themes/medium/lib/survivorsLeaderboard'),
  loadLeaderboard: jest.fn(),
  submitLeaderboardRun: jest.fn(),
  savedNickname: () => ''
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
function Harness({
  entry,
  finished = false,
  active = false,
  onRestart = () => {}
}) {
  const board = useSurvivorsLeaderboard({ entry, finished, active })
  return (
    <>
      {finished && (
        <SurvivorsResult
          result={entry.result}
          board={board}
          onRestart={onRestart}
          onClose={() => {}}
          onDetails={() => {}}
        />
      )}
      <SurvivorsLeaderboard board={board} />
    </>
  )
}
beforeEach(() => {
  loadLeaderboard.mockReset().mockResolvedValue({ entries: [] })
  submitLeaderboardRun.mockReset()
})

test('loads when opened; empty and error states allow retry', async () => {
  const { rerender } = render(<Harness />)
  expect(loadLeaderboard).not.toHaveBeenCalled()
  rerender(<Harness active />)
  await waitFor(() => expect(loadLeaderboard).toHaveBeenCalledTimes(1))
  expect(await screen.findByText(/第一段夜行/)).toBeTruthy()
  loadLeaderboard.mockRejectedValueOnce(new Error('网络中断'))
  fireEvent.click(screen.getByRole('button', { name: /刷新排行/ }))
  expect(await screen.findByRole('alert')).toHaveTextContent('网络中断')
  fireEvent.click(screen.getByRole('button', { name: /刷新排行/ }))
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
})

test('death previews a rank automatically but publication requires explicit submission; retries are idempotent', async () => {
  render(<Harness entry={entry} finished />)
  expect(await screen.findByText('#01')).toBeTruthy()
  expect(screen.getByText('本局预计排名')).toBeTruthy()
  expect(submitLeaderboardRun).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '刺猬' } })
  submitLeaderboardRun.mockRejectedValueOnce(new Error('请重试'))
  fireEvent.click(screen.getByRole('button', { name: /上传成绩/ }))
  expect(await screen.findByText('请重试')).toBeTruthy()
  let resolve
  submitLeaderboardRun.mockReturnValueOnce(
    new Promise(done => {
      resolve = done
    })
  )
  fireEvent.click(screen.getByRole('button', { name: /上传成绩/ }))
  fireEvent.submit(screen.getByRole('textbox').closest('form'))
  expect(submitLeaderboardRun).toHaveBeenCalledTimes(2)
  await act(async () =>
    resolve({ personalBest: true, best: row, entries: [row] })
  )
  expect(screen.getByRole('button', { name: /已上传/ })).toBeDisabled()
  expect(screen.getByText('当前排名')).toBeTruthy()
  expect(screen.getByRole('cell', { name: /刺猬/ })).toBeTruthy()
  expect(submitLeaderboardRun).toHaveBeenLastCalledWith(entry, '刺猬')
})

test('an older estimate GET cannot overwrite standings returned by upload', async () => {
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
  render(<Harness entry={entry} finished />)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '刺猬' } })
  fireEvent.click(screen.getByRole('button', { name: /上传成绩/ }))
  await screen.findByRole('button', { name: /已上传/ })
  await act(async () => resolveLoad({ entries: [] }))
  expect(screen.getByRole('cell', { name: /刺猬/ })).toBeTruthy()
  expect(screen.getByText('#01')).toBeTruthy()
})

test('viewing details and closing preserves the submitted result and labels a retained older best', async () => {
  loadLeaderboard.mockResolvedValue({ entries: [row] })
  submitLeaderboardRun.mockResolvedValue({
    personalBest: false,
    best: row,
    entries: [row]
  })
  const { rerender } = render(<Harness entry={entry} finished />)
  await screen.findByText('#02')
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '刺猬' } })
  fireEvent.click(screen.getByRole('button', { name: /上传成绩/ }))
  await screen.findByRole('button', { name: /已上传/ })
  rerender(<Harness entry={entry} finished active />)
  await waitFor(() => expect(loadLeaderboard).toHaveBeenCalledTimes(2))
  rerender(<Harness entry={entry} finished active={false} />)
  expect(screen.getByText('最佳纪录排名')).toBeTruthy()
  expect(screen.getByText('#01')).toBeTruthy()
  expect(screen.getByRole('button', { name: /已上传/ })).toBeDisabled()
  expect(submitLeaderboardRun).toHaveBeenCalledTimes(1)
})

test('rank read failure does not claim a position or prevent declining publication', async () => {
  loadLeaderboard.mockRejectedValue(new Error('连接失败'))
  const restart = jest.fn()
  render(<Harness entry={entry} finished onRestart={restart} />)
  expect(await screen.findByText('暂时无法读取排名')).toBeTruthy()
  expect(screen.queryByText('#01')).toBeNull()
  expect(screen.getByRole('button', { name: /上传成绩/ })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: '不上传，再来一局' }))
  expect(restart).toHaveBeenCalledTimes(1)
  expect(submitLeaderboardRun).not.toHaveBeenCalled()
})
