import { brief } from './redact.mjs';
import { commandVerbs, docsRead, filmWrites, footersOf, namedVerbs, newFilm, nextNamed, rawTools, resultFlags, textOf } from './calls.mjs';

const stampOf = (row) => Date.parse(row.timestamp);

function newCall(block, ms, index) {
  const input = block.input ?? {};
  const verbs = block.name === 'Bash' ? commandVerbs(input.command ?? '') : [];
  return {
    index, id: block.id, name: block.name, ms,
    cmd: brief(input.command ?? input.file_path ?? input.pattern ?? input.skill ?? input.description ?? '', 200),
    verbs,
    raw: block.name === 'Bash' ? rawTools(input.command ?? '', verbs.length > 0) : [],
    docs: docsRead(block.name, input),
    writes: filmWrites(block.name, input),
    newFilm: newFilm(verbs),
    unattended: /VAWE_UNATTENDED=1/.test(input.command ?? ''),
    label: (input.command ?? '').match(/VAWE_AGENT=(\S+)/)?.[1] ?? null,
  };
}

function settle(call, block, ms) {
  const text = textOf(block.content);
  call.resultMs = ms;
  call.chars = text.length;
  call.flags = resultFlags(text, block.is_error);
  call.footers = footersOf(text);
  call.next = call.verbs.length ? nextNamed(text) : [];
  call.lastLine = brief(text.split('\n').filter(Boolean).at(-1) ?? '', 160);
}

function noteAttachment(fold, attachment) {
  const call = fold.byId.get(attachment.toolUseID);
  if (attachment.type === 'hook_blocking_error') {
    if (call) call.blockedByHook = brief(attachment.blockingError?.blockingError ?? '', 160);
    fold.hookBlocks += call ? 0 : 1;
  } else if (attachment.type === 'hook_non_blocking_error') {
    fold.hookErrors += 1;
  } else if (attachment.type === 'hook_additional_context') {
    const text = [].concat(attachment.content ?? []).join(' ');
    fold.hints.push({ source: attachment.hookName ?? attachment.hookEvent ?? '?', afterCall: call ? call.index : fold.calls.length - 1, text: brief(text, 220), named: namedVerbs(text) });
  }
}

const META_KEYS = { session: 'sessionId', agent: 'agentId', cwd: 'cwd', branch: 'gitBranch', version: 'version' };

const IDLE_GAP_MS = 10 * 60 * 1000;

function noteMeta(meta, row, ms) {
  if (!Number.isNaN(ms)) {
    if (meta.lastMs !== undefined && ms - meta.lastMs < IDLE_GAP_MS) meta.activeMs = (meta.activeMs ?? 0) + Math.max(0, ms - meta.lastMs);
    meta.lastMs = ms;
    meta.startMs = Math.min(meta.startMs ?? ms, ms);
    meta.endMs = Math.max(meta.endMs ?? ms, ms);
  }
  for (const [key, field] of Object.entries(META_KEYS)) meta[key] ??= row[field];
}

function noteMessage(fold, row, ms) {
  const { message } = row;
  if (row.type === 'assistant') {
    if (message.model && message.model !== '<synthetic>') fold.meta.models.add(message.model);
    if (message.usage) fold.usage.set(message.id ?? row.uuid, message.usage);
  }
  for (const block of Array.isArray(message.content) ? message.content : []) {
    if (block.type === 'tool_use') {
      const call = newCall(block, ms, fold.calls.length);
      fold.calls.push(call);
      fold.byId.set(block.id, call);
    } else if (block.type === 'tool_result' && fold.byId.has(block.tool_use_id)) {
      settle(fold.byId.get(block.tool_use_id), block, ms);
    }
  }
}

/** Reads the rows of one transcript into the raw record the analysers use: meta, calls (no result text kept), hints, tokens. */
export async function foldRows(rows) {
  const fold = { meta: { models: new Set() }, calls: [], byId: new Map(), hints: [], hookErrors: 0, hookBlocks: 0, usage: new Map() };
  for await (const row of rows) {
    const ms = stampOf(row);
    noteMeta(fold.meta, row, ms);
    if (row.type === 'attachment' && row.attachment) noteAttachment(fold, row.attachment);
    else if (row.message) noteMessage(fold, row, ms);
  }
  return fold;
}
