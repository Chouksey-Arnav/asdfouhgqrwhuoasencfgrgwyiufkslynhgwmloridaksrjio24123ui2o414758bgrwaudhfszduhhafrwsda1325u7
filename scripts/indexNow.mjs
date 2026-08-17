#!/usr/bin/env node
/**
 * Pushes every public URL to IndexNow (api.indexnow.org) so Bing — and
 * anything else on the shared protocol (Yandex, Seznam) — picks up changes
 * without waiting for its next crawl. ChatGPT Search is built on Bing's
 * index, so this is also the fastest path to a new/changed page showing up
 * there.
 *
 * Not part of `npm run build`: it's a network call to a third party, and a
 * build has to succeed offline and stay reproducible. Run it by hand after
 * a content change, or wire it into a deploy hook, via `npm run indexnow`.
 *
 * Key file: public/00d297fcab004d5db3c72b90fe977416.txt, containing just the
 * key. Generated at https://www.bing.com/indexnow/getstarted — hosting it at
 * the site root is IndexNow's ownership proof, so the file must stay in
 * sync with INDEXNOW_KEY below if the key is ever rotated.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { PUBLIC_ROUTES, ORIGIN, absoluteUrl } from '../src/lib/seoRoutes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const INDEXNOW_KEY = '00d297fcab004d5db3c72b90fe977416';
const HOST = new URL(ORIGIN).hostname;
const KEY_LOCATION = `${ORIGIN}/${INDEXNOW_KEY}.txt`;
const KEY_FILE = path.join(ROOT, 'public', `${INDEXNOW_KEY}.txt`);

if (!existsSync(KEY_FILE)) {
  console.error(`indexnow: key file missing at ${path.relative(ROOT, KEY_FILE)} — IndexNow will reject the submission`);
  process.exit(1);
}
if (readFileSync(KEY_FILE, 'utf8').trim() !== INDEXNOW_KEY) {
  console.error(`indexnow: ${path.relative(ROOT, KEY_FILE)} does not contain the key it's named for`);
  process.exit(1);
}

const urlList = PUBLIC_ROUTES.map((route) => absoluteUrl(route.path));

const body = JSON.stringify({
  host: HOST,
  key: INDEXNOW_KEY,
  keyLocation: KEY_LOCATION,
  urlList,
});

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body,
});

// IndexNow returns 200 or 202 on success and no body worth parsing either way.
if (res.ok) {
  console.log(`indexnow: submitted ${urlList.length} URL${urlList.length === 1 ? '' : 's'} for ${HOST} (${res.status})`);
} else {
  const text = await res.text().catch(() => '');
  console.error(`indexnow: submission failed — ${res.status} ${res.statusText}${text ? `\n${text}` : ''}`);
  process.exit(1);
}
