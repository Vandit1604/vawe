// studio/chat.mjs: the studio's chat sidebar backend. One prompt in, a headless `claude -p` run's output
// out as Server-Sent Events; --resume keeps one conversation until `reset`. One run at a time.
import { spawn } from 'node:child_process';

const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };

// tools: the --allowedTools string. context: (prompt) => system prompt text appended to the run.
export function chatRoutes({ cwd, tools, context }) {
  let job = null;
  let sessionId = null;
  const stop = () => { if (job) { try { job.kill(); } catch { /* already gone */ } job = null; } };

  return (req, res, url) => {
    if (req.method === 'POST' && url === '/api/chat/stop') { stop(); json(res, 200, { ok: true }); return true; }
    if (!(req.method === 'POST' && url === '/api/chat')) return false;
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on('end', () => {
      let prompt = '', reset = false;
      try { const q = JSON.parse(raw || '{}'); prompt = String(q.prompt || '').trim(); reset = !!q.reset; } catch { /* empty prompt below */ }
      if (reset) sessionId = null;
      if (!prompt) return json(res, 400, { ok: false, error: 'empty prompt' });
      if (job) return json(res, 409, { ok: false, error: 'a chat run is already going' });
      const args = ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--model', 'sonnet',
        '--allowedTools', tools, '--append-system-prompt', context(prompt)];
      if (sessionId) args.push('--resume', sessionId);
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      const child = spawn('claude', args, { cwd });
      job = child;
      let buf = '', stderr = '';
      child.stdout.on('data', (chunk) => {
        buf += chunk;
        let idx;
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (!line.trim()) continue;
          let msg; try { msg = JSON.parse(line); } catch { continue; }
          if (msg.session_id) sessionId = msg.session_id;
          if (msg.type === 'assistant') {
            const text = (msg.message?.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
            if (text) send('text', { text });
          } else if (msg.type === 'result') {
            send('result', { result: msg.result, isError: !!msg.is_error });
          }
        }
      });
      child.stderr.on('data', (c) => { stderr += c; });
      child.on('error', (e) => { job = null; send('done', { code: null, error: e.code === 'ENOENT' ? 'not-found' : e.message }); res.end(); });
      child.on('close', (code) => { job = null; send('done', { code, error: code !== 0 ? stderr.trim().slice(0, 500) : null }); res.end(); });
      // res, not req: req closes when the small POST body is read, which would kill the child at once.
      res.on('close', () => { if (job === child) stop(); });
    });
    return true;
  };
}
