// Zufallsauswahl für eine Übungsrunde.
// Wörter, die noch nicht sitzen, und neue Wörter kommen häufiger dran;
// gerade erst geübte Wörter seltener.

const HOUR = 60 * 60 * 1000;

export function weight(word, now = Date.now()){
  const right = word.right || 0, wrong = word.wrong || 0;
  let w = 1 + (2 * wrong) / (1 + right);
  if (!right && !wrong) w += 1;
  if (word.lastAt && now - word.lastAt < HOUR) w *= 0.5;
  return w;
}

/**
 * Wählt bis zu n verschiedene Wörter gewichtet aus und gibt ihre IDs zurück.
 * `random` ist austauschbar, damit sich die Auswahl testen lässt.
 */
export function pickRound(words, n, {random = Math.random, now = Date.now()} = {}){
  const candidates = words.slice(), ids = [];
  while (ids.length < n && candidates.length){
    const weights = candidates.map(w => weight(w, now));
    const total = weights.reduce((s, x) => s + x, 0);
    let t = random() * total, i = 0;
    for (; i < candidates.length - 1; i++){
      t -= weights[i];
      if (t <= 0) break;
    }
    ids.push(candidates.splice(i, 1)[0].id);
  }
  return ids;
}
