#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { constants } from 'node:os';
import { buildArgs, fieldExamples, parseArgs, presets, preview } from '../src/hud.mjs';
import { readSettings, resetSettings, resolveSettings, saveSettings, settingsPath } from '../src/settings.mjs';

const help = `codex-hud 0.2.0 — optional Codex CLI launcher (plugin setup does not require this)

  codex-hud [--hud-preset compact|balanced|full] [Codex arguments]
  codex-hud --hud-fields model-with-reasoning,project-name,git-branch,context-used
  codex-hud resume --last
  codex-hud preview [--hud-preset full]
  codex-hud config [--hud-preset compact]
  codex-hud doctor
  codex-hud fields
  codex-hud settings show
  codex-hud settings save --hud-preset compact
  codex-hud settings save --hud-fields model-with-reasoning,context-used
  codex-hud settings reset
  codex-hud --hud-help

Default: saved settings, otherwise balanced. Explicit HUD options override saved settings.
--hud-fields selects fields in order; none hides the status line.
When both options are provided, --hud-fields overrides --hud-preset.
Everything after -- is passed literally to Codex.
Set CODEX_HUD_CODEX_BIN to use a different Codex executable.
Set CODEX_HUD_CONFIG to override the HUD settings file location.
Only settings save/reset write HUD settings. Codex configuration is never changed.
Codex retains control of terminal rendering.
Tested target: Codex CLI 0.164.0. Node.js 20+; no runtime dependencies.
`;

function run() {
  const args = process.argv.slice(2);
  if (args[0] === '--hud-help') {
    process.stdout.write(help);
    return 0;
  }
  const command = ['preview', 'doctor', 'config', 'fields', 'settings'].includes(args[0]) ? args.shift() : 'launch';
  if (command === 'fields') {
    if (args.length) throw new Error('Usage: codex-hud fields');
    process.stdout.write(`${Object.entries(fieldExamples).map(([name, example]) => `${name.padEnd(22)} ${example}`).join('\n')}\n\nUse --hud-fields none to hide the status line.\n`);
    return 0;
  }
  const action = command === 'settings' ? (args.shift() || 'show') : null;
  if (command === 'settings' && (!['show', 'save', 'reset'].includes(action) || (action !== 'save' && args.length))) {
    throw new Error('Usage: codex-hud settings show|save|reset [--hud-preset NAME | --hud-fields LIST]');
  }
  if (action === 'reset') {
    resetSettings();
    process.stdout.write(`HUD settings reset to balanced: ${settingsPath()}\n`);
    return 0;
  }
  const parsed = parseArgs(args);
  const { forwarded } = parsed;
  if (command === 'settings' && forwarded.length) throw new Error('settings save accepts only HUD options.');
  const settings = resolveSettings(args, parsed, readSettings);
  const selection = settings.fields ?? settings.preset;
  const fields = settings.fields ?? presets[settings.preset];
  if (command === 'settings') {
    if (action === 'save') saveSettings(settings);
    process.stdout.write(`${action === 'save' ? 'Saved' : 'Settings'}: ${settingsPath()}\n${JSON.stringify(settings, null, 2)}\n`);
    return 0;
  }
  const executable = process.env.CODEX_HUD_CODEX_BIN || 'codex';
  if (command === 'preview') {
    process.stdout.write(preview(selection));
    return 0;
  }
  if (command === 'config') {
    process.stdout.write(`[tui]\nstatus_line = ${JSON.stringify(fields)}\n`);
    return 0;
  }
  if (command === 'doctor') {
    process.stdout.write(`Node: ${process.version}\nCodex executable: ${executable}\nPreset: ${settings.preset ?? 'custom'}\nFields: ${fields.join(', ') || '(hidden)'}\nSettings: ${settingsPath()}\n`);
    const result = spawnSync(executable, ['--version'], { encoding: 'utf8', timeout: 10000 });
    if (result.error || result.status !== 0) {
      process.stderr.write(`Codex check failed: ${result.error?.message || result.stderr}\n`);
      return 1;
    }
    process.stdout.write(result.stdout);
    process.stdout.write('Reference version: 0.164.0. Verify /statusline on other versions.\n');
    return 0;
  }
  // No shell: prompts, paths and config values are forwarded as individual argv entries.
  const result = spawnSync(executable, buildArgs(selection, forwarded), { stdio: 'inherit' });
  if (result.error) {
    process.stderr.write(`Cannot start Codex: ${result.error.message}\nInstall Codex CLI or set CODEX_HUD_CODEX_BIN.\n`);
    return 1;
  }
  return result.status ?? (128 + (constants.signals[result.signal] || 1));
}

try {
  process.exitCode = run();
} catch (error) {
  process.stderr.write(`codex-hud: ${error.message}\n`);
  process.exitCode = 2;
}
