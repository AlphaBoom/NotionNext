/** @jest-environment node */
import { execSync } from 'child_process'
import { main } from '@/scripts/health-check'

jest.mock('child_process', () => ({ execSync: jest.fn() }))
jest.mock('fs', () => ({ existsSync: () => true, writeFileSync: jest.fn() }))

test.each(['npm run build', 'npm test'])(
  'a failed %s cannot be hidden by passing file checks',
  async command => {
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})
    execSync.mockImplementation(cmd => {
      if (cmd.startsWith(command)) throw Error('check failed')
      return ''
    })
    await main()
    expect(exit).toHaveBeenCalledWith(1)
  }
)
