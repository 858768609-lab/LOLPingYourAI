# LOLPingYourAI

把桌面上的一声 ping，变成给 AI 队友的指令。

基于 [darrenprx/lolPing](https://github.com/darrenprx/lolPing) 0.5.1 派生，保留按键—拖动—松开的双轮盘、透明覆盖层和图片导入；加入区域截图、Codex／Claude 会话、反 ping、纠错中断和持久化插眼回访。

[English](README.md) · [实测记录](docs/verification.md) · [实现与接口](docs/architecture.md) · [来源与许可](THIRD_PARTY_NOTICES.md)

## 安装与使用

Apple Silicon 安装包位于 `release/LOLPingYourAI-0.1.0-arm64.dmg`。将 LOLPingYourAI.app 放入「应用程序」。原版和派生版分别安装，同时只运行一个，以免全局输入冲突。

1. 准备已登录的 Codex CLI，或使用 Codex 桌面应用附带的 CLI；自定义位置可用环境变量 `LOLPINGAI_CODEX`。
2. 为 **LOLPingYourAI** 开启 macOS「隐私与安全性 → 辅助功能」及「录屏与系统录音」权限。不在列表时点 **＋** 添加应用，授权后重启。
3. 在设置的 **AI Teammate / 队友** 中，可以一次性填写任务目标、进度和下一步。以后 ping 续接这个队友。
4. **Option＋左键拖动**打开信号轮盘，**Control＋左键拖动**打开表情轮盘，松开发送。触发键、槽位和中心信号均可调整。
5. **撤退**或 **Control＋Option＋Escape** 停止。Windows 对应 **Ctrl＋Alt＋Escape**。

这是本地开发版，使用临时签名，未公证；没有开发者签名证书时，重新打包可能使 macOS 的旧授权失效，需要移除后重新添加。应用没有连接上游自动更新通道，不会被原版覆盖。

## 约定

| 信号 | 默认行为 |
| --- | --- |
| 问号 | 解释或诊断截图区域；只读 |
| 求助旗帜 | 检查进度并协助；意图不清时反问号 |
| 警告 | 先中断旧动作，再看最新截图和纠错指令 |
| 正在路上 | 铺满目标窗口，使用可恢复的阅读设置 |
| 插眼 | **30 分钟后回看一次**，只观察并汇报 |
| 弱爆 | 表达不满，允许轻度调侃；不会自动撤销工作 |
| 交战 | 将工作重点转到该目标 |
| 撤退 | 中断并交还控制权 |
| 点赞／喝彩 | 认可／庆祝 |
| 排眼 | 取消该窗口的待执行回访 |

默认区域 **512×512 逻辑像素**，闲置超时 **T＝2 小时**，插眼延迟 **k＝0.5 小时**。这些参数和每个信号的内容／行为都可以在设置中修改。skill 每次读取有效配置。

区域是关注点，执行时可操作所属窗口的其他控件。窗口移动后重新截图定位。屏幕边缘保留正方形留白。定时回访和 agent 反 ping 不刷新用户活跃时间；超时先安全停止，携带简短交接创建新会话。绑定外部聊天采用明确的任务交接，不声称控制原聊天。

反 ping 可显示在任务区域或当前鼠标旁，无需移动鼠标，也不会再次唤醒 agent。问号表示不明白，正在路上表示收到，交战表示开工，插眼表示登记成功。轻度调侃可关闭，完成时最多回敬一次。

## 表情与素材

- 「表情」支持 PNG/JPG/GIF/WebP 导入及拖入。
- 「创作表情」支持正方形裁切、缩放与位置调整、保留透明度、去除纯色背景；描述可以附参考图。
- 队友优先使用已有图像工具，没有时生成原创 SVG；预览标明实际方式，点击添加后才加入列表。
- 导入表情可选择并绑定自定义指令；未映射表情只表达情绪。
- 默认素材全部原创。可选本地素材包用 `textures/*.png`、`sounds/*.wav` 结构，文件名见 `src/shared/pings.ts`，与上游 assets 布局兼容。导入后重启，随时恢复原创素材。第三方素材留在用户数据目录，不进入仓库或安装包。

## 开发与命令

需要 Node 22+、pnpm 10；Mac 需要 Xcode 命令行工具，Windows 需要 Visual Studio C++ 构建工具及 .NET Framework C# 编译器。

```sh
pnpm install --frozen-lockfile --ignore-scripts
node node_modules/electron/install.js
pnpm build:helper
pnpm build:desktop
pnpm dev
```

```sh
pnpm typecheck
pnpm test:helper
pnpm test
pnpm dist:mac
pnpm exec electron tools/check-assets.cjs
# Windows 上执行：pnpm dist
```

应用运行时：

```sh
node ai/cli.mjs doctor
node ai/cli.mjs status
node ai/cli.mjs ping '{"signal":"missing","point":{"x":640,"y":400}}'
node ai/cli.mjs config '{"regionSize":512,"sessionHours":2,"wardHours":0.5}'
node ai/cli.mjs bind '{"harness":"codex","summary":"任务目标、进度、下一步"}'
node ai/cli.mjs stop
```

也可通过包的 `lolpingai` bin 调用。Windows 等不同 shell 建议 `--file payload.json`，避免引号差异。测试用独立窗口：`pnpm exec electron tools/test-board.cjs`。

Mac 数据目录是 `~/Library/Application Support/LOLPingYourAI`，Windows 是 `%APPDATA%/LOLPingYourAI`。配置、会话、回访、最近 100 张截图与本地素材保存在这里。截图和指令会发给你选择的 harness／模型服务，使用已有账号。

Codex 用 App Server；Claude 用 Agent SDK＋项目 MCP。检测到原生 Codex Computer Use 时，本 demo 仍使用项目后端，以统一坐标和取消锁；原生后端接入还未完成。Claude 的 macOS 交互式原生 Computer Use 不能当作 Windows／程序化会话的通用实现。SDK 已安装并不代表已登录。

[实测记录](docs/verification.md) 分别列出真实闭环、自动测试与尚未验证的组合。源码和原创素材使用 MIT，保留上游作者署名。本次仅本地交付，没有创建或推送 GitHub 仓库。
