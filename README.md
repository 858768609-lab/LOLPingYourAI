# LOLPingYourAI

**Ping anywhere. Your AI teammate gets the context.**

An independent desktop demo derived from [lolPing](https://github.com/darrenprx/lolPing). Keep the press–drag–release wheel; send a square screenshot, window identity and a signal-specific instruction to a dedicated Codex or Claude teammate. The teammate can answer with an on-screen ping and use scoped desktop tools.

[中文说明](README.zh-CN.md) · [Verification status](docs/verification.md) · [Architecture](docs/architecture.md) · [Attribution](THIRD_PARTY_NOTICES.md)

## Try it

On Apple Silicon, open `release/LOLPingYourAI-0.1.0-arm64.dmg` and copy **LOLPingYourAI.app** to Applications. Quit the original lolPing while this app runs: only one global input helper should be active. This local demo is ad-hoc signed, not notarized. macOS may require re-authorizing it after a rebuild; no developer signing identity is bundled.

1. Sign in to Codex CLI (`codex login`), or use the CLI bundled with the Codex desktop app. Set `LOLPINGAI_CODEX` before launch if using a different executable.
2. Open the app. Enable **Accessibility** and **Screen Recording** in System Settings → Privacy & Security for **LOLPingYourAI**. If it is missing from the list, use **+** to add the application. Restart after granting access. A stale permission after a rebuild may need removing and adding the app again.
3. Open **AI Teammate** in settings. Optionally paste a goal/progress/next-step handoff once.
4. Hold **Option + left mouse button**, drag, and release on a signal. **Control + drag** opens the emote wheel. Both triggers and wheel slots are editable.
5. Use **Retreat** or **Control + Option + Escape** to return control. On Windows: **Ctrl + Alt + Escape**.

The teammate's text, tool approvals, permissions and wards appear in settings. Pings retain the same harness session. Text prompts are passed as structured data, not typed into whichever terminal has focus.

## Signals

| Signal | Default meaning |
| --- | --- |
| Question | Explain the square; observation only |
| Assist | Inspect progress and help; ask when intent is unclear |
| Danger | Interrupt, inspect the correction, reassess |
| On my way | Expand the target window; improve reading with reversible view changes |
| Ward | One observation-only follow-up in **30 minutes** |
| Weak! | Playful dissatisfaction; no automatic undo |
| All in | Shift work to this target |
| Retreat | Interrupt and return control |
| Nice / Celebrate | Express approval or celebrate |
| Clear ward | Cancel this window's pending visits |

The original eight-slot layout is retained. Extra signals are available in the slot picker. Edit any signal's message and behavior in Teammate settings. Default focus is **512×512 logical pixels**, idle session refresh **2 hours**, and ward delay **0.5 hours**. These values are runtime settings; the skill reads the current configuration on every ping.

Agent pings appear at the current target or pointer without moving the mouse and never trigger another agent turn. Native Codex Computer Use is detected, but this demo uses the project MCP backend for a shared action lock and coordinate mapping. See the validation matrix for actual coverage.

## Emotes and local art

Import PNG/JPEG/GIF/WebP in **Emotes**. In **Create an emote**, crop an image to a square, preserve transparency or remove a flat background, and preview before adding it. A description plus optional reference image goes to the teammate: available image tools are preferred, otherwise it draws an original SVG. The preview labels the actual method. Imported emotes can have custom instructions and behaviors.

The bundled ping textures, WAV sounds and 44 animated emotes with OGG sounds are the League of Legends assets included by upstream lolPing 0.5.1. The previous geometric artwork and synthesized tones have been removed. Local packs may still override recognized textures/sounds; **Restore LoL pack** removes those overrides. Game assets belong to Riot Games and are excluded from the code's MIT license.

## Develop

Requirements: Node 22+, pnpm 10, Codex CLI authentication; Xcode command-line tools on macOS. On Windows, install Visual Studio C++ build tools and the .NET Framework C# compiler. Claude requires its own authentication/subscription or API credentials; installing the SDK alone does not establish access.

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
pnpm dist:mac    # Apple Silicon DMG
pnpm dist        # Windows x64 installer, run on Windows
```

The production app intentionally ships without an asar archive so its standalone ESM MCP server and native sharp dependencies resolve identically inside Electron and child Node mode. It has no upstream update channel or publish workflow. CI is configured for macOS and Windows; configuration is not evidence that CI has run.

With the app running:

```sh
node ai/cli.mjs doctor
node ai/cli.mjs status
node ai/cli.mjs ping '{"signal":"missing","point":{"x":640,"y":400}}'
node ai/cli.mjs config '{"regionSize":512,"sessionHours":2,"wardHours":0.5}'
node ai/cli.mjs bind '{"harness":"codex","summary":"Goal, progress, next step"}'
node ai/cli.mjs stop
```

On shells with different quoting rules, use `--file payload.json`. `lolpingai` is also the package bin entry. The CLI talks only to the running local app; `doctor` distinguishes SDK availability from authenticated live operation. `tools/test-board.cjs` is a disposable Electron window for manual integration tests: `pnpm exec electron tools/test-board.cjs`.

## Data and boundaries

Runtime data lives under `~/Library/Application Support/LOLPingYourAI` on macOS or `%APPDATA%/LOLPingYourAI` on Windows. It includes captures (latest 100), sessions, wards, local emotes and a per-launch bridge token. Nothing from this directory is committed. Screenshots and instructions are sent to the selected harness/provider using your existing account. The protocol does not type credentials or arbitrary strings into a shell.

Question/ward contexts reject desktop mutations. Window identity is re-resolved before actions; moved windows require fresh coordinates. Old operations are revoked before interruption, and “stopped” means the adapter confirmed cancellation. Close/locked/ambiguous targets fail visibly. These controls cover the provided backend; arbitrary additional harness plugins are not an OS sandbox.

MIT for code; Riot Games retains rights to game artwork and audio. Upstream copyright is retained; see [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md).

Agent replies use one FIFO queue across displays. Each reply waits for both the previous visual removal and actual audio completion. Bursts enqueue immediately; user pings and previews remain immediate.
