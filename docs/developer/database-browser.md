# 数据库浏览与分页

数据库目录、数据库列表和条目正文使用独立的取数路径。普通页面不预取任何 collection query；文章发布索引及 CONFIG 表显式使用 `fetchCollections: true`，缓存键也与页面内容隔离。

## 部署前配置

1. 创建 Notion 内部连接，授予读取内容权限，将要展示的数据库及关联视图的父数据库共享给这个连接。
2. 在 Vercel 的 Preview 和 Production 环境配置服务端变量 `NOTION_DATABASE_TOKEN`。已有 `NOTION_API_TOKEN` 且权限足够时也可复用。
3. 重新部署，在三个数据库中分别检查首批、加载更多、视图切换、筛选排序及条目跳转。

Token 不能使用 `NEXT_PUBLIC_` 前缀。仅有公开页面链接或 `NOTION_TOKEN_V2` 不满足官方 API 的连接授权要求。没有连接授权时，新列表显示加载失败和 Notion 原页入口，不会回退成全量下载。合并生产之前须完成连接配置及真实 API 验证。

这些数据库同时需要公开：列表 API 使用匿名 Notion 请求确认站点归属，并批量读取当前页的公开条目。服务端连接拥有的私人内容不会因此变成公开响应。数据库必须位于 `NOTION_PAGE_ID` 所指定站点的后代中；服务端不会接受客户端指定的数据源 ID 或任意 API 地址。

## 查询流程

- 数据库目录只保留当前页正文、子页面链接及数据库名称/视图元数据。
- 首屏和文章内嵌数据库进入视口附近后，通过 `POST /api/notion-database` 请求当前视图的 30 条记录。
- 已保存视图调用官方 `POST /v1/views/{view_id}/queries`。返回的查询快照支持稳定分页，后续通过 `GET /v1/views/{view_id}/queries/{query_id}` 读取。
- 每页返回的 ID 通过一次匿名 `getBlocks` 请求批量补齐属性，并排除无法公开读取的记录。不会逐条调用 `getPage` 或加载条目正文。
- 访客添加搜索、筛选或排序时，读取保存视图的条件，与访客条件组合后调用 `POST /v1/data_sources/{data_source_id}/query`。保留完整的保存筛选及 quick filters；访客排序覆盖保存排序。搜索匹配名称。任何访客操作都不会修改 Notion 的视图配置。
- 服务器签名的游标绑定数据库、视图、搜索、筛选和排序，并设置过期时间。视图查询过期显示“刷新结果”；不会悄悄重复追加第一页。
- 查询响应和元数据使用有容量上限的短期进程缓存并合并并发请求。游标不依赖单个服务器进程，能够跨 Vercel 实例使用。
- 表格、画廊、列表、看板使用相同分页数据。看板的分组数量明确为已加载数量。其他 Notion 布局提供原页入口。
- 查询条件写入带数据库 ID 的 URL 参数，支持一个页面存在多个数据库。浏览器会短期保留已加载条目及滚动位置，返回列表时恢复；存储禁用或超出配额时仍可浏览。
- 点击条目后，既有正文渲染器按需加载该条目；列表链接关闭自动预取。

数据源查询的结果在翻页期间可能因 Notion 数据更新而改变；客户端按条目 ID 去重。已保存视图使用 Notion 的查询快照。官方查询如果报告结果上限，界面明确提示添加筛选，不把截断结果当作完整数据库。静态导出站点需要另行部署此 API；纯静态文件不能执行数据库查询。

## 验证

```sh
yarn jest --runInBand __tests__/lib/notion/database/query.test.js __tests__/components/DatabaseBrowser.test.js __tests__/components/NotionCollectionGallery.test.js
yarn lint
yarn type-check
```

测试覆盖跨过 999 条并读完 1,576 条的分页、嵌套保存条件与访客条件组合、游标签名和过期、公开权限边界、目录数据裁剪、快速切换时丢弃旧响应、加载更多去重和返回列表恢复。分页测试使用接口契约数据，不替代部署环境中的真实连接测试。

官方接口参考：

- [Views API](https://developers.notion.com/guides/data-apis/working-with-views)
- [Create a view query](https://developers.notion.com/reference/create-view-query)
- [Data source filters](https://developers.notion.com/reference/filter-data-source-entries)

## 本次验证记录（2026-09-18）

- 公开目录实际读取后仅保留 7 个页面块，原始记录约 28 KB；不含数据库条目查询结果。
- 三个实际数据库均通过匿名归属/元数据读取验证。已连接的 Notion 工具读取技能视图两批各 30 条，条目不重复；这验证了数据源与游标行为，但该工具连接不能作为 Vercel 的运行时 Token。
- 全量 Jest：88 个套件、518 项通过；Node 测试：26 项通过。
- 改动文件 ESLint 与 TypeScript 检查通过；Next.js 生产编译通过（compile 模式，未执行全站静态数据生成）。
- 全仓库 ESLint 仍在未修改的 `lib/db/notion/bookmarkImages.mjs` 和 `lib/utils/writingMode.mjs` 上报告类型规则错误。
- 本地浏览器连接受环境限制，未完成真实浏览器端到端联调；Vercel 的 Notion 连接配置与真实 API 验证也尚待完成。因此应先在 Preview 环境验证，再合并上线。
