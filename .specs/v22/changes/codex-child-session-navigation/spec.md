---
page: codex-child-session-navigation
title: 工作区会话选择器浏览 Codex 子代理
status: DETAILED
depends_on:
  - ../new-tab-session-picker/spec.md
  - ../session-picker-batch-management/spec.md
  - ../codex-session-deletion/spec.md
---

# 原始需求

用户在「＋」会话列表中看到子代理执行会话计入总数，希望能查看父子关系并自由进入和返回子会话。

## 范围与验收

- 工作区选择器顶层、计数和批量管理只包含根会话。已确认是子代理的 Codex 身份即使在应用历史、活动标签或回收记录中也应从顶层排除。同 ID 的 Claude 会话独立处理。
- 扩展原有 Codex 子会话过滤规则，在可见父会话旁展示直接子代理入口。从父会话进入子代理可查看其执行历史、继续进入孙代理、逐级返回或选择兄弟。普通点击根会话仍按原方式恢复，浏览执行历史不创建终端。
- 从现有工作区目录及原生列表扫描窗口的 `session_meta` 读取明确的子代理标记和父线程 ID，兼容旧格式。普通 fork、无消息的根会话继续保留。隐藏、跨工作区、孤立或循环关系不能提供越界入口。
- 桌面与移动共用入口。历史支持读取较早记录、刷新、加载失败及重试。保持原生文件、活动会话和删除族谱语义。
