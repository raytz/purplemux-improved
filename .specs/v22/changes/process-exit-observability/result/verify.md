# 验证记录

日期：2026-11-18。以下结果均来自当前独立 worktree 的实际执行。

## 自动化检查

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 监督器与记录器测试 | `node --test tests/cli/process-lifecycle.test.cjs tests/cli/server-supervisor.test.cjs` | 15 项通过，0 失败 |
| 致命错误观察器测试 | `pnpm exec vitest run tests/unit/lib/process-fatal-observer.test.ts` | 2 项通过，0 失败 |
| 完整类型检查 | `pnpm tsc --noEmit` | 通过 |
| 改动文件 ESLint | `pnpm exec eslint --no-ignore bin/process-lifecycle.cjs bin/server-supervisor.cjs tests/cli/process-lifecycle.test.cjs tests/cli/server-supervisor.test.cjs src/lib/process-fatal-observer.ts tests/unit/lib/process-fatal-observer.test.ts server.ts` | 通过；仅输出 Browserslist 数据过期提示 |
| 生产构建 | `pnpm build` | 通过；Next.js、post-build 与 tsup 均成功 |
| 差异格式 | `git diff --check` | 通过 |

## 验收映射

| 验收 | 证据与结果 |
| --- | --- |
| 退出原因与原始状态 | 测试覆盖启动期 0/非零退出、运行期 `SIGKILL`、父监督器 `SIGTERM`、升级、启动超时、端口不一致及 spawn 错误；退出码与信号分别保留 |
| 退出语义 | 已就绪进程的意外信号使监督器返回 1；父监督器主动停止仍返回 0；尚未 ready 即使子进程返回 0，监督器也返回 1 |
| 持久化与故障隔离 | 临时目录测试验证 JSONL 连续追加、0600 权限、原子快照且无残留临时文件；模拟磁盘失败返回 false 并保留调用方控制流 |
| 致命异常 | 测试验证 Error 与非 Error 的结构化 stderr；观察器只注册 `uncaughtExceptionMonitor`、重复安装幂等，不注册恢复处理器 |
| 工程检查 | 相关测试、完整 TypeScript、改动文件 ESLint、生产构建和差异格式均通过 |

## 运行时产物与限制

- 生命周期追加到 `~/.purplemux/logs/process-lifecycle.jsonl`，最近一次退出写入 `~/.purplemux/last-exit.json`。
- `SIGKILL` 无法由被杀子进程自报，但仍存活的监督器会记录该信号；监督器自身被 `SIGKILL`、宿主断电或内核级终止仍需依赖外部服务管理器日志。
- 本次未引入自动重启策略，也未修改 Electron 或 tmux 会话生命周期。
- 未运行全量测试套件或真实故障注入；相关路径由聚焦测试、完整类型检查和生产构建验证。
