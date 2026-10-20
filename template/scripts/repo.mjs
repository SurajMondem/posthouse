// Find the posthouse repo this video belongs to and load its library.
// A video made with `posthouse new` has posthouse.json { root }; the template itself sits inside the repo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const VIDEO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const link = path.join(VIDEO, 'posthouse.json');
export const REPO = fs.existsSync(link) ? JSON.parse(fs.readFileSync(link, 'utf8')).root : path.resolve(VIDEO, '..');

export const lib = (name) => import(pathToFileURL(path.join(REPO, 'lib', name)).href);

export const has = (k) => process.argv.includes(`--${k}`);
export const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
export const readJson = (...p) => JSON.parse(fs.readFileSync(path.join(VIDEO, ...p), 'utf8'));
