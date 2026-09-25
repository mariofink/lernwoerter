// Austausch zwischen Geräten per Nachricht.
//
// Eine Nachricht besteht aus einer lesbaren Wortliste und einem Link.
// Der Link trägt die Liste exakt (#import=<base64url(JSON)>); die lesbaren
// Zeilen „Liste: Wort, Wort“ dienen als Rückfall, falls der Link fehlt.
//
// ACHTUNG: Bereits verschickte Nachrichten müssen lesbar bleiben.
// Änderungen am Format nur abwärtskompatibel (siehe tests/exchange.test.js).

import {NO_LIST, clean, compareListNames, createWord} from './model.js';

const FORMAT_VERSION = 1;
const HEADER = /^Lernwörter \(\d+\)$/;
const FOOTER = /^Zum Übernehmen/;

/** [[listName, [wort, …]], …], Listen und Wörter sortiert. */
export function groupWords(words){
  const groups = new Map();
  for (const w of words){
    const key = (w.list || '').trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(w.text);
  }
  return [...groups.entries()]
    .sort((a, b) => compareListNames(a[0], b[0]))
    .map(([list, texts]) => [list, texts.sort((a, b) => a.localeCompare(b, 'de'))]);
}

export function encodePayload(obj){
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodePayload(s){
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Text zum Verschicken. `appUrl` ist die Adresse der App ohne #. */
export function buildMessage(words, appUrl){
  const groups = groupWords(words);
  const lines = groups.map(([list, texts]) => `${list || NO_LIST}: ${texts.join(', ')}`);
  const payload = encodePayload({v: FORMAT_VERSION, g: groups});
  return [
    `Lernwörter (${words.length})`,
    '',
    ...lines,
    '',
    'Zum Übernehmen: Diese Nachricht kopieren, die Lernwörter-App öffnen und unter „Wörter“ auf „Liste empfangen“ tippen.',
    `${appUrl}#import=${payload}`,
  ].join('\n');
}

function fromPayload(text){
  const m = /#import=([A-Za-z0-9_-]+)/.exec(text);
  if (!m) return [];
  try {
    const data = decodePayload(m[1]);
    if (!data || !Array.isArray(data.g)) return [];
    const items = [];
    for (const [list, texts] of data.g){
      if (!Array.isArray(texts)) continue;
      for (const t of texts){
        const textClean = clean(t);
        if (textClean) items.push({text: textClean, list: clean(list)});
      }
    }
    return items;
  } catch {
    return [];
  }
}

function fromLines(text){
  const items = [];
  for (let line of text.split('\n')){
    line = line.trim();
    if (!line || HEADER.test(line) || FOOTER.test(line) || /^https?:\/\//.test(line)) continue;
    const i = line.lastIndexOf(': ');
    if (i < 0) continue;
    let list = clean(line.slice(0, i));
    if (list === NO_LIST) list = '';
    for (const t of line.slice(i + 2).split(',').map(clean).filter(Boolean)) items.push({text: t, list});
  }
  return items;
}

/** Liest eine empfangene Nachricht (oder nur den Link). Ergebnis: [{text, list}, …] */
export function parseMessage(text){
  text = String(text ?? '');
  const exact = fromPayload(text);
  return exact.length ? exact : fromLines(text);
}

/** Wie viele verschiedene Wörter kommen an, und wie viele davon sind neu? */
export function importStats(items, words){
  const have = new Set(words.map(w => w.text));
  const seen = new Set();
  let fresh = 0;
  for (const {text} of items){
    if (seen.has(text)) continue;
    seen.add(text);
    if (!have.has(text)) fresh++;
  }
  return {total: seen.size, fresh};
}

/**
 * Übernimmt empfangene Wörter.
 * - 'merge': nur neue Wörter kommen dazu, vorhandene bleiben unverändert.
 * - 'replace': die Liste wird ersetzt; bei Wörtern, die es schon gab,
 *   bleiben die Übungszähler erhalten, die Listenzuordnung kommt vom Absender.
 * Gibt eine neue Wortliste zurück und die Zahl der übernommenen Wörter.
 */
export function applyImport(words, items, mode){
  const existing = new Map(words.map(w => [w.text, w]));
  if (mode === 'replace'){
    const seen = new Set(), next = [];
    for (const it of items){
      if (seen.has(it.text)) continue;
      seen.add(it.text);
      const prev = existing.get(it.text);
      next.push(prev ? {...prev, list: it.list} : createWord(it.text, it.list));
    }
    return {words: next, count: next.length};
  }
  const next = words.slice();
  let count = 0;
  for (const it of items){
    if (existing.has(it.text)) continue;
    const w = createWord(it.text, it.list);
    next.push(w);
    existing.set(it.text, w);
    count++;
  }
  return {words: next, count};
}
