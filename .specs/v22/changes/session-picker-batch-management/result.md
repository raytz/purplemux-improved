# 实施与验证

桌面和移动端共用 `new-tab-picker.tsx` 的批量管理入口。`use-picker-batch.ts` 保存待确认的会话清单并逐项调用已有历史删除接口。会话列表缓存失效时同时刷新「＋」列表。所有 11 种语言均补齐批量操作文案。

- `vitest run tests/unit/lib/{new-tab-picker,new-tab-sessions,new-tab-session-api,session-list-cache}.test.ts` 共 33 项通过。新增 DOM 用例覆盖两端搜索「无消息」、全选、取消、混合提供方同名 ID、活动会话冲突、仅移除历史及失败项重试。
- 完整 `tsc --noEmit`、改动 TS/TSX 文件 ESLint 和差异空白检查通过。已核对 11 种语言的键和计数占位符。
- 隔离源码副本中的生产构建通过，完成 Next.js、post-build 和 tsup 三个阶段。交互验证使用模拟会话和 jsdom，未执行浏览器实机验收。
