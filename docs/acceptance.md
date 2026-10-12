# Reproducible manual acceptance

Use only `pnpm exec electron tools/test-board.cjs`, not a user's document. Quit the original lolPing. Run the installed application, open Teammate settings, confirm desktop permissions, then place the board in front.

1. Question ping over the note. Expect square image mapping, exact note recognition, onmyway reverse ping and no textarea changes.
2. Assist ping with message “Replace the note with Ping received. Only edit this test board.” Expect acknowledgement, allin, actual click/select/type, a confirming screenshot and handoff.
3. While a turn is active, Danger with “Stop that approach; restore Ready for a ping.” Expect immediate action-gate revocation, confirmed interrupted old turn, a new context, reassessment and restoration. Invoke a stale context manually in a test and expect rejection.
4. Retreat while active. Expect adapter completion confirmation before the UI says stopped; old actions remain rejected. A stop timeout must appear as an error.
5. On my way should maximize the same board. Ask to restore it and compare bounds. Move the board, request a new screenshot, and compare coordinate mapping. Repeat at display edges and on real secondary displays when available.
6. Ward at default 0.5 hours, restart the app, leave the board open. At due time expect exactly one observation-only visit. Run other accelerated scheduler tests for lock/cancel/closed-window behavior. Record wall-clock times; changing k to seconds does not count as the 30-minute test.
7. Crop/import a local image and bind a custom reaction; restart and confirm persistence. Generate an emote from description/reference, review its method label, then accept into the wheel. Reverse pings must not dispatch new user events.
8. Hold trigger + left-drag in several directions, release and cancel; verify both wheels and clicking through overlays. Test audible tones and multiple physical monitors separately.

Automated tests cover synthetic geometry and protocol races. They cannot establish successful OS input, model understanding, audible output, actual sleep/lock transitions or physical mixed-DPI display behavior.
