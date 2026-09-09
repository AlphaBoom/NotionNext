# 排行榜部署接续（2026-09-09）

任务：为 `AlphaBoom/NotionNext` 的电脑端棘夜无限模式上线免费排行榜。分支 `codex/quill-leaderboard-free`，PR #20。使用 Cloudflare Workers + D1；本次没有升级套餐。

## 已部署

- Worker：`quill-leaderboard`，URL `https://quill-leaderboard.rsshinide38.workers.dev`。
- D1：`quill-leaderboard`，绑定名 `DB`。已通过 Cloudflare MCP API 执行 `migrations/0001_leaderboard.sql`，表和索引均创建成功；不是通过 Wrangler 迁移记账执行，SQL 本身可重复运行。
- `SEASON=endless-v1`；`RATE_LIMIT_SALT` 已设置为 Cloudflare Secret，未写入 Git、前端或聊天。
- 每日清理 Cron：`17 3 * * *`（UTC）。清理过期局与限流桶，保留最佳成绩。
- 来源白名单：`https://notion.alphaboom.cn` 和下述 PR 固定预览域名，精确匹配；临时本地验证来源在验收后移除。
- Vercel：`alphabooms-projects/notion-next` 的 **Production + Preview** 均配置了 `NEXT_PUBLIC_QUILL_LEADERBOARD_URL`（上述 Worker URL）和 `NEXT_PUBLIC_QUILL_LEADERBOARD_SEASON=endless-v1`。
- PR 固定预览：<https://notion-next-git-codex-quill-leaderbo-8f5d97-alphabooms-projects.vercel.app>。
- 实际部署配置已留在本地忽略文件 `cloudflare/quill-leaderboard/wrangler.toml`，不含密钥。

## 接续修复

- 客户端测试改名为 `survivorsLeaderboardClient.test.js`，避免和组件测试 `SurvivorsLeaderboard.test.js` 仅大小写不同。原 Vercel 构建因此编译失败。
- Jest 全局清理先卸载 React，再清空文档，避免 styled-jsx 清理已移除的样式节点。
- 排行榜读取请求使用 `cache: 'no-store'`，避免上传后点击刷新时恢复浏览器缓存的旧榜单。该问题由真实浏览器连接线上 D1 的组件测试复现。

## 验证

- 仓库锁文件安装完成，Node 24；完整本地 Next.js 15.5.23 构建通过。Vercel 使用 Node 24，项目旧 Node 18 设置被仓库 engines 覆盖，不是本次失败原因。
- Worker / SQLite：7 个测试通过。
- 标准仓库 Jest 环境：排行榜客户端、组件、游戏生命周期及既有退出行为，4 组共 17 个测试通过。
- 全量 Jest：76 组通过，`Catalog.test.js` 因 `notion-utils` ESM 加载失败；使用修改前的 `jest.setup.js` 也复现同一错误，属于既有问题。
- 线上接口：精确 CORS、拒绝非白名单来源、赛季不匹配、开局、非法凭证/时间拒绝、上传、幂等重试、最佳成绩保留、榜单读取均通过。
- 真实前端客户端连接线上 Worker/D1：响应丢失后重试、昵称保存、较低成绩不覆盖、预览来源白名单均通过。
- 浏览器已打开 Vercel 博客预览，确认手机跑酷和首次 60 秒关卡不显示排行榜。完整真实游戏的死亡上传尚未人工通关验收：本次内置浏览器的 Canvas 帧推进严重受限。游戏死亡接入由生命周期测试覆盖，排行榜表单单独使用真实组件和线上接口进行浏览器验证：空榜单、创建局、填写昵称、响应丢失提示、重试成功、上传按钮禁用、立即刷新保持唯一成绩均通过。
- 所有本次创建的测试成绩和局记录在验收后删除；限流桶按 TTL 自动清理。

## 上线步骤

按原约定保留 PR 供用户合并，不直接合并到 main。生产环境变量已准备好；用户合并 PR #20 后，Vercel 的 main 自动部署才会把排行榜 UI 发布到 `https://notion.alphaboom.cn`。合并后检查生产构建 Ready，并在已解锁的电脑浏览器正常挑战、死亡、填写昵称上传一次。

另一游戏优化 PR 可能修改 `SecretSurvivors.js` / `survivors.js`；合并时保留排行榜开局、结算与输入框键盘处理逻辑。若难度或统计规则改变，遵循 README 换季与服务端上界检查约定。首次 60 秒解锁关卡和手机跑酷不参加此榜。
