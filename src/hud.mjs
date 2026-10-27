// Identifiers checked against Codex CLI 0.164.0 status_line_setup.rs.
// Order matters: put the most useful fields first for narrow terminals.
export const presets = Object.freeze({
  compact: ['model-with-reasoning', 'context-used', 'five-hour-limit', 'weekly-limit', 'run-state'],
  balanced: ['model-with-reasoning', 'project-name', 'git-branch', 'context-used', 'five-hour-limit', 'weekly-limit', 'run-state', 'task-progress'],
  full: ['model-with-reasoning', 'project-name', 'git-branch', 'context-used', 'context-window-size', 'five-hour-limit', 'weekly-limit', 'run-state', 'task-progress', 'used-tokens', 'total-input-tokens', 'total-output-tokens'],
});

export const fieldExamples = Object.freeze({
  'model-with-reasoning': 'MODEL · high',
  'project-name': 'my-project',
  'git-branch': 'main',
  'context-used': 'context 24%',
  'context-window-size': 'window 200k',
  'five-hour-limit': '5h 82% left',
  'weekly-limit': 'week 67% left',
  'run-state': 'Working',
  'task-progress': 'tasks 2/5',
  'used-tokens': 'tokens 48k',
  'total-input-tokens': 'in 40k',
  'total-output-tokens': 'out 8k',
});

export function validateFields(fields) {
  if (!Array.isArray(fields) || fields.some(field => typeof field !== 'string' || !Object.hasOwn(fieldExamples, field))) {
    throw new Error('Unknown HUD fields. Run codex-hud fields for supported identifiers.');
  }
  if (new Set(fields).size !== fields.length) throw new Error('HUD fields must not contain duplicates.');
  return [...fields];
}

export function parseArgs(args) {
  let preset = 'balanced';
  let fields;
  const forwarded = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--') {
      forwarded.push(...args.slice(index + 1));
      break;
    }
    if (arg === '--hud-fields' || arg.startsWith('--hud-fields=')) {
      const value = arg === '--hud-fields' ? args[++index] : arg.slice('--hud-fields='.length);
      if (!value?.trim()) throw new Error('Missing HUD fields. Use comma-separated identifiers or none.');
      fields = value === 'none' ? [] : validateFields(value.split(',').map(field => field.trim()));
    } else if (arg === '--hud-preset') {
      preset = args[++index];
    } else if (arg.startsWith('--hud-preset=')) {
      preset = arg.slice('--hud-preset='.length);
    } else {
      forwarded.push(arg);
    }
  }
  if (!Object.hasOwn(presets, preset)) {
    throw new Error(`Unknown HUD preset: ${preset ?? '(missing)'}. Use compact, balanced, or full.`);
  }
  return { preset, forwarded, ...(fields === undefined ? {} : { fields }) };
}

export function buildArgs(preset, forwarded = []) {
  const fields = Array.isArray(preset) ? validateFields(preset) : (Object.hasOwn(presets, preset) ? presets[preset] : undefined);
  if (!fields) throw new Error(`Unknown HUD preset: ${preset}`);
  return ['-c', `tui.status_line=${JSON.stringify(fields)}`, ...forwarded];
}

export function preview(preset) {
  const fields = Array.isArray(preset) ? validateFields(preset) : (Object.hasOwn(presets, preset) ? presets[preset] : undefined);
  if (!fields) throw new Error(`Unknown HUD preset: ${preset}`);
  return `Codex HUD / ${Array.isArray(preset) ? 'custom' : preset} — example data, not a live session\n${fields.length ? fields.map(item => fieldExamples[item]).join(' | ') : '(status line hidden)'}\n\nActual labels and layout are rendered by Codex CLI. Unavailable fields are omitted.\n`;
}
