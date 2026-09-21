# 目录与模块说明

[English](./PROJECT_STRUCTURE.en.md)

## 模块职责

| 目录 | 职责 |
| --- | --- |
| `pages/` | Next.js Pages Router 路由、API、SSG/ISR 入口 |
| `components/` | 跨主题组件；`database/` 存放数据库预览 UI 和客户端 hook |
| `themes/<theme>/` | 主题布局、组件、样式及配置 |
| `themes/medium/reward/` | Medium 的小游戏和隐藏主题；`components/` 放 UI，`lib/` 放状态、模拟与 hook |
| `lib/db/notion/` | Notion 内容获取、格式转换、元数据和图片处理 |
| `lib/db/notion/database/` | 数据库预览模型、公开范围、缓存服务和行属性 |
| `lib/site/` | 站点数据适配与处理；`lib/db/SiteDataApi.js` 负责已有站点数据组装 |
| `lib/cache/`、`lib/build/` | 缓存与构建阶段逻辑 |
| `lib/plugins/`、`lib/utils/` | 功能集成与共享工具 |
| `conf/`、`blog.config.js` | 配置定义；`lib/config.js` 负责读取和优先级 |
| `cloudflare/` | 独立部署的 Worker，测试保留在各 Worker 旁边 |
| `tests/` | 应用测试、测试环境及运行说明 |
| `scripts/` | 开发、质量检查、文档与翻译脚本 |
| `docs/`、`.vitepress/` | 项目文档和文档站 |

## 模块边界

- 路由负责接收请求和组装页面；共用的数据处理放在 `lib/`，跨主题 UI 放在 `components/`。
- Notion 相关数据逻辑统一放在 `lib/db/notion/`，不再另建平行的 `lib/notion/`。
- 数据库客户端只引用 `database/model.js` 等纯逻辑；`database/server.js` 由 API/服务端入口使用。不要用统一 barrel 导出把服务端依赖带进浏览器。
- Medium 的常规文章组件放在 `components/`。小游戏和 NEW GAME! 主题放在 `reward/`；游戏和完整隐藏主题保持动态导入，普通文章不预加载它们。
- 测试按源码职责组织在 `tests/unit/`；Node ESM 测试在 `tests/node/`。共享环境在 `tests/setup/`，Jest 只发现 `*.test.*` 文件。

运行方式及精简原则见 [测试说明](./testing.md)。
