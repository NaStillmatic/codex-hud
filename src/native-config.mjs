import { isDeepStrictEqual } from 'node:util';
import toml from '../vendor/smol-toml/index.cjs';

export function parseConfig(text) {
  return toml.parse(text);
}

// Locate an assignment without reserializing the user's entire TOML file.
// Every edit is parsed and compared below, so unsupported syntax fails closed.
export function statusAssignment(text) {
  const parsed = parseConfig(text);
  if (parsed.tui?.status_line === undefined) return null;
  if (!Array.isArray(parsed.tui.status_line) || parsed.tui.status_line.some(value => typeof value !== 'string')) {
    throw new Error('tui.status_line must be an array of strings.');
  }
  const table = /^[ \t]*\[[ \t]*(?:tui|"tui"|'tui')[ \t]*\][ \t]*(?:#.*)?$/m.exec(text);
  const start = table ? table.index + table[0].length : 0;
  const tail = text.slice(start);
  const nextTable = /^[ \t]*\[/m.exec(tail);
  const end = nextTable ? start + nextTable.index : text.length;
  const key = table ? '(?:status_line|"status_line"|\'status_line\')' : 'tui\\.status_line';
  const match = new RegExp(`^[ \\t]*${key}[ \\t]*=[ \\t]*\\[`, 'm').exec(text.slice(start, end));
  if (!match) throw new Error('Unsupported status-line TOML layout. Use /statusline or a plain [tui] table.');
  const offset = start + match.index;
  let quote = null;
  let comment = false;
  let escaped = false;
  for (let index = offset + match[0].length; index < text.length; index += 1) {
    const char = text[index];
    if (comment) {
      if (char === '\n') comment = false;
    } else if (quote) {
      if (escaped) escaped = false;
      else if (quote === '"' && char === '\\') escaped = true;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '#') comment = true;
    else if (char === ']') {
      const lineEnd = text.indexOf('\n', index);
      const finish = lineEnd === -1 ? text.length : lineEnd + 1;
      return { start: offset, end: finish, raw: text.slice(offset, finish), dotted: !table };
    }
  }
  throw new Error('Cannot locate the end of tui.status_line.');
}

export function updateStatusLine(text, fields, originalAssignment = null) {
  const before = parseConfig(text);
  const span = statusAssignment(text);
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  let updated;
  if (span) {
    let replacement = fields === null ? '' : `${span.dotted ? 'tui.' : ''}status_line = ${JSON.stringify(fields)}${newline}`;
    if (originalAssignment !== null) {
      // Dotted and table assignments can differ if the user reorganized config.
      replacement = originalAssignment.replace(/^(\s*)(?:tui\.)?(status_line|"status_line"|'status_line')/, `$1${span.dotted ? 'tui.' : ''}$2`);
      if (!replacement.endsWith('\n')) replacement += newline;
    }
    updated = text.slice(0, span.start) + replacement + text.slice(span.end);
  } else if (fields === null) {
    return text;
  } else {
    const table = /^[ \t]*\[[ \t]*(?:tui|"tui"|'tui')[ \t]*\][ \t]*(?:#.*)?$/m.exec(text);
    const assignment = `status_line = ${JSON.stringify(fields)}${newline}`;
    if (table) {
      const offset = table.index + table[0].length;
      updated = `${text.slice(0, offset)}${newline}${assignment}${text.slice(offset)}`;
    } else {
      updated = `${text}${text.endsWith('\n') || !text ? '' : newline}${newline}[tui]${newline}${assignment}`;
    }
  }
  const expected = parseConfig(text);
  if (fields === null) delete expected.tui?.status_line;
  else {
    expected.tui ??= Object.create(null);
    expected.tui.status_line = fields;
  }
  const actual = parseConfig(updated);
  if (!isDeepStrictEqual(expected, actual)) {
    throw new Error('Cannot safely edit this TOML layout; no configuration was changed.');
  }
  if (fields !== null && !isDeepStrictEqual(before.tui?.status_line, fields)) statusAssignment(updated);
  return updated;
}
