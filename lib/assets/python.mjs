// Python model plugins (MusicGen, Stable Audio Open). Each runs in its own venv under ~/.cache/posthouse/venvs/,
// installed only by `posthouse setup <name>`. posthouse calls plugins/<name>/generate.py and reads one JSON line.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { ROOT } from '../config.mjs';
import { which } from '../audio.mjs';

export const HOME = process.env.POSTHOUSE_HOME || path.join(os.homedir(), '.cache', 'posthouse');
export const venvOf = (name) => path.join(HOME, 'venvs', name);
export const pythonOf = (name) => path.join(venvOf(name), process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
export const installed = (name) => fs.existsSync(pythonOf(name));

// A Python ≥ 3.10 to build venvs with.
export function basePython() {
  for (const p of ['python3.12', 'python3.11', 'python3.10', 'python3']) {
    const bin = which(p);
    if (!bin) continue;
    const v = spawnSync(bin, ['-c', 'import sys;print(sys.version_info[:2] >= (3, 10))']).stdout?.toString().trim();
    if (v === 'True') return bin;
  }
  return null;
}

export function install(name) {
  const req = path.join(ROOT, 'plugins', name, 'requirements.txt');
  const py = basePython();
  if (!py) throw new Error('Python 3.10+ is needed. macOS: brew install python@3.12');
  fs.mkdirSync(path.dirname(venvOf(name)), { recursive: true });
  execFileSync(py, ['-m', 'venv', venvOf(name)], { stdio: 'inherit' });
  execFileSync(pythonOf(name), ['-m', 'pip', 'install', '--upgrade', 'pip'], { stdio: 'inherit' });
  execFileSync(pythonOf(name), ['-m', 'pip', 'install', '-r', req], { stdio: 'inherit' });
}

// Hugging Face logins made by older clients live in ~/.huggingface/token; current ones read ~/.cache/huggingface/.
// Point the plugin at the old file when it's the only one (the token itself is never copied or read here).
function hfEnv() {
  if (process.env.HF_TOKEN || process.env.HF_TOKEN_PATH) return {};
  const current = path.join(process.env.HF_HOME || path.join(os.homedir(), '.cache', 'huggingface'), 'token');
  const legacy = path.join(os.homedir(), '.huggingface', 'token');
  return !fs.existsSync(current) && fs.existsSync(legacy) ? { HF_TOKEN_PATH: legacy } : {};
}

export function run(name, args) {
  if (!installed(name)) throw new Error(`${name} is not set up. Run: node bin/posthouse.mjs setup ${name}`);
  const script = path.join(ROOT, 'plugins', name, 'generate.py');
  const r = spawnSync(pythonOf(name), [script, ...args], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ...hfEnv() } });
  const last = r.stdout?.toString().trim().split('\n').pop() ?? '';
  if (r.status !== 0) throw new Error(`${name} failed (exit ${r.status}):\n${r.stderr?.toString().split('\n').slice(-12).join('\n')}`);
  try { return JSON.parse(last); } catch { return {}; }
}
