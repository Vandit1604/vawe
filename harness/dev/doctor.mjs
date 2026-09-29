#!/usr/bin/env node
// vawe doctor: check every outside tool a render needs and print the install line for each missing one.
// Exit 1 only when a required tool is missing. --quiet prints problems only (postinstall uses it).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const quiet = process.argv.includes('--quiet');

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
  return r.error || r.status !== 0 ? null : `${r.stdout}${r.stderr}`;
};
const firstLine = (text) => text.split('\n')[0].trim();
const found = (version) => ({ ok: true, version });
const lacks = (why) => ({ ok: false, why });

function probeBinary(cmd, flag = '-version') {
  const out = run(cmd, [flag]);
  return out ? found(firstLine(out)) : lacks(`${cmd} not on PATH`);
}

function probeFfmpeg() {
  const base = probeBinary('ffmpeg');
  if (!base.ok) return base;
  const filters = run('ffmpeg', ['-hide_banner', '-filters']) || '';
  const encoders = run('ffmpeg', ['-hide_banner', '-encoders']) || '';
  const missing = [!/\sdrawtext\s/.test(filters) && 'drawtext filter', !/\slibx264\s/.test(encoders) && 'libx264 encoder'].filter(Boolean);
  return missing.length ? lacks(`this ffmpeg build has no ${missing.join(' and ')}`) : base;
}

async function probeChrome() {
  try {
    const { default: puppeteer } = await import('puppeteer');
    const exe = puppeteer.executablePath();
    return fs.existsSync(exe) ? found(exe) : lacks('puppeteer has no Chrome download');
  } catch { return lacks('puppeteer is not installed'); }
}

function probeNode() {
  const major = Number(process.versions.node.split('.')[0]);
  return major >= 22 ? found(process.version) : lacks(`found ${process.version}, need 22 or newer`);
}

const probeFile = (rel, dir = false) => () => {
  const p = path.join(ROOT, rel);
  const ok = dir ? fs.existsSync(p) && fs.readdirSync(p).length > 0 : fs.existsSync(p);
  return ok ? found(rel) : lacks(`${rel} is missing`);
};

// pkg: package name per manager key (see MANAGERS). fix: a plain command when no package manager applies.
const TOOLS = [
  { name: 'node 22+', required: true, probe: probeNode, pkg: { brew: 'node', apt: 'nodejs', dnf: 'nodejs', pacman: 'nodejs', apk: 'nodejs', zypper: 'nodejs22', winget: 'OpenJS.NodeJS.LTS', choco: 'nodejs-lts' } },
  { name: 'git', required: true, probe: () => probeBinary('git', '--version'), pkg: { brew: 'git', apt: 'git', dnf: 'git', pacman: 'git', apk: 'git', zypper: 'git', winget: 'Git.Git', choco: 'git' } },
  { name: 'ffmpeg (libx264, drawtext)', required: true, probe: probeFfmpeg, pkg: { brew: 'ffmpeg', apt: 'ffmpeg', dnf: 'ffmpeg (needs the RPM Fusion repo)', pacman: 'ffmpeg', apk: 'ffmpeg', zypper: 'ffmpeg', winget: 'Gyan.FFmpeg', choco: 'ffmpeg' } },
  { name: 'ffprobe', required: true, probe: () => probeBinary('ffprobe'), pkg: { brew: 'ffmpeg', apt: 'ffmpeg', dnf: 'ffmpeg', pacman: 'ffmpeg', apk: 'ffmpeg', zypper: 'ffmpeg', winget: 'Gyan.FFmpeg', choco: 'ffmpeg' } },
  { name: 'tesseract (optional, OCR for spec and coverage --text)', required: false, probe: () => probeBinary('tesseract', '--version'), pkg: { brew: 'tesseract', apt: 'tesseract-ocr', dnf: 'tesseract', pacman: 'tesseract tesseract-data-eng', apk: 'tesseract-ocr', zypper: 'tesseract-ocr', winget: 'UB-Mannheim.TesseractOCR', choco: 'tesseract' } },
  { name: 'puppeteer Chrome', required: true, probe: probeChrome, fix: 'npm install, then npx puppeteer browsers install chrome' },
  { name: 'assets/vendor/gsap.min.js', required: true, probe: probeFile('assets/vendor/gsap.min.js'), fix: 'npm install (its postinstall copies gsap)' },
  { name: 'assets/fonts', required: true, probe: probeFile('assets/fonts', true), fix: 'git checkout -- assets/fonts, or node generators/media/fonts.mjs' },
];

// cmd is the install prefix. winget and choco take a package id, the others a package list.
const MANAGERS = {
  brew: { label: 'macOS (Homebrew)', cmd: 'brew install' },
  apt: { label: 'Debian or Ubuntu', cmd: 'sudo apt install -y' },
  dnf: { label: 'Fedora or RHEL', cmd: 'sudo dnf install -y' },
  pacman: { label: 'Arch', cmd: 'sudo pacman -S --needed' },
  apk: { label: 'Alpine', cmd: 'sudo apk add' },
  zypper: { label: 'openSUSE', cmd: 'sudo zypper install -y' },
  winget: { label: 'Windows (winget)', cmd: 'winget install -e --id' },
};
const LINUX_FAMILY = { debian: 'apt', ubuntu: 'apt', fedora: 'dnf', rhel: 'dnf', centos: 'dnf', arch: 'pacman', alpine: 'apk', suse: 'zypper', opensuse: 'zypper' };

function detectOs() {
  if (process.platform === 'darwin') return { label: 'macOS', manager: 'brew' };
  if (process.platform === 'win32') return { label: 'Windows', manager: 'winget' };
  let release = '';
  try { release = fs.readFileSync('/etc/os-release', 'utf8'); } catch { /* no os-release: unknown distro */ }
  const field = (key) => (release.match(new RegExp(`^${key}=("?)(.*)\\1$`, 'm')) || [])[2] || '';
  const ids = `${field('ID')} ${field('ID_LIKE')}`.toLowerCase().split(/\s+/);
  const family = ids.find((id) => LINUX_FAMILY[id]);
  return { label: field('ID') ? `Linux (${field('ID')})` : 'Linux', manager: family ? LINUX_FAMILY[family] : null };
}

function installLine(tool, os) {
  if (tool.fix) return tool.fix;
  if (!os.manager) return `install: ${Object.values(tool.pkg).filter((v, i, a) => a.indexOf(v) === i).join(' | ')} (package names vary by distro)`;
  return `${MANAGERS[os.manager].cmd} ${tool.pkg[os.manager]}`;
}

const os = detectOs();
const results = [];
for (const tool of TOOLS) results.push({ tool, ...(await tool.probe()) });

if (!quiet) console.log(`vawe doctor on ${os.label} (${process.platform} ${process.arch})`);
for (const { tool, ok, version, why } of results) {
  if (ok && !quiet) console.log(`  ok       ${tool.name}: ${version}`);
  if (!ok) {
    console.log(`  ${tool.required ? 'MISSING ' : 'optional'} ${tool.name}: ${why}`);
    console.log(`           fix: ${installLine(tool, os)}`);
  }
}

const blocked = results.filter((r) => !r.ok && r.tool.required);
if (!quiet) console.log(blocked.length ? `\n${blocked.length} required tool(s) missing.` : '\nAll required tools found.');
process.exit(blocked.length ? 1 : 0);
