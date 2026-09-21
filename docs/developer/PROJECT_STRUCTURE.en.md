# Project structure

[中文](./PROJECT_STRUCTURE.md)

| Directory | Responsibility |
| --- | --- |
| `pages/` | Next.js Pages Router routes, APIs and SSG/ISR entry points |
| `components/` | Shared UI; `database/` contains database preview components and hooks |
| `themes/<theme>/` | Theme layouts, components, styles and configuration |
| `themes/medium/reward/` | Games and the hidden theme, split into `components/` and `lib/` |
| `lib/db/notion/` | Notion fetching, normalization, metadata and media; `database/` owns previews |
| `lib/site/` | Site data adapters and processors; existing assembly lives in `lib/db/SiteDataApi.js` |
| `lib/cache/`, `lib/build/` | Caching and build-time logic |
| `lib/plugins/`, `lib/utils/` | Integrations and shared utilities |
| `conf/`, `blog.config.js` | Configuration definitions; `lib/config.js` handles lookup and precedence |
| `cloudflare/` | Independently deployed Workers with colocated tests |
| `tests/` | Application tests, setup and test documentation |
| `scripts/` | Development, quality, documentation and translation scripts |
| `docs/`, `.vitepress/` | Documentation and its site |

Keep route handlers thin and put shared data logic in `lib/`. Notion data modules belong in `lib/db/notion/`, without a parallel `lib/notion/` tree. Client code may import pure database models; only server entry points should import `database/server.js`. Avoid barrel exports that pull server dependencies into browsers.

Medium's ordinary blog UI stays in `components/`; optional games and the NEW GAME! theme stay in `reward/`. Preserve their dynamic imports.

Jest suites mirror their source areas under `tests/unit/`. Native ESM suites live in `tests/node/`, shared environment setup in `tests/setup/`. Only `*.test.*` files are discovered. See the [test guide](./testing.md).
