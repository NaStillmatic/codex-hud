# Repository Guidelines

## Project Structure & Module Organization

This dependency-free Node.js project launches Codex CLI with a configured terminal status line.

- `bin/codex-hud.mjs`: executable entry point, commands, process launching, and exit handling.
- `src/hud.mjs`: preset definitions, argument parsing, Codex configuration, and sample output.
- `test/hud.test.mjs`: unit tests and launcher integration tests.
- `research/rea-findings.md`: implementation evidence and investigation notes. Generated evidence JSON is ignored.
- `README.md`: Korean usage instructions and verified limitations.

There is no compiled output directory or separate asset pipeline.

## Build, Test, and Development Commands

Use Node.js 20 or later. Interactive launches also require Codex CLI.

- `npm start`: launch Codex with the default balanced HUD.
- `npm start -- --hud-preset full`: launch with additional token statistics.
- `npm run preview`: print sample fields without starting a live session.
- `npm run doctor`: check Node.js and the configured Codex executable.
- `node bin/codex-hud.mjs config`: print TOML without modifying configuration files.
- `npm test`: run all tests through Node's built-in test runner.

No build step is required.

## Coding Style & Naming Conventions

Use ES modules in `.mjs` files, two-space indentation, single-quoted strings, and semicolons. Prefer `const`, camelCase functions and variables, and explicit `node:` imports. Keep reusable logic in `src/` and CLI side effects in `bin/`. No formatter or linter is configured; follow existing style.

## Testing Guidelines

Use `node:test` and `node:assert/strict`; name test files `*.test.mjs`. Cover argument boundaries, invalid presets, literal prompt preservation, and child process failures when changing launcher behavior. Use temporary fake executables rather than authenticated Codex sessions, and clean up fixtures. No coverage threshold is configured. Preview output does not verify live terminal rendering.

## Commit & Pull Request Guidelines

This checkout has no Git metadata, so commit conventions cannot be established from history. Use concise, imperative subjects, such as `Fix preset argument validation`. Describe changed behavior, validation performed, and any Codex version assumptions in pull requests. Link relevant issues; include terminal screenshots for rendering changes.

## Configuration & Terminal Behavior

Pass subprocess arguments as an array without a shell. Preserve `--` forwarding and `CODEX_HUD_CODEX_BIN`. Keep launch configuration scoped to the child process. Native Codex controls the current footer layout; do not claim custom separators or multiple rows are supported without implementing and verifying them.
