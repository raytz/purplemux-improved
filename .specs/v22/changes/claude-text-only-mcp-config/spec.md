---
page: claude-text-only-mcp-config
title: Claude 文本生成空 MCP 配置兼容
status: DETAILED
depends_on:
  - ../../../v20/features/ai-branch-naming/spec.md
created: 2026-11-23
updated: 2026-11-23
---

# Claude 文本生成空 MCP 配置兼容

## 原始需求

修复创建 Worktree 时生成分支名失败：Claude CLI 将 `--mcp-config` 后的内联 JSON 误识别为相对配置文件路径，并报告 `MCP config file not found`。

## 范围与行为

- Claude `textOnly` 调用继续在一次性临时目录中执行，禁用工具、外部 MCP、上下文发现和会话持久化。
- 空 MCP 配置写入该临时目录中的真实 JSON 文件，`--mcp-config` 传入绝对文件路径，兼容把参数解释为文件路径的 Claude CLI。
- 直接执行和登录 shell 回退使用同一配置路径；完成、失败或超时后仍删除整个临时目录。
- 普通 Claude 文本生成、Codex 调用、分支名校验及 Worktree 创建行为不变。

## 验收标准

1. `textOnly` 调用启动前创建内容为 `{"mcpServers":{}}` 的临时 MCP 配置文件，Claude 参数引用该文件而非内联 JSON。
2. 直接执行及登录 shell 回退均保留既有隔离参数，且提示词仍仅通过 stdin 传入。
3. 成功、启动失败、执行失败与超时路径均清理临时目录；非 `textOnly` 调用不创建配置文件。
4. 相关单元测试、完整 TypeScript 检查及改动文件 ESLint 通过。
