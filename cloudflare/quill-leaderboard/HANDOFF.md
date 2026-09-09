# Codex App 接续

任务：为 `AlphaBoom/NotionNext` 的电脑端棘夜无限模式上线免费排行榜。用户访问量低，选择 Cloudflare **Workers Free + D1**，不要升级付费套餐。

## 已实现

- `worker.mjs`：开局凭证、成绩上传、Top 20、每浏览器最佳纪录、IP 哈希限流、基础成绩检查和每日清理。
- `migrations/0001_leaderboard.sql`：数据库表及索引。
- `themes/medium/lib/survivorsLeaderboard.js` 和 `SurvivorsLeaderboard.js`：免登录昵称上传、失败重试和榜单展示。
- `SecretSurvivors.js`：少量生命周期接入，游戏引擎未改动。
- 测试和完整部署步骤见本目录 README。

已验证：Worker / SQLite 7 个测试通过；前端客户端、展示、游戏生命周期和既有退出行为共 17 个测试通过；变更文件通过 Prettier 检查与 `git diff --check`。前端测试使用独立 Jest/Babel 测试环境（React 18.3.1、Jest 29.7），完整仓库依赖安装缓慢，尚未完成 Next.js 全量构建；请在 App 中补跑标准仓库构建 / CI。云端接口与浏览器端到端验证需部署后进行。

## 待接续

1. 阅读关联 PR 的验证结果并检查最新分支状态。另一项游戏优化工作可能修改 `SecretSurvivors.js` / `survivors.js`；合并时保留排行榜开局、结算和输入框键盘处理逻辑。
2. 检查 Codex App 中用户已连接的 Cloudflare 插件。之前的云端会话没有暴露 Cloudflare 操作工具，**尚未创建任何数据库、Worker、密钥或云端测试成绩**。不要假定资源已存在，也不要把新建资源与账号其他 Worker 混用。
3. 确认账号，创建免费 D1 `quill-leaderboard`，执行迁移，部署 Worker，设置 `RATE_LIMIT_SALT` 与来源白名单。仓库 README 中博客地址是 `https://notion.alphaboom.cn`；部署前核对实际生产 Origin。
4. 将 Worker URL 配置到博客构建环境的 `NEXT_PUBLIC_QUILL_LEADERBOARD_URL`；前后端 season 保持一致（默认 `endless-v1`）。密钥只进 Cloudflare Secrets，不进 Git、聊天、前端。
5. 验证生产接口与前端游戏：开局、死亡上传、最佳成绩、重复提交、断网重试。首次 60 秒解锁关卡和手机跑酷不参加此榜。

用户已要求排行榜开发，并表示连接了 Cloudflare，希望能直接操作。保留 GitHub PR 供用户合并，不直接替用户合并到 main。若另一游戏优化 PR 改了难度，参考 README 的换季与基础校验约定。
