---
page: codex-long-lived-session-lookup
title: 长期 Codex 会话按身份定位
status: DETAILED
created: 2026-11-27
depends_on:
  - ../../../v19/features/codex-timeline-integration/spec.md
  - ../../../v20/features/timeline-history/spec.md
  - ../codex-input-delivery-stall/spec.md
---

# 长期 Codex 会话按身份定位

## 需求与范围

运行和恢复的 Codex 会话可能存在超过 30 天。已知会话 ID 时必须能够找到其原生 JSONL，避免时间线显示空会话。现场的会话文件创建于 2026-10-16；默认 30 天查找未命中，但解析文件最近一轮成功。

扩展按明确 ID 的原生会话定位：先查最近 30 天，未命中时遍历 sessions 下现有的年/月/日目录，不设置会话年龄上限。显式指定 `daysBack` 时继续遵守调用者的搜索范围。文件名只能作为候选，返回前必须校验 `session_meta` 的 ID；目录或文件不可读、已删除、格式错误时继续查找。按 cwd 推断最近会话的 30 天范围保持不变；不改动原生文件、存储格式、会话列表或连接上限。

## 验收标准

1. 已知 ID 的 30 天外及跨年会话可定位并读取其最近一轮；最近会话保持优先，显式窗口不会查到窗口外文件。
2. 文件名命中但元数据身份不符或无效时不得返回错误会话，仍可找到之后的正确文件；找不到时返回空。
3. 使用实际会话文件执行只读解析验证；覆盖默认查找、范围限制、异常与调用链回归，运行完整 TypeScript 和改动文件 ESLint，并记录实际限制。

见 [任务](./task.md) 和 [实施与验证](./result.md)。
