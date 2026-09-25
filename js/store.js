// Speicher auf dem Gerät (localStorage). Die Schlüssel dürfen sich nicht ändern,
// sonst sind die gespeicherten Wörter nach einem Update weg.

const WORDS_KEY = 'lernwoerter.words.v1';
const PREFS_KEY = 'lernwoerter.prefs.v1';

function read(key, fallback){
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function write(key, value){
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

export const loadWords = () => {
  const w = read(WORDS_KEY, []);
  return Array.isArray(w) ? w : [];
};
export const saveWords = words => write(WORDS_KEY, words);

export const loadPrefs = () => read(PREFS_KEY, {});
export const savePrefs = prefs => write(PREFS_KEY, prefs);

/** Bittet den Browser, die Daten nicht automatisch aufzuräumen. */
export function requestPersistence(){
  try { navigator.storage?.persist?.(); } catch { /* egal */ }
}
