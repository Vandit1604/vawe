// A time-capped scene command (perl -e 'alarm ...' exec) SIGTERMs the node process and used to leave
// Chrome running behind it, because a killed process never reaches its own browser.close(). This
// spawns a real child process that launches a page through launchPage, sends it SIGTERM, and asserts
// the Chrome it started is gone afterwards.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function chromeChildrenOf(pid) {
  try {
    return execSync(`pgrep -P ${pid} -f -a chrome 2>/dev/null || true`, { encoding: 'utf8' })
      .split('\n').filter(Boolean);
  } catch { return []; }
}

test('SIGTERM to a launchPage() caller closes its Chrome child', { timeout: 30000, skip: process.platform === 'win32' && 'needs pgrep' }, async () => {
  const script = `
    import { launchPage } from '${path.join(repoRoot, 'harness/lib/render-harness.mjs')}';
    const { page } = await launchPage({ width: 320, height: 240 });
    await page.goto('about:blank');
    console.log('READY ' + process.pid);
  `;
  const child = spawn(process.execPath, ['--input-type=module', '-e', script], { stdio: ['ignore', 'pipe', 'inherit'] });

  const pid = await new Promise((resolve, reject) => {
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d.toString();
      const m = buf.match(/READY (\d+)/);
      if (m) resolve(Number(m[1]));
    });
    child.on('exit', (code) => reject(new Error(`child exited early (${code}) before READY: ${buf}`)));
  });

  const before = chromeChildrenOf(pid);
  assert.ok(before.length > 0, 'expected the child to have launched a Chrome process');

  process.kill(pid, 'SIGTERM');
  await new Promise((resolve) => child.on('exit', resolve));
  await new Promise((resolve) => setTimeout(resolve, 500)); // let the OS reap the child

  const after = chromeChildrenOf(pid);
  assert.deepEqual(after, [], `Chrome still running after SIGTERM: ${after.join(' | ')}`);
});
