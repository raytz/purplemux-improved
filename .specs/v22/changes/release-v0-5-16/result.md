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


## 远端发布

- 发布提交 `a13c61eb2ea9044c4bad0fd69a36d3eb8a827e07`；附注标签对象 `00466a1d7f746c0d5f0eaa85962bf44c898b7660`，远端解引用为发布提交。
- [Actions 45902492609](https://github.com/stirp/purplemux-improved/actions/runs/45902492609)：check、publish-npm、github-release 均成功。
- 远端单元测试 2489 项通过、15 项跳过；CLI 测试 160 项通过、0 失败。冻结安装、静态检查、标签校验、构建及 provenance 发布成功。
- npm 于 2026-11-26 22:09:25 UTC 返回 HTTP 202；registry 正式公开时间为 2026-11-26 22:13:35.022 UTC（北京时间 11 月 27 日 06:13:35）。
- [GitHub Release v0.5.16](https://github.com/stirp/purplemux-improved/releases/tag/v0.5.16) 于 2026-11-26 22:09:41 UTC 公开，非草稿、非预发布。
- 远端日志 `/tmp/purplemux-v0.5.16-ci-{check,publish}.log`。

## 正式包与限制

- 官方 registry 的 version、latest 均为 0.5.16，gitHead 与发布提交一致。
- 正式 tarball 下载成功，SHA-512 与 dist.integrity 一致；包含 1290 个条目，未发现 `.env*` 文件。
- package.json、LICENSE、两个 CLI、server-supervisor、process-lifecycle、autostart、离线 Skill、dist/server.js、standalone/server.js 和 tmux.conf 均存在。
- Node >=24、两个 bin、Koffi 2.15.2 符合约定；生产 dependencies 不含 electron-updater 或 lodash.isequal。
- 两个 CLI 的 `--help` 与 `skill` 共 4 项检查退出 0 且无 stderr，Skill 输出与随包文件逐字节一致；使用测试端口和 token，不连接用户服务。
- 验证脚本 `/tmp/purplemux-v0.5.16-verify.py`，结果 `/tmp/purplemux-v0.5.16-verification.json`，正式包 `/tmp/purplemux-improved-0.5.16.tgz`。
- registry 等待期间遇到临时连接失败，重试后成功；未重复发布或移动标签。
- 文档链接和 `git diff --check` 通过，最终记录单独提交至 main；发布标签保持不动。
- 未执行完整全局安装、浏览器或桌面实机验证；包和 CLI 验证不代表这些验收。
