// Voice providers. Each module exports:
//   name, words ('exact' | 'aligned' | 'estimate'), describe(opts), check(opts) → { ok, detail, fix? },
//   speak({ text, previousText, nextText, out, opts }) → { wav | null, words?, duration? },
//   optional: list(opts) → [{ id, name, note }], estimate(texts, opts) → { line, blocked }.
// Adding a provider = one file here + one entry below + a section in docs/voices.md.
const PROVIDERS = {
  elevenlabs: () => import('./elevenlabs.mjs'),
  say: () => import('./say.mjs'),
  kokoro: () => import('./kokoro.mjs'),
  command: () => import('./command.mjs'),
  none: () => import('./none.mjs'),
};

export const providerNames = Object.keys(PROVIDERS);

export async function loadProvider(name) {
  if (!PROVIDERS[name]) throw new Error(`unknown voice provider "${name}". Use one of: ${providerNames.join(', ')} (or "auto").`);
  return PROVIDERS[name]();
}
