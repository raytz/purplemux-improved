---
page: release-v0-5-16
title: 通过 GitHub Tag 发布 v0.5.16
status: DETAILED
created: 2026-11-27
updated: 2026-11-27
depends_on:
  - ../release-v0-5-12/spec.md
  - ../app-update-release-notes/spec.md
  - ../codex-child-session-navigation/spec.md
  - ../session-picker-batch-management/spec.md
  - ../codex-long-lived-session-lookup/spec.md
---

# 通过 GitHub Tag 发布 v0.5.16

## 用户需求与范围

用户要求“发布新版本吧”。main 已合并 PR #97 和 #98，以及 PR #97 子代理历史分页锚点评审修正；包含更新说明、子代理导航、会话批量管理和长期 Codex 会话定位。npm latest、GitHub 最新 Release 和包版本均为 0.5.15，本次发布 0.5.16。

## 行为约定

- 用 `npm version 0.5.16 --no-git-tag-version` 更新版本，通过检查后提交版本与需求记录、创建附注标签并原子推送 main 和 v0.5.16。
- 继承发布基线的 Node 24、冻结安装、check → publish-npm → github-release、OIDC/provenance 和暂停 Electron 自动发布约定。
- 保持两个 CLI、离线 Skill、Koffi 及生产依赖分类，不新增产品行为或升级依赖。
- 静态检查后运行单 worker 单元测试和 CLI 测试，远端工作流保持不变；不得覆盖已发布版本、移动已发布标签或强制推送。
- 遵循当前仓库要求，新发布规格及任务随发布提交纳入 Git；发布结果在完成验证后另行补录。
- 分别核验 npm 接收、registry 公开和正式 tarball；HTTP 202 不代表正式包可安装。

## 验收标准

1. package.json 仅版本变化，依赖及锁文件未变；本需求规格随发布提交跟踪。
2. 完整 ESLint、TypeScript、单元和 CLI 测试通过；远端构建及发布成功。
3. 标签指向发布提交，Release 公开且非预发布，npm latest、版本及 gitHead 一致。
4. 正式包 SHA-512、必要文件及元数据通过验证，bin/process-lifecycle.cjs 随包存在；两个 CLI 的帮助及离线 Skill 检查通过。
5. 如实记录实际结果与未执行项，不将包验证等同于完整安装或实机验收。

见[任务](./task.md)和[实施与验证](./result.md)。
