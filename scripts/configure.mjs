#!/usr/bin/env node
import { closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fieldExamples, parseArgs, presets } from '../src/hud.mjs';
import { parseConfig, statusAssignment, updateStatusLine } from '../src/native-config.mjs';

const help = `Codex HUD plugin configuration

  node scripts/configure.mjs apply [--preset compact|balanced|full]
  node scripts/configure.mjs apply --fields model-with-reasoning,project-name,git-branch,context-used
  node scripts/configure.mjs show
  node scripts/configure.mjs fields
  node scripts/configure.mjs restore

Uses CODEX_HOME/config.toml (default ~/.codex/config.toml).
Changes take effect on the next Codex CLI launch. No custom renderer or layout options.
`;

function readOptional(path) {
  try { return readFileSync(path, 'utf8'); } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function atomicWrite(path, text, mode = 0o600) {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, text, { flag: 'wx', mode });
  try { renameSync(temporary, path); } finally { rmSync(temporary, { force: true }); }
}

function run() {
  const [action = 'show', ...args] = process.argv.slice(2);
  if (action === '--help') { process.stdout.write(help); return; }
  if (!['show', 'fields', 'apply', 'restore'].includes(action)) throw new Error(help);
  if (action !== 'apply' && args.length) throw new Error(help);
  if (action === 'fields') {
    process.stdout.write(`${Object.keys(fieldExamples).join('\n')}\nnone (hide status line)\n`);
    return;
  }
  const parsed = parseArgs(args.map(arg => arg.replace(/^--(preset|fields)(?==|$)/, '--hud-$1')));
  if (parsed.forwarded.length) throw new Error('Unsupported option. Only --preset and --fields are accepted.');
  const fields = parsed.fields ?? presets[parsed.preset];
  const home = process.env.CODEX_HOME || join(homedir(), '.codex');
  const config = join(home, 'config.toml');
  const statePath = join(home, 'codex-hud-state.json');
  if (existsSync(config) && lstatSync(config).isSymbolicLink()) throw new Error(`Refusing to replace symlink: ${config}`);
  const original = readOptional(config) ?? '';
  const currentFields = parseConfig(original).tui?.status_line;
  const stateText = readOptional(statePath);
  const state = stateText === null ? null : JSON.parse(stateText);
  if (state && (state.version !== 1 || !Array.isArray(state.appliedFields) || !(state.previousFields === null || Array.isArray(state.previousFields)) || !(state.previousAssignment === null || typeof state.previousAssignment === 'string'))) {
    throw new Error(`Invalid restoration state: ${statePath}`);
  }
  if (action === 'show') {
    process.stdout.write(`${JSON.stringify({ config, fields: currentFields ?? null, managed: state !== null }, null, 2)}\n`);
    return;
  }
  if (action === 'restore' && !state) { process.stdout.write('No saved HUD setup to restore.\n'); return; }
  if (action === 'restore' && !isDeepStrictEqual(currentFields, state.appliedFields)) {
    throw new Error('Status line changed after setup. Preserving your newer setting; restoration was not applied.');
  }
  const selection = action === 'restore' ? state.previousFields : fields;
  const updated = updateStatusLine(original, selection, action === 'restore' ? state.previousAssignment : null);
  const nextState = {
    version: 1,
    previousFields: state ? state.previousFields : (currentFields ?? null),
    previousAssignment: state ? state.previousAssignment : (statusAssignment(original)?.raw ?? null),
    appliedFields: fields,
  };
  mkdirSync(home, { recursive: true });
  const lock = join(home, 'codex-hud.lock');
  const descriptor = openSync(lock, 'wx', 0o600);
  let backup = null;
  try {
    if ((readOptional(config) ?? '') !== original || readOptional(statePath) !== stateText) throw new Error('Configuration changed during setup; retry.');
    if (updated !== original) {
      if (existsSync(config)) {
        backup = `${config}.codex-hud-backup-${Date.now()}-${process.pid}`;
        writeFileSync(backup, original, { flag: 'wx', mode: 0o600 });
      }
      atomicWrite(config, updated, existsSync(config) ? (lstatSync(config).mode & 0o777) : 0o600);
    }
    try {
      if (action === 'restore') rmSync(statePath, { force: true });
      else atomicWrite(statePath, `${JSON.stringify(nextState, null, 2)}\n`);
    } catch (error) {
      if ((readOptional(config) ?? '') === updated && updated !== original) atomicWrite(config, original);
      throw error;
    }
  } finally {
    closeSync(descriptor);
    rmSync(lock, { force: true });
  }
  process.stdout.write(`${action === 'restore' ? 'Restored previous status line' : 'Applied Codex HUD'}: ${config}\n`);
  if (backup) process.stdout.write(`Backup: ${backup}\n`);
  process.stdout.write(`${JSON.stringify(selection)}\nEffective on next Codex CLI launch.\n`);
}

try { run(); } catch (error) {
  process.stderr.write(`codex-hud: ${error.message}\n`);
  process.exitCode = 1;
}
