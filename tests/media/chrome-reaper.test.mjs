// A Chrome whose render process died is killed by the next render; one whose owner lives is left alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { reapOrphanBrowsers } from '../../harness/lib/render-harness.mjs';

const fakeChrome = () => spawn(process.execPath, ['-e', 'setTimeout(()=>{},60000)', 'puppeteer_dev_chrome_profile-test'], { stdio: 'ignore', detached: true });
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const gone = async (pid) => { for (let i = 0; i < 50 && alive(pid); i++) await new Promise((r) => setTimeout(r, 100)); return !alive(pid); };

test('reapOrphanBrowsers kills the Chrome of a dead owner and keeps the Chrome of a live one', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-reap-'));
  const orphan = fakeChrome(), kept = fakeChrome();
  const deadOwner = spawn(process.execPath, ['-e', ''], { stdio: 'ignore' });
  await new Promise((r) => deadOwner.on('exit', r));
  fs.writeFileSync(path.join(dir, String(orphan.pid)), String(deadOwner.pid));
  fs.writeFileSync(path.join(dir, String(kept.pid)), String(process.pid));
  assert.equal(reapOrphanBrowsers(dir), 1);
  assert.ok(await gone(orphan.pid));
  assert.ok(alive(kept.pid));
  assert.deepEqual(fs.readdirSync(dir), [String(kept.pid)]);
  process.kill(-kept.pid, 'SIGKILL');
  fs.rmSync(dir, { recursive: true });
});
