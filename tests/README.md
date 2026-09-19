# 测试的取舍

长期测试集用于保护值得持续维护的行为，不是历次修改的验收记录。

- 优先保留内容读取与转换、访问边界、状态保存、异步竞态、失败恢复和关键交互流程。
- 新增用例前先检查已有覆盖；同一流程中的检查优先放在已有用例中，独立风险仍应独立测试。
- 固定颜色、CSS 类名、文案、源码写法、模拟出来的像素高度和游戏平衡数值，通常不作为长期契约。相关修改用当次浏览器、构建或试玩验证。
- 修过的 bug 只有在复发可能性和影响值得维护成本时才加入常驻回归；删除重复用例时，说明实际行为由哪里继续覆盖。
- 测试应调用真实业务逻辑，mock 浏览器和外部服务边界；不要把测试中的模拟状态变化当作功能集成验证。
- 通过数量不代表整个工程正确。验证记录说明覆盖范围及限制；不靠跳过失败、扩大忽略范围或降低门槛获得通过。

所有测试通过 `yarn test` 运行，CI 使用 `yarn test:ci`。

## 目录与命令

| 位置 | 内容 |
| --- | --- |
| `tests/unit/` | Jest 测试，按源码职责归类；API 测试统一在 `pages/api/` |
| `tests/node/` | 使用 Node 原生测试运行器的 ESM 测试 |
| `tests/setup/` | 环境变量和浏览器/API mock，不作为测试执行 |
| `cloudflare/*/worker.test.mjs` | Worker 测试，保留与部署代码、SQL 迁移相邻 |

- `yarn test` / `yarn test:ci`：运行全部测试；CI 使用后者。
- `yarn test:unit [文件名]`：只跑 Jest；可加 `--runInBand`。
- `yarn test:node`：只跑 Node 和 Worker 测试，不通过应用测试再次导入 Worker 测试。
- `yarn test:watch` / `yarn test:coverage`：Jest 监听或按需覆盖率报告。

## 本次精简的覆盖去向

- 删除 `quill-leaderboard.test.mjs` 转发入口：Worker 原始测试仍由 `test:node` 直接执行，避免同一套 SQL/接口检查跑两遍。
- 原 `notion-data-format.test.js` 拆到 `lib/db/notion/` 下的 `getAllPageIds`、`filterCollectionViewData`、`blockFormat` 测试。保留原场景，只抽掉重复的数据包装。
- 外部视频转换统一从 `formatNotionBlock` 入口验证；保留歌曲、专辑、外部播放器、YouTube 和普通视频边界，移除对同一路径的重复直接调用。
- PWA 写入开关改为参数化测试，继续检查构建期限制、配置优先级和写入次数。
- 删除未被使用的全局测试数据和无效 Storage mock；浏览器测试使用 jsdom 的真实 Storage。
