# 实施与验证

## 调查结果

- 界面启动的 Codex 使用启动器注入 Purplemux hooks；直接从 shell 执行 `codex` 不经过该启动器。现有 Codex 检测默认禁用工作目录回退，防止同目录并发会话误绑定；状态轮询因此不能仅靠前台进程变化确定根会话。
- 当前服务没有用户提供的工作区和标签，`pmuxi tab status -w ws-xChn-E tab-XD4vDO` 返回 `Tab not found`，不能将源码分析当成该现场的根因确认。
- 本机只读抽样的三个 Codex 进程中，一个打开会话 JSONL，两个没有打开；不能假定文件描述符始终存在。已有本机进程解析器能利用打开的文件进行部分识别，但未证明能覆盖报告场景。
- `codex-status` 原先按视图拒绝 Terminal，已改为按稳定代理身份判断，保留读取前后的会话校验。无法确认报告中的 404 是否由此引起。

## 验证

- `pnpm exec vitest run tests/unit/lib/codex-status-line-api.test.ts`：7 项通过。
- `pnpm exec vitest run tests/unit/lib/codex-status-line.test.ts`：4 项通过。
- `pnpm exec eslint src/pages/api/codex/status-line.ts tests/unit/lib/codex-status-line-api.test.ts`：通过。
- `pnpm exec tsc --noEmit`：通过；`git diff --check`：通过。
- `pnpm build`：失败。此工作树原无 node_modules，借用主工作树依赖的符号链接指向项目根之外，Turbopack 拒绝该链接；生产构建未通过。
- 未运行真实 Codex 的界面启动与 shell 启动对照；自动会话绑定仍未实现。

上述记录为调查阶段结果。提交 `7faaee83` 时，`.gitignore` 排除了本地需求目录，PR 未包含这些文档。此次按审查意见回补规格与证据，明确 shell 启动对环境合并条款的覆盖范围。

## 2026-11-25 真实 shell 启动复现

在现有服务的工作区 `ws-MZAEpb` 新建 `codex-cli` 标签 `tab-RdwAmh`。发送前确认 `alive=true`、`command=fish`、`agentSessionId=null`，再通过 `pmuxi tab send` 发送 `codex '请仅回复 PMUX_BIND_PROBE_B_1845，不调用工具。'`。

- `tab result` 读到 Codex v0.170.0 的任务与回复；回复完成后多次 `tab status` 均为 `command=codex`、`cliState=idle`、`agentSessionId=null`。完成后 idle 本身符合预期。
- `session codex --cwd` 找到新会话 `01a21251-23e0-7621-8b89-a0520fc40616`；`session entries` 读出 3 条结构化记录，包含测试标记。同目录原标签仍绑定不同会话，按目录取最新活动在本次采样已会选到原会话。
- 用上述新 ID 调用 `session codex-status` 返回 `{"active":false,"text":null}`，未复现原报告中的 404。首次尝试的标签已进入恢复界面，不作为本轮证据。
- 这是当前运行服务上的缺陷复现，不是修复后验收；保留测试标签供继续检查。

## 仅修复新会话：实施与验证

- `src/pages/api/cli/tabs/index.ts` 在新建 `codex-cli` 时初始化该登录 shell 的 `codex` 别名，并在返回前注册标签。仍由调用方启动 Codex；`tab send` 本身保持原样。没有扫描已运行进程、按目录取最近会话或回填旧记录。
- `src/lib/providers/codex/index.ts` 与 `src/pages/api/codex/launch-args.ts` 为 shell 启动只取得合并后的 hook 参数，用户输入经 shell 处理后按 argv 原样转交，不请求权限覆盖、开发者指令或应用配置的环境变量。显式使用可执行文件绝对路径会绕过别名。
- `src/lib/hook-settings.ts` 用 hook 自身的 `TMUX_PANE` 选择目标会话，服务端继续验证根会话。首次启动可能看到原生 hook 信任提示；用户不信任时不强制运行。
- 自动化：`pnpm exec vitest run tests/unit/lib/{codex-launcher-environment,codex-launcher-lifecycle,codex-environment-api,codex-hook-session,codex-hook-handler,codex-status-line-api,layout-tab-creation-cwd}.test.ts`，89 项通过；完整 `tsc --noEmit`、改动 TS 的 ESLint 和 `git diff --check` 通过。将工作树源码复制到隔离目录并使用本地依赖，`pnpm build` 通过。
- Linux、fish、tmux、Codex v0.170.0 实测：隔离 HOME、tmux socket、监听端口的生产构建，同时在本工作树新建两个 CLI Codex 标签，确认前台为 fish 后通过 `tab send` 启动；另通过 UI 同款启动命令及创建 API 启动第三个标签。模型端点为本地模拟服务，未使用真实账户。测试账户仅信任本次生成的受管 hook。没有浏览器点击或 macOS 实机验收。

| 入口 | 标签 | 原生根会话 ID | 轮询后 |
| --- | --- | --- | --- |
| CLI alpha | `tab-R5WCZJ` | `01a21275-5cc5-7e13-98dc-61316555de19` | `ready-for-review`，状态行 active |
| CLI beta | `tab-qYUVFB` | `01a21275-5dc5-7352-9c60-27482e43c440` | `ready-for-review`，状态行 active |
| UI 启动 API 对照 | `tab-uYe33z` | `01a21275-66af-75f2-9af2-3d97e49b00c8` | `ready-for-review`，状态行 active |

两份 CLI JSONL 都包含本标签的测试标记与本地模型回复，不包含另一标签的标记。首轮隔离环境未设置 UTF-8 locale，tmux 将列表分隔符输出成下划线导致状态误报 inactive；使用正常的 `LANG=C.UTF-8` 隔离环境重测得到上表结果。没有部署或重启用户正在使用的服务。

## Claude Code 审查修正与最终验收

新建 CLI 标签通过 `createSession` 准备登录 shell。fish 在配置加载后加入启动器目录，bash 和 zsh 在首次提示符前加入。用户的 alias 和函数优先，`command codex` 可继续使用其指定的参数。其他 shell 或自行替换提示符初始化的配置可以调用 `$HOME/.purplemux/codex-bin/codex`。注册标签仅记录代理身份，首次根 hook 才写入 session ID。

- 目录回退和 shell 初始化独立。回归测试断言，目录消失时新终端获得启动配置，同时没有发送任何按键或运行原业务命令。
- 单独帮助和版本查询直接转交原生 Codex。包含 `--no-daemon` 的调用保留用户参数，分隔符后的字面内容保持原样。
- 复审后修正了私有启动目录经符号链接再次命中自身的情况，同时恢复已有启动文件的执行位。核对了旧标签按 panelType 回退的状态行测试。
- 最终源码在独立副本中运行 `pnpm build` 成功。8 个相关测试文件共 110 项通过，包括启用 `PMUX_TEST_TMUX=1 PMUX_TEST_FISH=/usr/bin/fish` 的真实 tmux 测试。完整 `pnpm exec tsc --noEmit`、改动 TS 的 ESLint、`git diff --check` 通过。
- Linux 隔离 HOME 和 socket 的最终构建验收使用 tmux、Codex 0.170.0 与本地模型端点。以下三例均在同一工作树，三个根会话均返回 `active=true` 和 `ready-for-review`。两个 CLI 会话的 JSONL 分别含各自标记和模型回复。

| 启动方式 | 标签 | 根会话 ID |
| --- | --- | --- |
| 普通 fish，`tab send` 启动 | `tab-i9CQYl` | `01a212e6-d1f4-7fd0-866e-167493b364cc` |
| 自定义 fish 函数，经 `command codex --profile wrapper --no-daemon` 启动 | `tab-_ci304` | `01a212e6-d59d-7663-b8ff-fed2ec27e596` |
| UI 对应的启动和建标签 API | `tab-VvBT1j` | `01a212e6-da71-7301-93fd-5755a5dc5614` |

bash 和 zsh 另以真实登录 shell 验证。保留自定义 alias，确认命令解析到受管入口，再关闭隔离应用服务、向 PATH 加入该目录的符号链接，两者的 `codex --version` 均返回 `codex-cli 0.170.0`。本轮未在 macOS 或浏览器点击路径上验收。

## PR #96 规格回补验证

本轮只改需求文档。重新运行 `pnpm exec vitest run tests/unit/lib/{codex-environment-api,codex-launcher-environment,codex-launcher-lifecycle}.test.ts`，58 项通过，覆盖 shell 只取 hook、应用启动合并环境及取参超时。规格中的 7 个不同依赖和链接目标均已进入 Git 索引，`git diff --cached --check` 通过。前述生产构建和实机结果来自实现阶段。
