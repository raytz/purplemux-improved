# 验证记录

- 验收 1、3：`tests/unit/lib/app-update-ui.test.ts` 在工作区和设置两种模式检查链接的标签、目标版本及新标签页行为，模拟点击并确认升级请求数为零。覆盖无版本、同版、低版、非法版本、已跳过及安装期间的状态。
- 验收 2：检查 Electron 原生弹窗的按钮分支，查看时调用 `shell.openExternal` 后立即返回。隔离目录的 `next build` 和 `tsup --config electron/tsup.config.ts` 均通过。未在桌面实机点击弹窗或执行真实升级。
- 验收 4：逐一解析 11 份设置语言文件并比对桌面文案，全部匹配。检查原生默认升级按钮与取消按钮索引维持 0、3。
- 升级回归：`vitest run tests/unit/lib/app-update-*.test.ts tests/unit/lib/desktop-updater.test.ts tests/unit/lib/desktop-bootstrap.test.ts`，8 个文件共 78 项通过。
- 静态检查：完整 `tsc --noEmit` 通过。改动的 TypeScript 文件通过 ESLint，Electron 入口使用 `--no-ignore` 单独检查。
