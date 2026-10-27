import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseConfig, updateStatusLine } from '../src/native-config.mjs';
import { presets } from '../src/hud.mjs';

test('native config edits preserve unrelated TOML and restore multiline status fields', () => {
  const original = '# keep this comment\nmodel = "test"\n[tui]\n# keep this too\nstatus_line = [\n  "model", # old selection\n  "git-branch",\n]\nscreen_reader_detection_done = true\n[tui.model_availability_nux]\n"test" = 1\n';
  const updated = updateStatusLine(original, presets.balanced);
  assert.match(updated, /# keep this comment/);
  assert.match(updated, /# keep this too/);
  const expected = parseConfig(original);
  expected.tui.status_line = presets.balanced;
  assert.deepEqual(parseConfig(updated), expected);
  for (const text of ['', 'model = "test"\n', '[tui]\nanimations = false\n', 'tui.status_line = ["model"]\nmodel = "test"\n']) {
    assert.deepEqual(parseConfig(updateStatusLine(text, presets.balanced)).tui.status_line, presets.balanced);
  }
  assert.throws(() => updateStatusLine('tui = { status_line = ["model"] }\n', presets.balanced));
  assert.throws(() => updateStatusLine('[tui]\nstatus_line = "bad"\n', presets.balanced));
  assert.throws(() => updateStatusLine('[tui]\nstatus_line = [\n', presets.balanced));
});

test('plugin apply persists native settings and restore retains later unrelated edits', () => {
  const home = mkdtempSync(join(tmpdir(), 'codex-hud-plugin-'));
  const config = join(home, 'config.toml');
  const script = fileURLToPath(new URL('../scripts/configure.mjs', import.meta.url));
  const run = (...args) => spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8', cwd: tmpdir(), env: { ...process.env, CODEX_HOME: home },
  });
  const original = '# user settings\nmodel = "test"\n[tui]\nstatus_line = [\n "model", # original\n]\nanimations = false\n';
  try {
    writeFileSync(config, original);
    assert.equal(run('show').status, 0);
    assert.equal(readdirSync(home).length, 1);
    const apply = run('apply');
    assert.equal(apply.status, 0, apply.stderr);
    assert.deepEqual(parseConfig(readFileSync(config, 'utf8')).tui.status_line.slice(0, 3), ['model-with-reasoning', 'project-name', 'git-branch']);
    assert.equal(readdirSync(home).filter(name => name.includes('backup')).length, 1);
    assert.equal(run('apply').status, 0);
    assert.equal(readdirSync(home).filter(name => name.includes('backup')).length, 1);
    assert.equal(run('apply', '--fields', 'model-with-reasoning,project-name,git-branch,context-used').status, 0);
    assert.equal(run('apply', '--fields', 'unknown').status, 1);
    assert.equal(run('apply', '--graph').status, 1);
    assert.equal(run('apply', '--fields', 'none').status, 0);
    assert.deepEqual(parseConfig(readFileSync(config, 'utf8')).tui.status_line, []);
    writeFileSync(config, `${readFileSync(config, 'utf8')}\n[history]\nmax_bytes = 1000\n`);
    const restore = run('restore');
    assert.equal(restore.status, 0, restore.stderr);
    const restored = readFileSync(config, 'utf8');
    assert.match(restored, /"model", # original/);
    assert.equal(parseConfig(restored).history.max_bytes, 1000);
    assert.equal(parseConfig(restored).tui.animations, false);
    assert.match(run('restore').stdout, /No saved HUD/);
    assert.equal(run('apply').status, 0);
    writeFileSync(config, readFileSync(config, 'utf8').replace(JSON.stringify(presets.balanced), '["git-branch"]'));
    const refused = run('restore');
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /Preserving your newer setting/);
    assert.deepEqual(parseConfig(readFileSync(config, 'utf8')).tui.status_line, ['git-branch']);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('fresh setup and restore remove only the added status-line key', () => {
  const home = mkdtempSync(join(tmpdir(), 'codex-hud-fresh-'));
  const script = fileURLToPath(new URL('../scripts/configure.mjs', import.meta.url));
  const run = action => spawnSync(process.execPath, [script, action], { encoding: 'utf8', env: { ...process.env, CODEX_HOME: home } });
  try {
    assert.equal(run('apply').status, 0);
    assert.equal(run('restore').status, 0);
    assert.equal(parseConfig(readFileSync(join(home, 'config.toml'), 'utf8')).tui.status_line, undefined);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
