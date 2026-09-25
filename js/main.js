// Einstieg: App-Zustand, Aktionen und Neuzeichnen.
//
// Ablauf: Eine Aktion ändert `state` und ruft `update()` auf. `update()` rendert
// die ganze App mit lit-html neu; lit-html ändert dabei nur, was sich wirklich
// geändert hat.

import { render } from "./vendor/lit-html.js";
import { clean, createWord, wordsInList } from "./model.js";
import * as store from "./store.js";
import { pickRound } from "./picker.js";
import { applyImport, buildMessage, parseMessage } from "./exchange.js";
import { drawLineatur } from "./lineatur.js";
import {
  copyText,
  focusById,
  keepAwake,
  plural,
  slideIn,
  toast,
} from "./ui.js";
import { App } from "./views/app.js";
import { connectServiceWorker } from "./sw-client.js";

const EXAMPLES = [
  "Hund",
  "Katze",
  "Schule",
  "Baum",
  "fahren",
  "spielen",
  "Haus",
  "Mutter",
  "Vater",
  "groß",
  "klein",
  "Fisch",
];

const prefs = store.loadPrefs();
const state = {
  tab: "train",
  words: store.loadWords(),
  filter: prefs.filter || "alle", // Liste für die Übungsrunde
  size: prefs.size || 5, // Wörter pro Runde
  hide: !!prefs.hide, // Wort erst verdecken
  round: null, // { ids, idx, results: { id: "good" | "warn" }, revealed }
  search: "",
  bulkOpen: false, // Feld für mehrere Wörter sichtbar
  modal: null, // { type: "edit", id } | { type: "share" } | { type: "import", text, fromLink }
  confirm: false, // Rückfrage im Dialog sichtbar
  shareList: "alle",
  lastList: "", // zuletzt benutzte Liste beim Eintragen
  appVersion: null, // Version des laufenden Service Workers, null solange unbekannt
  updateReady: false, // neue Version aktiv, Seite muss neu geladen werden
  standalone:
    window.matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true,
};

const root = document.getElementById("root");

// ---------- Zeichnen ----------

let cardWordId = null;

function update() {
  render(App(state, actions), root);
  paintWordCard();
}

/** Die Wortkarte ist ein Canvas und wird nach dem Rendern bemalt. */
function paintWordCard() {
  const canvas = document.getElementById("lineatur");
  if (!canvas) {
    cardWordId = null;
    return;
  }
  drawLineatur(canvas, canvas.getAttribute("aria-label"));
  const id = state.round?.ids[state.round.idx];
  if (id !== cardWordId) slideIn(canvas.closest(".sheet"));
  cardWordId = id;
}

// ---------- Daten ändern ----------

function saveWords(words) {
  state.words = words;
  if (!store.saveWords(words))
    toast("Speichern hat nicht geklappt. Ist privates Surfen aktiv?");
  update();
}

function savePrefs() {
  store.savePrefs({ size: state.size, filter: state.filter, hide: state.hide });
}

function updateWord(id, patch) {
  saveWords(state.words.map((w) => (w.id === id ? { ...w, ...patch } : w)));
}

function openModal(modal) {
  state.modal = modal;
  state.confirm = false;
  update();
}

const appUrl = () => location.origin + location.pathname;
const shareMessage = () =>
  buildMessage(wordsInList(state.words, state.shareList), appUrl());

// ---------- Aktionen ----------
// Die Ansichten rufen nur diese Funktionen auf und ändern `state` nie selbst.

const actions = {
  // App
  reloadApp() {
    location.reload();
  },

  // Navigation
  setTab(tab) {
    state.tab = tab;
    update();
    window.scrollTo(0, 0);
  },
  goToWords() {
    actions.setTab("words");
    focusById("newWord");
  },

  // Wörter eintragen
  /** Fügt neue Wörter hinzu und gibt zurück, wie viele wirklich neu waren. */
  addWords(texts, list) {
    list = clean(list);
    state.lastList = list;
    const existing = new Set(state.words.map((w) => w.text));
    const fresh = [...new Set(texts)].filter((t) => !existing.has(t));
    if (fresh.length) {
      saveWords([...state.words, ...fresh.map((t) => createWord(t, list))]);
      toast(
        fresh.length === 1
          ? `„${fresh[0]}“ hinzugefügt`
          : `${fresh.length} Wörter hinzugefügt`,
      );
    } else if (texts.length) {
      toast("Steht schon in der Kiste");
    }
    return fresh.length;
  },
  addExamples() {
    actions.addWords(EXAMPLES, "Beispiel");
  },
  toggleBulk() {
    state.bulkOpen = !state.bulkOpen;
    update();
  },
  setSearch(q) {
    state.search = q;
    update();
  },

  // Üben
  setFilter(list) {
    state.filter = list;
    savePrefs();
    update();
  },
  setSize(n) {
    state.size = n;
    savePrefs();
    update();
  },
  startRound() {
    const ids = pickRound(wordsInList(state.words, state.filter), state.size);
    if (!ids.length) return toast("In dieser Auswahl sind keine Wörter.");
    state.round = { ids, idx: 0, results: {}, revealed: false };
    keepAwake(true);
    update();
    window.scrollTo(0, 0);
  },
  stopRound() {
    state.round = null;
    keepAwake(false);
    update();
  },
  reveal() {
    state.round.revealed = true;
    update();
  },
  toggleHide() {
    state.hide = !state.hide;
    savePrefs();
    update();
  },
  skip() {
    state.round.idx++;
    state.round.revealed = false;
    update();
  },
  mark(result) {
    const round = state.round;
    const id = round.ids[round.idx];
    round.results[id] = result;
    round.idx++;
    round.revealed = false;
    if (round.idx >= round.ids.length) keepAwake(false);
    const w = state.words.find((x) => x.id === id);
    updateWord(id, {
      right: (w.right || 0) + (result === "good" ? 1 : 0),
      wrong: (w.wrong || 0) + (result === "warn" ? 1 : 0),
      lastAt: Date.now(),
    });
  },

  // Dialoge allgemein
  closeModal() {
    state.modal = null;
    state.confirm = false;
    update();
  },
  askConfirm() {
    state.confirm = true;
    update();
  },
  cancelConfirm() {
    state.confirm = false;
    update();
  },

  // Wort bearbeiten
  openEdit(id) {
    openModal({ type: "edit", id });
    focusById("editText");
  },
  saveEdit(id, text, list) {
    text = clean(text);
    const word = state.words.find((w) => w.id === id);
    if (!text) return toast("Das Wort darf nicht leer sein.");
    if (text !== word.text && state.words.some((w) => w.text === text))
      return toast("Dieses Wort gibt es schon.");
    state.modal = null;
    updateWord(id, { text, list: clean(list) });
    toast("Gespeichert");
  },
  resetStats(id) {
    updateWord(id, { right: 0, wrong: 0, lastAt: 0 });
    toast("Zähler zurückgesetzt");
  },
  deleteWord(id) {
    const word = state.words.find((w) => w.id === id);
    state.modal = null;
    state.confirm = false;
    const pos = state.round?.ids.indexOf(id) ?? -1;
    if (pos >= 0) {
      state.round.ids.splice(pos, 1);
      if (pos < state.round.idx) state.round.idx--;
    }
    saveWords(state.words.filter((w) => w.id !== id));
    toast(`„${word.text}“ gelöscht`);
  },

  // Liste teilen
  openShare() {
    openModal({ type: "share" });
  },
  setShareList(list) {
    state.shareList = list;
    update();
  },
  async share() {
    const text = shareMessage();
    if (!navigator.share) return actions.copyShare();
    try {
      await navigator.share({ text });
      actions.closeModal();
    } catch (err) {
      if (err?.name !== "AbortError" && (await copyText(text)))
        toast("Teilen ging nicht. Text ist kopiert.");
    }
  },
  async copyShare() {
    if (!(await copyText(shareMessage())))
      return toast("Kopieren hat nicht geklappt.");
    toast("Kopiert. Jetzt in eine Nachricht einfügen.");
    actions.closeModal();
  },

  // Liste empfangen
  openImport() {
    openModal({ type: "import", text: "" });
    focusById("importText");
  },
  setImportText(text) {
    state.modal.text = text;
    update();
  },
  async pasteClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      actions.setImportText(text);
      if (!text.trim()) toast("Die Zwischenablage ist leer.");
    } catch {
      toast("Bitte lange ins Feld tippen und „Einsetzen“ wählen.");
      focusById("importText");
    }
  },
  async copyIncoming() {
    const ok = await copyText(state.modal.text);
    toast(
      ok ? "Kopiert. Jetzt die App öffnen." : "Kopieren hat nicht geklappt.",
    );
  },
  importWords(mode) {
    const { words, count } = applyImport(
      state.words,
      parseMessage(state.modal.text),
      mode,
    );
    state.modal = null;
    state.confirm = false;
    state.tab = "words";
    saveWords(words);
    if (mode === "replace")
      toast(`Liste ersetzt: ${plural(count, "Wort", "Wörter")}`);
    else if (count)
      toast(`${count} neue ${count === 1 ? "Wort" : "Wörter"} übernommen`);
    else toast("Alle Wörter waren schon da");
  },
};

// ---------- Ereignisse außerhalb der Ansichten ----------

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.modal) actions.closeModal();
});

document.addEventListener("visibilitychange", () => {
  const r = state.round;
  if (document.visibilityState === "visible" && r && r.idx < r.ids.length)
    keepAwake(true);
});

// Wortkarte bei Größen- oder Farbwechsel und nach dem Laden der Schrift neu zeichnen
window.addEventListener("resize", paintWordCard);
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener?.("change", paintWordCard);
document.fonts
  ?.load('400 40px "Andika"')
  .then(paintWordCard)
  .catch(() => {});

// Geöffneter Teilen-Link (#import=…)
function checkIncomingLink() {
  if (!location.hash.startsWith("#import=")) return;
  const text = location.href;
  history.replaceState(null, "", location.pathname + location.search);
  if (parseMessage(text).length)
    openModal({ type: "import", text, fromLink: true });
}
window.addEventListener("hashchange", checkIncomingLink);

// ---------- Start ----------

store.requestPersistence();
update();
checkIncomingLink();

connectServiceWorker({
  onVersion(version) {
    state.appVersion = version;
    update();
  },
  onUpdate() {
    state.updateReady = true;
    update();
  },
});
