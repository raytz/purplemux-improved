# 实施与验证结果

## 实施

- `src/lib/agent-text.ts`：Claude `textOnly` 模式在既有一次性目录中创建权限为 `0600` 的 `mcp.json`，写入 `{"mcpServers":{}}`，并将绝对路径传给 `--mcp-config`；直接执行与登录 shell 回退复用同一参数。
- `tests/unit/lib/agent-text.test.ts`：覆盖配置内容、文件权限、直接执行参数、shell 回退参数、普通调用不写配置，以及配置写入失败后的目录清理。
- 未修改分支名输出校验、Worktree 创建流程、普通 Claude 调用或 Codex 行为。

## 验证

- `claude --help`：确认当前 CLI 的 `--mcp-config <configs...>` 支持 JSON 文件，且 `--strict-mcp-config` 保持仅加载显式配置的隔离语义。
- `pnpm exec vitest run tests/unit/lib/agent-text.test.ts tests/unit/lib/agent-text-process.test.ts tests/unit/lib/generate-branch-name-api.test.ts`：3 个文件、32 项测试全部通过。
- `pnpm tsc --noEmit`：通过。
- `pnpm exec eslint src/lib/agent-text.ts tests/unit/lib/agent-text.test.ts tests/unit/lib/agent-text-process.test.ts tests/unit/lib/generate-branch-name-api.test.ts`：通过；仅输出现有 Browserslist 数据过期提示。
- 未执行真实模型生成，以避免为参数兼容验证产生外部模型请求；CLI 参数契约及进程调用由帮助输出和自动化测试覆盖。
