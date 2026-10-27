import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { presets, validateFields } from './hud.mjs';

export function settingsPath(env = process.env) {
  return env.CODEX_HUD_CONFIG || join(env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'codex-hud', 'config.json');
}

export function validateSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('Expected a settings object.');
  if (Object.keys(settings).some(key => !['preset', 'fields'].includes(key))) throw new Error('Settings support only preset or fields.');
  if (Object.hasOwn(settings, 'fields')) {
    if (Object.hasOwn(settings, 'preset')) throw new Error('Save either preset or fields, not both.');
    return { fields: validateFields(settings.fields) };
  }
  if (!Object.hasOwn(presets, settings.preset)) throw new Error('Invalid saved HUD preset.');
  return { preset: settings.preset };
}

export function readSettings(path = settingsPath()) {
  try {
    return validateSettings(JSON.parse(readFileSync(path, 'utf8')));
  } catch (error) {
    if (error.code === 'ENOENT') return { preset: 'balanced' };
    throw new Error(`Cannot read HUD settings at ${path}: ${error.message}. Use settings reset to restore defaults.`);
  }
}

export function saveSettings(settings, path = settingsPath()) {
  const content = `${JSON.stringify(validateSettings(settings), null, 2)}\n`;
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(temporary, content, { flag: 'wx', mode: 0o600 });
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export function resetSettings(path = settingsPath()) {
  rmSync(path, { force: true });
}

export function resolveSettings(args, parsed, read = readSettings) {
  const boundary = args.indexOf('--');
  const ownArgs = boundary === -1 ? args : args.slice(0, boundary);
  const explicit = ownArgs.some(arg => arg === '--hud-preset' || arg.startsWith('--hud-preset=') || arg === '--hud-fields' || arg.startsWith('--hud-fields='));
  // Explicit options can also recover from an invalid saved configuration.
  if (!explicit) return read();
  return parsed.fields === undefined ? { preset: parsed.preset } : { fields: parsed.fields };
}
