# 棘夜无限模式排行榜

## 方案与费用

使用 **Cloudflare Workers Free + D1**。博客可继续部署在现有平台，浏览器直接请求这个独立的 Worker，不需要把整个 NotionNext 搬到 Cloudflare。前端无新增依赖。

截至 2026-09-09，官方免费额度为：

| 服务    | 免费额度                                               |
| ------- | ------------------------------------------------------ |
| Workers | 每天 100,000 次请求；每次请求 10ms CPU 时间            |
| D1      | 每天读取 5,000,000 行、写入 100,000 行；账号总存储 5GB |

对于低流量博客足够。一次游戏只在开始和手动上传时写库；结算预估排名、查看详情、手动刷新和上传成功时读取前 20 名。客户端读取使用 `cache: 'no-store'`，避免上传后刷新恢复旧榜单。D1 有排序索引，避免为展示前 20 名扫描整个排行榜。限流也占少量数据库读写；额度按账号共享，需计入已有 Worker 的用量。

保持 Workers Free，不需要升级 Paid。Free 的限额耗尽会拒绝请求；客户端显示错误，游戏继续运行。不要为此启用按量付费方案。

来源：[Workers 定价](https://developers.cloudflare.com/workers/platform/pricing/)、[D1 定价](https://developers.cloudflare.com/d1/platform/pricing/)。

备选：[Upstash Redis Free](https://upstash.com/docs/redis/overall/billing) 目前有 256MB、每月 500,000 条命令，也足够，但需要额外账号及服务端代理。这里已有 Cloudflare Worker，D1 更直接。[Supabase Free](https://supabase.com/pricing) 支持完整数据库和认证，但低活跃免费项目可能在一周无活动后暂停，故不是这个低访问量博客的首选。

## 功能与约定

- 只收录电脑端棘夜的 **endless** 模式，首次解锁关卡和手机跑酷不混排。
- 游戏标题旁常驻“排行榜 TOP 20”入口，点击直接弹出榜单；首次关卡也可查看，并说明通关后如何参加无限榜。游戏进行中查看排行榜会暂停，关闭后手动继续。
- 开局创建随机凭证，死亡后直接在游戏区域显示成绩卡、生存时间、击退数和预计名次，再选择填写昵称上传、不上传继续挑战、返回博客或查看完整榜单。查看和预估不公开成绩；仅手动上传时写入。Esc 优先关闭排行榜，再次按下才退出游戏。
- 预计排名按当前前 20 名与本局成绩比较，同成绩排在已有记录之后；榜外只显示“暂未进入前 20 名”，不推算不存在的精确全站名次。上传后采用服务器确认的最佳纪录名次；较差成绩未覆盖旧纪录时会明确标为“最佳纪录排名”。
- 成绩卡与榜单使用 Medium 的 `--paper / --ink / --muted / --line / --accent / --wash`，随普通、深色和 NEW GAME! 主题同步；榜单前三名与本人记录分别突出显示。
- 排序依次为生存毫秒数、击退数、首领数降序，完全相同则首次提交者在前。显示前 20 名。
- 每个浏览器、每季仅保留一条最佳成绩；昵称不能作为身份标识，同名允许共存。
- 不需要注册。浏览器本地保存随机玩家 ID 和昵称；清除数据、无痕模式或换设备视为新玩家。这是轻量娱乐排行榜，不是实名榜。
- 上传失败保留本局结果，可在结算界面重试。开局请求失败不能补开凭证上传已有成绩；本局继续正常游戏。
- 同一局重试幂等，并发提交由数据库事务保证只录入首个结果。成绩较差不会覆盖最佳纪录。
- 未配置 URL 时隐藏整个入口，不请求排行榜。故障、配额不足不影响移动、升级、暂停或返回博客。

## 部署

需要 Cloudflare 账号的 D1 编辑和 Workers Scripts 编辑权限；使用自定义域名还需对应 Zone 权限。可以通过连接的 Cloudflare 插件创建，或在本机使用 Wrangler。

以下命令在仓库的 `cloudflare/quill-leaderboard` 目录运行。

1. 登录并建立免费的 D1 数据库：

```bash
npx wrangler login
npx wrangler d1 create quill-leaderboard
cp wrangler.toml.example wrangler.toml
```

2. 编辑 `wrangler.toml`：把返回的 `database_id` 填进去，`ALLOWED_ORIGINS` 改为博客实际 Origin（协议 + 域名，无末尾斜杠）。多个合法域名使用逗号分隔，不使用 `*`。若要测试 PR 预览，需要显式加入它的 Origin。默认 `SEASON = "endless-v1"`。

3. 添加只在服务端保存的限流盐（至少 32 个随机字符）。可用密码管理器生成，或本地执行 `openssl rand -hex 32`，然后粘贴进 Wrangler 提示。不要写进前端、Git 或聊天：

```bash
npx wrangler secret put RATE_LIMIT_SALT
npx wrangler d1 migrations apply quill-leaderboard --remote
npx wrangler deploy
```

4. 将返回的 `https://quill-leaderboard.<account>.workers.dev` 地址填入博客部署平台环境变量，然后重新构建博客：

```env
NEXT_PUBLIC_QUILL_LEADERBOARD_URL=https://quill-leaderboard.<account>.workers.dev
NEXT_PUBLIC_QUILL_LEADERBOARD_SEASON=endless-v1
```

这两个是公开配置，不是密钥。`NEXT_PUBLIC_*` 在构建时写入前端，修改后必须重新构建。可选给 Worker 绑定自己的域名（如 `rank.your-domain.com`），再把 URL 换成该域名。

`wrangler.toml`、`.dev.vars` 和 `.wrangler/` 已在本目录忽略，不提交账号配置或本地数据库。

## 检查部署

```bash
curl -i 'https://YOUR_WORKER/v1/leaderboard?season=endless-v1' \
  -H 'Origin: https://YOUR_BLOG'
```

应返回 200，`entries` 初始为空，响应中 `Access-Control-Allow-Origin` 精确匹配博客 Origin。故意用未授权 Origin 应返回 403。

打开博客电脑端无限模式，开局、正常死亡并上传；确认排行榜出现该昵称；较低成绩不能覆盖最佳成绩。断网、暂停和切回博客也应继续正常工作。

## 与游戏优化 PR 的协作接口

游戏模拟文件 `themes/medium/lib/survivors.js` 不需要改动。`SecretSurvivors` 仅在新局开始时调用 `beginLeaderboardRun()`，并在 `lost` 时冻结 `durationMs / kills / bosses / level`。暂停、恢复、升级不能重新创建凭证。

当前服务端仅做宽松上界检查：生存 1 秒至 24 小时，不能超过开局后的墙钟时间（容忍 5 秒网络延迟）；击退数不超过每秒 60 加 100；首领数不超过每分钟 1 个；等级不超过 `1 + kills * 25`。这些是拒绝明显假数据的检查，不参与游戏难度。

**若平衡调整改变了每分钟首领数量、击退频率或等级规则，请同步调整 `worker.mjs` 的 `validateScore`。** 大幅改变难度或玩法时同时更新前端 `NEXT_PUBLIC_QUILL_LEADERBOARD_SEASON` 与 Worker `SEASON`（例如 `endless-v2`），旧数据留存，但不与新规则混排。部署切换期间版本不一致的请求会明确提示刷新或重新挑战。

## 基础防刷与边界

- 服务端生成一次性随机局凭证；数据库仅保存其 SHA-256，不向排行榜公开玩家 ID、凭证或 IP。
- 使用服务端时间检查、字段类型与范围检查、昵称长度与控制字符检查；昵称在 React 中作为普通文本渲染。
- IP + 时间窗口 + 服务端盐哈希限流；10 分钟每 IP 最多开局 30 次、提交 60 次。数据库只保存哈希，不保存原始 IP。限流哈希及过期局记录每日定时清理，最佳成绩长期保留。
- 来源白名单防止其他网站直接从浏览器使用接口；它不是身份认证，脚本可以伪造 Origin。
- 客户端模拟无法提供强防作弊：有意修改游戏、伪造统计或批量换浏览器 ID 仍可能绕过这些检查。不会为了博客彩蛋引入服务端实时模拟。遇到刷榜可先删异常记录，后续再加 Turnstile 或登录。

在 D1 控制台可以查看及删除已确认异常的成绩。例如先查询确认对应 ID，再删除（参数替换成实际 run_id）：

```sql
SELECT run_id, nickname, duration_ms, kills FROM scores
WHERE season = 'endless-v1' ORDER BY duration_ms DESC LIMIT 20;
DELETE FROM scores WHERE run_id = 'CONFIRMED_ABUSIVE_RUN_ID';
```

## 本地验证

Node 22.13+（仓库支持 22–24）：

```bash
node --test cloudflare/quill-leaderboard/worker.test.mjs
yarn jest --runInBand __tests__/themes/medium/*Leaderboard*.test.js __tests__/themes/medium/survivorsExit.test.js
```

Worker 测试使用 Node SQLite 执行真实建表、索引、排序、幂等事务和清理 SQL，无需云端账号。前端测试覆盖局凭证、上传失败重试、榜单刷新、游戏生命周期和输入框键盘行为。
