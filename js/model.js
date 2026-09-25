// Das Lernwort als Datenobjekt und Hilfen rund um Listen.
// Ein Wort: {id, text, list, right, wrong, lastAt, createdAt}

export const NO_LIST = "Ohne Liste";

export const clean = (s) =>
  String(s ?? "")
    .trim()
    .replace(/\s+/g, " ");

export const newId = () =>
  "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function createWord(text, list = "", now = Date.now()) {
  return {
    id: newId(),
    text: clean(text),
    list: clean(list),
    right: 0,
    wrong: 0,
    lastAt: 0,
    createdAt: now,
  };
}

const byName = (a, b) => a.localeCompare(b, "de", { numeric: true });

/** Alle vergebenen Listennamen, sortiert („Woche 2“ vor „Woche 10“). */
export function listNames(words) {
  return [
    ...new Set(words.map((w) => (w.list || "").trim()).filter(Boolean)),
  ].sort(byName);
}

/** Wörter einer Liste, oder alle bei 'alle'. */
export function wordsInList(words, list) {
  return list === "alle" ? words : words.filter((w) => (w.list || "") === list);
}

/** Sortierung für Gruppen: benannte Listen alphabetisch, „Ohne Liste“ zuletzt. */
export function compareListNames(a, b) {
  if (!a || a === NO_LIST) return 1;
  if (!b || b === NO_LIST) return -1;
  return byName(a, b);
}

/** Wörter aus einer Eingabe: eine pro Zeile oder durch Komma/Semikolon getrennt. */
export function parseWordInput(s) {
  return String(s ?? "")
    .split(/[\n,;]+/)
    .map(clean)
    .filter(Boolean);
}
