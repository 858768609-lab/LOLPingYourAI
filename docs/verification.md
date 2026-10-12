# Verification record — 2026-10-12

The macOS + Codex desktop-control loop was exercised with a real model and an isolated editable Test Board. This is a local demo, not a claim that every platform and manual acceptance case has passed.

## Upstream installation

- Upstream: lolPing v0.5.1; source commit `f24a51e5a11c2b31dab72d89a571cc4025ad3c98`.
- Official Apple Silicon DMG installed separately as `/Applications/lolPing.app`.
- SHA-256 matched the release asset digest: `98dbe35ab428de9a8c59d1f6bdd97b1e46e08e818e627c122087b338a2521a88`.
- Original settings and ping preview were observed; original was quit before running the fork.

## Platform matrix

| Combination | Implementation | Evidence |
| --- | --- | --- |
| macOS arm64 + Codex | App Server, project MCP, Swift/CG/AX helper | Real screenshot, model interpretation, reverse-ping calls, text editing, interruption, restoration and window resize |
| macOS + Claude | Agent SDK, project MCP, same helper | SDK import verified; no authenticated Claude run |
| Windows + Codex | Same App Server adapter; Win32 helper and DPI conversions | Source and CI configuration only; Windows helper not compiled or run here |
| Windows + Claude | Agent SDK + Win32 project backend | Source only; no Windows/Claude run |

Environment: Apple Silicon, macOS 26.4, Electron 44.5.1, Codex CLI 0.162.0-alpha.2. Native Codex Computer Use was detected; this demo executes through its project MCP backend for scoped cancellation. Native CUA integration is not claimed.

## Live desktop evidence

- The installed application reports Accessibility and Screen Recording enabled. Both privileges were checked from the app's own helper, not inferred from System Settings labels.
- A question ping supplied a 512×512 logical-pixel screenshot and window identity. The real Codex model correctly read `Ready for a ping.` without editing it. Retina scale factor 2 and square padding were inspected.
- Repeated pings and application restarts resumed the same teammate thread. Private thread IDs, screenshots and logs remain outside Git.
- An assist ping made the real model click the textarea, issue `cmd+a`, and type `Ping received.`. The Test Board independently recorded the actual value.
- A danger ping arrived while the old turn was busy. App Server reported the old turn `interrupted`; a deliberate request with the old context was rejected with `Stale ping context`. The new turn observed the changed text, used real select-and-type input to restore `Ready for a ping.`, checked a fresh screenshot, saved a handoff and sent a retreat reply. No Reset button was needed in the successful run.
- The model maximized the board to `x0 y33 width1512 height888`, then restored exactly `x100 y100 width680 height520`. Both bounds were confirmed by fresh screenshot metadata; note contents were unchanged.
- A real default 30-minute ward was registered at 19:26:13 Asia/Shanghai and due at 19:56:13. It survived application restarts. Permissions were unavailable at the deadline; it began after they were restored at approximately 19:57:49, completed an observation-only model turn and remained `completed` after further restarts. The model reported the correct unchanged note. This is a delayed catch-up run, not an exact-deadline timing claim.
- A real model generated a `Ping Buddy` SVG through `submit_icon`. The settings preview identified the method as `vector-generated`; the candidate remains available for user review.
- A separate retreat ping interrupted an active observation turn. The broker returned `stopped: true` only after App Server confirmed interruption; status became idle.
- After the final asset fix and reinstall, the real model typed `Final package OK.`, verified a screenshot, restored `Ready for a ping.`, verified again and sent a celebrate reply.
- Reply events use the agent source and did not create additional user turns. The persisted ward did not run twice.

## Automated and build checks

- TypeScript: `pnpm typecheck` passed.
- Vitest: 705 passed, 1 skipped across 43 files. The skipped case concerns Windows rename/EPERM behavior.
- AI bridge tests: 22 passed, including stale action rejection, cancellation races, session lifecycle, deduplication, read-only mode, scheduler persistence/lock/cancel and overlapping ticks.
- C++ input helper: 411 passed, 0 failed.
- Skill validator passed; Swift desktop helper compiled.
- A real Electron asset smoke test loaded all 20 signal textures and decoded all 12 WAV sounds under the production overlay Content Security Policy. Run `pnpm build` then `pnpm exec electron tools/check-assets.cjs`.
- Final installed settings showed no missing-asset diagnostics.
- Apple Silicon DMG built. The installed bundle passed `codesign --verify --deep --strict`; the DMG passed `hdiutil verify`. Release checksum is in `release/SHA256SUMS` (local artifact, excluded from Git).

## Problems found and fixed during live testing

1. Partially unpacked native image dependencies failed to resolve `detect-libc`: package production dependencies together.
2. Resuming an already loaded/new Codex thread caused writer/rollout errors: track loaded threads and create the first thread lazily.
3. Keyboard tools returned successfully without changing the note: explicitly post/release modifiers, clear inherited Unicode-event flags, mark self-generated events and allow delivery before helper exit.
4. Concurrent scheduler ticks could overlap after an awaited availability check: acquire the scheduler guard before awaiting.
5. The new local asset host was blocked by overlay CSP and custom-scheme CORS: permit only the needed asset host in CSP, enable custom-scheme CORS, and return static-resource CORS headers. The real Electron smoke test reproduces this boundary.

## Remaining manual coverage

- Physical hold-drag-release/cancel gestures for both wheels, audible sound output and focus preservation need user observation. An automation-generated Option click did not establish a physical gesture result.
- No physical secondary/mixed-DPI monitor, negative-coordinate display, sleep/wake or lock/unlock transition was exercised. Geometry and scheduler simulations cover relevant logic only.
- Import/crop/background-removal UI and custom-map persistence are implemented but their complete manual workflow has not yet been accepted. The generated emote preview was observed; adding it remains a user review step.
- Session expiry/handoff and harness switching are covered by tests, not by waiting two real hours or a live authenticated Claude switch.
- Application-specific reading-mode/zoom optimization depends on the agent and target app; maximize/restore is the part verified here.
- Builds use ad-hoc signing and are not notarized. Replacing a build can invalidate macOS grants; there is no available Developer ID identity on this machine.

No GitHub repository was created or pushed. Default artwork and synthesized tones are original; Riot assets and personal runtime data are not included in the source or package.
