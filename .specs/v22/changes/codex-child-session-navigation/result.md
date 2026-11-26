# 实施与验证

本机只读抽样的 10 份子代理记录都带 `source.subagent` 和 `thread_source=subagent`。父身份来自顶层 `parent_thread_id`、`thread_spawn.parent_thread_id` 或旧格式 `forked_from_id`。截图所用账户的原生记录在本机不可用，具体 51 项的构成未经核对。

`codex-session-list.ts` 读取子代理首行元数据。选择器显式请求关系数据，`new-tab-sessions.ts` 在合并原生、历史和活动记录之后构建树。只有可见根节点进入统计和批量操作。`new-tab-picker.tsx` 支持沿层级进入和返回，`child-session-history.tsx` 复用既有历史接口和时间线渲染对话、工具及输出。

- 桌面、移动组件和数据回归共 55 项通过，覆盖返回父级、进入孙级、无消息根会话、普通 fork、孤立节点、循环和保留记录。可选原生删除集成用例未启用。
- 完整 TypeScript 检查、改动文件 ESLint、差异格式和生产构建通过。
- 在独立 HOME 启动生产服务，使用合成三代 JSONL 通过 HTTP 验证默认列表只返回一个根、关系查询返回两条正确的父子边、两个子代理各自的历史内容正确。
- 使用组件测试验证桌面和移动端交互，未进行浏览器实机验收。关系发现沿用工作区目录和默认 30 天的原生扫描范围。
