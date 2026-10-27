---
name: configure
description: Change the Codex HUD status-line fields or restore the setting from before setup. Use when the user asks to customize or remove this plugin's native status display configuration.
---

# Configure Codex HUD

Resolve `../../scripts/configure.mjs` relative to this skill's installed directory. Run it with Node.js using its absolute path.

- `show`: inspect the user status-line setting and restoration state without changing files.
- `fields`: list supported field identifiers.
- `apply --fields model-with-reasoning,project-name,git-branch,context-used`: select and order native fields. Excluded fields are omitted. Keep `model-with-reasoning` first unless the user chooses otherwise.
- `apply --preset compact|balanced|full`: apply a preset; balanced includes model, reasoning, project and Git branch.
- `apply --fields none`: hide the native status line.
- `restore`: restore the status-line value recorded before initial setup while preserving unrelated later configuration changes.

Act on requested fields without asking again. If the request is ambiguous, inspect the current selection and ask only for the missing preference. An inspection request alone does not authorize applying or restoring settings.

Changes take effect on the next Codex CLI launch. Do not close an active session. Project and Git data depend on its working directory and repository. Only native status-line identifiers are supported; there are no graph, layout, border or arbitrary label options.

Before plugin removal, run `restore` when the user also wants to undo its display settings. Removing the plugin alone does not undo persisted Codex configuration. The helper refuses to restore over subsequent manual changes to the status line; report that condition and preserve those changes.
