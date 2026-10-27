import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildArgs, parseArgs, presets, preview } from '../src/hud.mjs';
import { settingsPath } from '../src/settings.mjs';

test('default and explicit presets preserve Codex arguments', () => {
  assert.deepEqual(parseArgs(['resume', '--last']), { preset: 'balanced', forwarded: ['resume', '--last'] });
  assert.deepEqual(parseArgs(['--hud-preset=compact', '-C', '/a path']), { preset: 'compact', forwarded: ['-C', '/a path'] });
  assert.deepEqual(parseArgs(['--hud-preset', 'full', '--', '--hud-preset', 'literal']), { preset: 'full', forwarded: ['--hud-preset', 'literal'] });
  assert.throws(() => parseArgs(['--hud-preset']), /Unknown HUD preset/);
  assert.throws(() => parseArgs(['--hud-preset=toString']), /Unknown HUD preset/);
});

test('footer config uses known ordered identifiers', () => {
  assert.throws(() => buildArgs('toString'), /Unknown HUD preset/);
  assert.throws(() => preview('toString'), /Unknown HUD preset/);
  for (const [name, fields] of Object.entries(presets)) {
    const args = buildArgs(name, ['resume', '--last']);
    assert.equal(args[0], '-c');
    assert.deepEqual(JSON.parse(args[1].split('=', 2)[1]), fields);
    assert.deepEqual(args.slice(2), ['resume', '--last']);
    assert.equal(new Set(fields).size, fields.length);
    assert.equal(fields[0], 'model-with-reasoning');
  }
});

test('custom fields validate identifiers, order and literal argument boundaries', () => {
  const fields = ['model-with-reasoning', 'project-name', 'git-branch', 'context-used'];
  assert.deepEqual(parseArgs(['--hud-fields', fields.join(',')]).fields, fields);
  assert.deepEqual(parseArgs(['--hud-fields=none']).fields, []);
  assert.deepEqual(parseArgs(['--', '--hud-fields=none']).forwarded, ['--hud-fields=none']);
  assert.equal(parseArgs(['--', '--hud-fields=none']).fields, undefined);
  assert.deepEqual(JSON.parse(buildArgs(fields)[1].slice('tui.status_line='.length)), fields);
  assert.match(preview(fields), /MODEL · high \| my-project \| main \| context 24%/);
  for (const value of ['', 'toString', 'context-used,context-used', 'context-used,', 'none,context-used']) {
    assert.throws(() => parseArgs([`--hud-fields=${value}`]));
  }
  assert.throws(() => parseArgs(['--hud-fields']));
});

test('settings location supports XDG and an explicit file override', () => {
  assert.equal(settingsPath({ XDG_CONFIG_HOME: '/tmp/config' }), '/tmp/config/codex-hud/config.json');
  assert.equal(settingsPath({ XDG_CONFIG_HOME: '/ignored', CODEX_HUD_CONFIG: '/tmp/custom.json' }), '/tmp/custom.json');
});

test('saved fields persist across invocations, options override defaults, and reset recovers corrupt settings', () => {
  const directory = mkdtempSync(join(tmpdir(), 'codex-hud-settings-'));
  const path = join(directory, 'nested', 'config.json');
  const executable = join(directory, 'fake-codex');
  const cli = fileURLToPath(new URL('../bin/codex-hud.mjs', import.meta.url));
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8', env: { ...process.env, CODEX_HUD_CONFIG: path, CODEX_HUD_CODEX_BIN: executable },
  });
  try {
    writeFileSync(executable, `#!${process.execPath}\nconsole.log(JSON.stringify(process.argv.slice(2)));\n`, { mode: 0o755 });
    assert.match(run('config').stdout, /model-with-reasoning/);
    assert.equal(existsSync(path), false);
    assert.equal(run('settings', 'save', '--hud-fields', 'project-name,git-branch,context-used').status, 0);
    const fields = ['project-name', 'git-branch', 'context-used'];
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), { fields });
    assert.match(run('config').stdout, /\["project-name","git-branch","context-used"\]/);
    assert.deepEqual(JSON.parse(run('--', '--hud-fields=none').stdout), buildArgs(fields, ['--hud-fields=none']));
    assert.match(run('preview').stdout, /my-project \| main \| context 24%/);
    assert.match(run('settings', 'show').stdout, /project-name/);
    assert.deepEqual(JSON.parse(run('--hud-preset', 'compact', 'resume', '--last').stdout), buildArgs('compact', ['resume', '--last']));
    assert.deepEqual(JSON.parse(run('--hud-preset', 'full', '--hud-fields=none').stdout), buildArgs([]));
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), { fields });
    assert.equal(run('settings', 'save', '--hud-fields=unknown').status, 2);
    assert.equal(run('settings', 'save', 'unexpected').status, 2);
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), { fields });
    assert.equal(run('settings', 'save', '--hud-preset=compact').status, 0);
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), { preset: 'compact' });
    assert.equal(run('settings', 'save', '--hud-fields=none').status, 0);
    assert.match(run('config').stdout, /status_line = \[\]/);
    writeFileSync(path, '{broken');
    assert.equal(run('config').status, 2);
    assert.equal(run('fields').status, 0);
    assert.equal(run('config', '--hud-preset=full').status, 0);
    assert.equal(run('settings', 'reset', 'unexpected').status, 2);
    assert.equal(existsSync(path), true);
    assert.equal(run('settings', 'reset').status, 0);
    assert.equal(existsSync(path), false);
    assert.match(run('settings', 'show').stdout, /balanced/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('launcher preserves prompt text, cwd and child exit code without a shell', () => {
  const directory = mkdtempSync(join(tmpdir(), 'codex-hud-test-'));
  try {
    const executable = join(directory, 'fake-codex');
    writeFileSync(executable, `#!${process.execPath}\nconsole.log(JSON.stringify({args:process.argv.slice(2),cwd:process.cwd()}));process.exit(7);\n`, { mode: 0o755 });
    const prompt = 'literal $(touch unwanted) `echo nope` "hello"\nnew line';
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('../bin/codex-hud.mjs', import.meta.url)), '--hud-preset', 'compact', '--', prompt], {
      cwd: directory, encoding: 'utf8', env: { ...process.env, CODEX_HUD_CODEX_BIN: executable },
    });
    assert.equal(result.status, 7, result.stderr);
    const captured = JSON.parse(result.stdout);
    assert.deepEqual(captured.args, buildArgs('compact', [prompt]));
    assert.equal(captured.cwd, realpathSync(directory));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
