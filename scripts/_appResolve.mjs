// A tiny ESM resolve hook that lets the verify scripts import app modules directly, the way
// Vite does, instead of forcing every testable module to be import-shaped for bare Node.
//
// Two rules, both narrow on purpose:
//   1. EXTENSIONLESS SPECIFIERS. App code writes `import { PATHS } from '../data/constants'`.
//      Node requires the extension; Vite does not. The hook tries `.js` then `.jsx`.
//   2. THE ONBOARDING BARREL. src/lib/* modules import their option arrays (GOAL_OPTIONS,
//      GPA_OPTIONS, …) from components/onboarding/Onboarding, which is a React component file
//      Node cannot parse. Those arrays actually live in — and are re-exported from —
//      components/onboarding/options.js, so the hook redirects to the real data source. This is
//      a redirect to the same values, not a stub: a verify script still tests against the exact
//      arrays the app ships.
//
// Registered by the verify scripts via:  register('./_appResolve.mjs', import.meta.url)
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ONBOARDING_OPTIONS = pathToFileURL(path.join(ROOT, 'src/components/onboarding/options.js')).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.')) {
    const parentPath = context.parentURL ? fileURLToPath(context.parentURL) : ROOT;
    const abs = path.resolve(path.dirname(parentPath), specifier);
    if (/onboarding[\\/]Onboarding$/.test(abs) || /onboarding[\\/]Onboarding\.jsx$/.test(abs)) {
      return { url: ONBOARDING_OPTIONS, shortCircuit: true };
    }
    if (!path.extname(abs)) {
      for (const ext of ['.js', '.mjs', '.jsx']) {
        if (existsSync(abs + ext)) return { url: pathToFileURL(abs + ext).href, shortCircuit: true };
      }
      if (existsSync(path.join(abs, 'index.js'))) {
        return { url: pathToFileURL(path.join(abs, 'index.js')).href, shortCircuit: true };
      }
    }
  }
  return nextResolve(specifier, context);
}
