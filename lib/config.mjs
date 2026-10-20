// Config: posthouse.config.json (committed defaults) ← posthouse.config.local.json (yours, git-ignored) ← overrides.
// Secrets never live here: API keys come from the environment or a git-ignored .env file at the repo root.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

export function merge(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = merge(base[k], v);
  return out;
}

const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {});

// Load .env once (Node ≥ 20.12). Variables already set in the shell win.
export function loadEnv(root = ROOT) {
  const file = path.join(root, '.env');
  if (fs.existsSync(file) && typeof process.loadEnvFile === 'function') {
    try { process.loadEnvFile(file); } catch {}
  }
}

export function loadConfig(root = ROOT, overrides = {}) {
  loadEnv(root);
  const strip = ({ $comment, ...rest }) => rest;
  const config = merge(merge(strip(readJson(path.join(root, 'posthouse.config.json'))), strip(readJson(path.join(root, 'posthouse.config.local.json')))), overrides);
  config.root = root;
  config.tasteDir = path.resolve(root, config.taste ?? 'taste');
  return config;
}

// "auto" picks the voice that works with nothing installed: macOS `say`, else silent.
export function providerName(config, wanted) {
  const name = wanted ?? config.voice?.provider ?? 'auto';
  if (name !== 'auto') return name;
  return process.platform === 'darwin' ? 'say' : 'none';
}
