---
name: setup
description: Set up the Codex HUD plugin to show model, reasoning level, project, Git branch and context usage in the native Codex CLI status line. Use when the user asks to enable or set up this plugin.
---

# Set up Codex HUD

Run the bundled helper using its absolute installed path. Resolve `../../scripts/configure.mjs` relative to this skill's directory, not the user's project directory:

```sh
node /absolute/plugin/root/scripts/configure.mjs apply
```

This configures `tui.status_line` in `${CODEX_HOME:-~/.codex}/config.toml`, backs up the previous file, and records the original status-line value for restoration. An explicit setup request authorizes this change. Keep the user's other settings unchanged; the helper validates the TOML and handles preservation.

Tell the user the applied order and that it takes effect on the next Codex CLI launch. Do not restart or interrupt their current session. Git branch requires a Git repository; project and other unavailable values may be omitted by Codex. To inspect the current session immediately, they can select the same fields using `/statusline`.

The plugin configures Codex's native one-line status display. Do not offer graphs, fixed multiple rows, composer borders, a custom renderer, or a modified Codex binary. It does not change the selected model or reasoning level.

If the helper fails, report its error. Do not replace the entire configuration manually or bypass filesystem permissions.
