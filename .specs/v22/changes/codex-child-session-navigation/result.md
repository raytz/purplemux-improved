# 实施与验证

## 2026-11-27：PR #97 分页锚点评审修正

- 评审指出：子代理历史的 `onLoadMore` 仅变更 SWR 游标后便立即结束，`TimelineView` 的手动滚动锚点可能在新历史到达前清除，导致不支持 `overflow-anchor` 的浏览器失去阅读位置。
- `child-session-history.tsx` 将分页请求结果写入当前会话的 SWR 缓存，并在目标页实际提交到视图后才完成加载；引用比较确保内容相同时也能完成。分页请求互斥，失败保留历史、显示错误并允许重试，刷新重新读取最新页，切换或卸载后旧请求不会回填。
- `pnpm exec vitest run tests/unit/lib/child-session-history.test.ts tests/unit/lib/new-tab-picker.test.ts tests/unit/lib/timeline-turn-pagination.test.ts --maxWorkers=1`：3 个文件、40 项通过。新增测试挂载真实时间线并模拟浏览器缺少原生锚定，验证延迟分页后的 scrollTop，以及错误重试、切换、刷新和相同页。
- `pnpm tsc --noEmit` 和改动文件 ESLint 通过；日志 `/tmp/purplemux-child-history-{types,lint,regression}-final.log`。
- 在 `/home/home/workspace/.purplemux-child-verify-pLME8u` 隔离源码副本中，以最终实现执行 `next build`、`scripts/post-build.js` 和 `tsup` 均通过；不修改运行服务的构建目录。源码副本无 `.git`，配置读取提交号时回退为 unknown。首次尝试以仓外依赖符号链接构建被 Turbopack 拒绝，复制依赖至隔离目录后通过。日志 `/tmp/purplemux-child-history-build-verified.log`。
- 未执行真实浏览器、移动设备或真实 Codex 会话验收；jsdom 中模拟滚动高度和浏览器能力，不能代替实机验证。未提交或推送代码。

本机只读抽样的 10 份子代理记录都带 `source.subagent` 和 `thread_source=subagent`。父身份来自顶层 `parent_thread_id`、`thread_spawn.parent_thread_id` 或旧格式 `forked_from_id`。截图所用账户的原生记录在本机不可用，具体 51 项的构成未经核对。

`codex-session-list.ts` 读取子代理首行元数据。选择器显式请求关系数据，`new-tab-sessions.ts` 在合并原生、历史和活动记录之后构建树。只有可见根节点进入统计和批量操作。`new-tab-picker.tsx` 支持沿层级进入和返回，`child-session-history.tsx` 复用既有历史接口和时间线渲染对话、工具及输出。

- 桌面、移动组件和数据回归共 55 项通过，覆盖返回父级、进入孙级、无消息根会话、普通 fork、孤立节点、循环和保留记录。可选原生删除集成用例未启用。
- 完整 TypeScript 检查、改动文件 ESLint、差异格式和生产构建通过。
- 在独立 HOME 启动生产服务，使用合成三代 JSONL 通过 HTTP 验证默认列表只返回一个根、关系查询返回两条正确的父子边、两个子代理各自的历史内容正确。
- 使用组件测试验证桌面和移动端交互，未进行浏览器实机验收。关系发现沿用工作区目录和默认 30 天的原生扫描范围。
