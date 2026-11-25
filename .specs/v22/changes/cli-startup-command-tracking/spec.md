---
page: cli-startup-command-tracking
title: 命令行启动 Codex 的会话追踪
status: DETAILED
depends_on:
  - ../codex-launch-lifecycle/spec.md
  - ../../../v20/requirements/per-agent-environment.md
  - ../../../v20/features/agent-runtime/spec.md
  - ../tab-agent-identity/spec.md
  - ../codex-terminal-provider-identity/spec.md
---

# 命令行启动 Codex 的会话追踪

用户报告通过 `tab create -t codex-cli` 创建 shell，再通过 `tab send` 启动原生 Codex 后，终端和会话历史均可读取，但标签未绑定会话 ID。

## 与启动基线的关系

[Codex 启动生命周期](../codex-launch-lifecycle/spec.md)要求启动器合并环境。[按代理独立配置环境变量](../../../v20/requirements/per-agent-environment.md)第 3、4 条规定由应用发起的新建和恢复应叠加对应代理配置。本增量仅对新建 CLI 标签内由用户发起的 shell 调用替代这两项约定。验收时可给同一环境变量分别设置 shell 值和应用值，按下表检查实际子进程。

| 入口 | 启动参数 | 子进程中的同名环境变量 |
| --- | --- | --- |
| 界面新建、恢复及服务端自动恢复 | 使用基线启动器，按工作区和恢复参数取参 | 应用设置的 `codexEnvironment` 值优先 |
| 新建 CLI 标签后从 shell 执行 `codex` | 以 `{ "hooksOnly": true }` 请求 `/api/codex/launch-args`，响应只提供 hook 参数和空的 `env`。用户提示词留在本地 argv 中 | 取调用者的 shell 值，应用中独有的变量也不注入 |

shell 启动需要取参时，沿用基线的 60 秒总期限、重试条件、响应校验和子进程退出语义。下述离线帮助与版本查询是取参的例外。

## 约定与验收

- 无论通过界面还是 shell 启动，都应在有可靠的进程到根会话关联证据时绑定正确会话，不能仅凭工作目录和最新时间猜测；保留同目录并发、子代理、已有根会话和进程退出边界。
- `codex-status` 使用标签的稳定代理身份，而非当前 Chat/Terminal 视图判断类型；仍需在读取终端前后校验工作区、会话和运行状态。其他代理或不存在的标签返回 404。
- 不重启已有会话，不修改用户全局 Codex 配置。记录实际测试与未完成项。

## 本次修复范围

- 仅为 `pmuxi tab create -t codex-cli` 新建的标签准备 shell 启动入口。仍先进入登录 shell，再由用户手动输入或 `tab send` 运行 `codex '提示词'`。不改 `tab send`，不解析或重组提示词，不为旧标签补绑。
- shell 启动只增加本应用的 hook（沿用已有用户 hook 合并规则）和必要的嵌入模式，保留启动者的环境与原始 argv；不注入界面启动器的额外权限和开发者指令。其他标签与界面启动沿用原逻辑。
- 创建接口返回前注册新 Codex 标签。hook 按发起进程的 tmux pane 路由，继续校验根会话；同目录其他标签不得被绑定。
- 新标签的启动集成保留用户的 alias、函数和 PATH 中实际选择的 Codex。通过 `command codex` 委托的 fish 包装仍应绑定；绝对路径或替换 shell 初始化的用户配置可显式使用受管入口。
- fish 在登录配置加载后将 `$HOME/.purplemux/codex-bin` 加到 PATH 首位，bash 和 zsh 在首次提示符前加入。其他 shell 可显式调用 `"$HOME/.purplemux/codex-bin/codex"`。创建成功后应能查到 `agentProviderId=codex` 和 `agentSessionId=null`，收到该 pane 的可信根会话事件后才能查到原生 ID。
- 初始化不占用终端输入。工作目录丢失时仍初始化回退目录的 shell，继续阻止自动执行业务命令。
- 显式 `--no-daemon` 不重复添加，`--` 之后的参数保持字面意义。单独查询顶层 `--help`、`-h`、`--version`、`-V` 应离线透传，不请求启动参数或额外探测。

实施和验收证据见[验证记录](./result.md)，进度见[任务记录](./task.md)。
