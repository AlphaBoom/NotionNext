# AlphaBoom/NotionNext 工作流

本仓库独立维护，不再同步上游。保留项目原有许可证和作者信息。

| 工作流                             | 触发方式                  | 用途                                                                                                                                 |
| ---------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| CI                                 | PR、main 提交、手动       | Lint、类型检查、Jest、Node/Worker 测试、锁文件检查；文档及构建依赖变化时检查 VitePress                                               |
| CodeQL                             | PR、main 提交、每周、手动 | JavaScript / TypeScript 安全扫描                                                                                                     |
| Label PRs                          | PR 更新                   | 自动标签                                                                                                                             |
| Publish Docker image (manual)      | 手动                      | 构建并发布所选分支或标签到 GHCR                                                                                                      |
| Deploy docs site (manual)          | 手动                      | 部署 VitePress 到 Cloudflare Pages，需要相应 Secrets                                                                                 |
| Submit search engine URLs (manual) | 手动                      | 向配置的百度 / Bing 提交 URL，需要 URL 及对应密钥                                                                                    |
| Bump package version (manual)      | 手动                      | 生成版本更新分支，随后由维护者创建 PR                                                                                                |
| Originality proofs                 | 手动、每日                | 仅在仓库变量 `ORIGINALITY_PROOF_AUTO_MANIFEST=true` 时运行；从 main 生成 `chore/update-originality-proofs` 更新分支，由维护者创建 PR |

上游同步和过期 Issue / PR 自动关闭工作流已移除。Dependabot 继续定期提交依赖更新 PR，不自动合并。

## 启用与合并检查

工作流文件不能自行启用仓库 Actions，也不能设置分支保护，需要管理员在 GitHub 设置中完成。

1. 在仓库 **Settings → Actions → General** 确认允许运行工作流及其使用的 Actions；在 **Actions** 页面启用 CI、CodeQL 和 Label PRs。若旧工作流仍在 main 上，先不要手动运行发布、同步或清理任务。
2. 启用后给本 PR 推送提交，或关闭后重新打开 PR，以触发检查。确认 `CI checks` 和 Vercel 的预览构建状态都成功，再配置必需检查。Vercel 构建不替代 CI 的 Lint 和类型检查。本次修改进入 main 后，也可使用 CI 的 **Run workflow** 手动运行（[GitHub 对默认分支的要求](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)）。
3. 在 **Settings → Branches** 为 `main` 添加保护规则：要求通过 PR 合并，并要求 `CI checks` 和当前 Vercel 集成报告的 `Vercel` 状态成功。不要将可跳过的 `VitePress build` 单独设为必需检查。独立维护时不要求额外的审核人数。

`CI checks` 汇总所有必要任务：Lint、类型或测试失败时失败；需要文档构建而未成功时也失败。只有确认文档相关文件未变化时，才接受文档任务跳过。CI 手动运行会检查文档。

这些配置不启用自动合并；生产发布仍由现有部署集成在合并后处理。
