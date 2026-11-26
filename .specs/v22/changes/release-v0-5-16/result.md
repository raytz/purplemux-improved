# v0.5.16 实施与验证记录

## 实施

- 发布前 main：`332fe4a56ed0f293cde02edd9079eef01c356eb3`，与 origin/main 一致，工作区干净。
- npm latest、GitHub 最新 Release 和包版本均为 0.5.15；包含 PR #97、#98 和子代理历史分页评审修正。
- 复用发布流程和包布局（KISS/DRY），不新增产品行为或依赖（YAGNI）。
- 准备期间其他工作进程将版本元数据与本规格提交为 `1ecf2105`，随后将长期会话查找的符号链接兼容修正合入 `a86832f0` 并推送；本次以该新 main 作为测试和发布基线，不覆盖其他提交。

## 验证

- 本机 Node v24.14.1、pnpm 12.11.2。`npm version 0.5.16 --no-git-tag-version` 更新版本；初次结构化比较确认 package.json 仅版本变化、锁文件未变。
- 因 main 在测试期间被推进，以下均是在包含符号链接兼容的新基线后重跑：`pnpm lint`、`pnpm tsc --noEmit` 均退出 0。
- `pnpm exec vitest run --maxWorkers=1`：245 文件通过、2 文件跳过，2497 项通过、14 项跳过，退出 0，耗时 257.63 秒。
- `pnpm test:cli`：160 项通过、0 失败，退出 0。
- 本地日志 `/tmp/purplemux-v0.5.16-final-{lint,types,unit,cli}.log`；规格链接与 `git diff --check` 通过，推送前确认远端 main 为 `a86832f0`、目标标签不存在。
- 远端发布和正式包验证待完成；未执行完整全局安装、浏览器或桌面实机验证。
