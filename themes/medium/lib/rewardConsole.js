// A deliberate developer shortcut. It grants the same local cosmetic reward as a win.
export function installRewardConsole(target, unlock) {
  const command = async () => {
    const enabled = await unlock()
    return enabled
      ? 'NEW GAME! 主题已开启；使用页面底部的“恢复原主题”退出。'
      : '主题切换已取消，请重试。'
  }
  const installed = []
  for (const name of ['NewGame', 'New Game！', 'New Game!']) {
    const previous = Object.getOwnPropertyDescriptor(target, name)
    if (previous && !previous.configurable) continue
    Object.defineProperty(target, name, { configurable: true, value: command })
    installed.push({ name, previous })
  }
  return () => {
    for (const { name, previous } of installed) {
      if (Object.getOwnPropertyDescriptor(target, name)?.value !== command)
        continue
      if (previous) Object.defineProperty(target, name, previous)
      else delete target[name]
    }
  }
}
