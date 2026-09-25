// Einstieg: App-Zustand, Neuzeichnen und Verteilung der Benutzeraktionen.

import { clean, createWord, parseWordInput, wordsInList } from "./model.js";
import * as store from "./store.js";
import { pickRound } from "./picker.js";
import { applyImport, buildMessage, parseMessage } from "./exchange.js";
import { drawLineatur } from "./lineatur.js";
import {
  copyText,
  focusSoon,
  getValue,
  keepAwake,
  plural,
  setValue,
  toast,
} from "./ui.js";
import { renderTrain } from "./views/train.js";
import { bulkToggleLabel, renderWords } from "./views/words.js";
import { importPreview, renderModal } from "./views/modals.js";

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
  round: null, // {ids, idx, results:{id:'good'|'warn'}, revealed}
  search: "",
  modal: null,
  confirm: false, // Rückfrage im Dialog sichtbar
  shareList: "alle",
  lastList: "",
  standalone:
    window.matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true,
};

const appRoot = document.getElementById("app");
const modalRoot = document.getElementById("modalRoot");

// ---------- Zeichnen ----------

function render() {
  const n = state.words.length;
  document.getElementById("count").textContent = n
    ? plural(n, "Wort", "Wörter")
    : "";
  document
    .getElementById("tabTrain")
    .setAttribute("aria-selected", state.tab === "train");
  document
    .getElementById("tabWords")
    .setAttribute("aria-selected", state.tab === "words");
  if (state.tab === "train") renderTrain(appRoot, state);
  else renderWords(appRoot, state);
}

function openModal(modal) {
  modalRoot.innerHTML = "";
  state.modal = modal;
  state.confirm = false;
  renderModal(modalRoot, state);
}

function closeModal() {
  state.modal = null;
  state.confirm = false;
  modalRoot.innerHTML = "";
}

// ---------- Daten ändern ----------

function commit(words = state.words) {
  state.words = words;
  if (!store.saveWords(words))
    toast("Speichern hat nicht geklappt. Ist privates Surfen aktiv?");
  render();
}

function savePrefs() {
  store.savePrefs({ size: state.size, filter: state.filter, hide: state.hide });
}

function addWords(texts, list) {
  const existing = new Set(state.words.map((w) => w.text));
  const fresh = [...new Set(texts)].filter((t) => !existing.has(t));
  if (fresh.length) {
    commit([...state.words, ...fresh.map((t) => createWord(t, list))]);
    toast(
      fresh.length === 1
        ? `„${fresh[0]}“ hinzugefügt`
        : `${fresh.length} Wörter hinzugefügt`,
    );
  } else if (texts.length) {
    toast("Steht schon in der Kiste");
  }
  return fresh.length;
}

function updateWord(id, patch) {
  commit(state.words.map((w) => (w.id === id ? { ...w, ...patch } : w)));
}

const currentWord = () => state.words.find((w) => w.id === state.modal?.id);
const sharedWords = () => wordsInList(state.words, state.shareList);
const appUrl = () => location.origin + location.pathname;

// ---------- Aktionen (data-act="…") ----------

const actions = {
  goWords() {
    state.tab = "words";
    render();
    focusSoon("newWord");
  },
  examples() {
    addWords(EXAMPLES, "Beispiel");
  },

  // Üben
  start() {
    const ids = pickRound(wordsInList(state.words, state.filter), state.size);
    if (!ids.length) {
      toast("In dieser Auswahl sind keine Wörter.");
      return;
    }
    state.round = { ids, idx: 0, results: {}, revealed: false };
    keepAwake(true);
    render();
    window.scrollTo(0, 0);
  },
  stop() {
    state.round = null;
    keepAwake(false);
    render();
  },
  reveal() {
    state.round.revealed = true;
    render();
  },
  toggleHide() {
    state.hide = !state.hide;
    savePrefs();
    render();
  },
  skip() {
    state.round.idx++;
    state.round.revealed = false;
    render();
  },
  mark(el) {
    const round = state.round,
      id = round.ids[round.idx],
      res = el.dataset.res;
    round.results[id] = res;
    round.idx++;
    round.revealed = false;
    if (round.idx >= round.ids.length) keepAwake(false);
    const w = state.words.find((x) => x.id === id);
    if (w)
      updateWord(id, {
        right: (w.right || 0) + (res === "good" ? 1 : 0),
        wrong: (w.wrong || 0) + (res === "warn" ? 1 : 0),
        lastAt: Date.now(),
      });
    else render();
  },

  // Wörter eintragen
  toggleBulk(el) {
    const box = document.getElementById("bulkBox");
    box.hidden = !box.hidden;
    el.textContent = bulkToggleLabel(!box.hidden);
    if (!box.hidden) document.getElementById("bulk").focus();
  },
  bulkAdd() {
    const list = clean(getValue("newList"));
    state.lastList = list;
    if (addWords(parseWordInput(getValue("bulk")), list)) setValue("bulk", "");
  },

  // Wort bearbeiten
  saveEdit() {
    const w = currentWord();
    if (!w) return;
    const text = clean(getValue("editText")),
      list = clean(getValue("editList"));
    if (!text) {
      toast("Das Wort darf nicht leer sein.");
      return;
    }
    if (text !== w.text && state.words.some((x) => x.text === text)) {
      toast("Dieses Wort gibt es schon.");
      return;
    }
    closeModal();
    updateWord(w.id, { text, list });
    toast("Gespeichert");
  },
  resetStats() {
    const w = currentWord();
    if (!w) return;
    updateWord(w.id, { right: 0, wrong: 0, lastAt: 0 });
    renderModal(modalRoot, state);
    toast("Zähler zurückgesetzt");
  },
  doDelete() {
    const w = currentWord();
    closeModal();
    if (!w) return;
    commit(state.words.filter((x) => x.id !== w.id));
    toast(`„${w.text}“ gelöscht`);
  },
  askConfirm() {
    state.confirm = true;
    renderModal(modalRoot, state);
  },
  cancelConfirm() {
    state.confirm = false;
    renderModal(modalRoot, state);
  },
  closeModal,

  // Teilen
  openShare() {
    openModal({ type: "share" });
  },
  async doShare() {
    const text = buildMessage(sharedWords(), appUrl());
    if (navigator.share) {
      try {
        await navigator.share({ text });
        closeModal();
      } catch (err) {
        if (err?.name !== "AbortError" && (await copyText(text)))
          toast("Teilen ging nicht. Text ist kopiert.");
      }
    } else if (await copyText(text)) {
      toast("Kopiert. Jetzt in eine Nachricht einfügen.");
      closeModal();
    } else {
      toast("Kopieren hat nicht geklappt.");
    }
  },
  async doCopy() {
    if (await copyText(buildMessage(sharedWords(), appUrl()))) {
      toast("Kopiert. Jetzt in eine Nachricht einfügen.");
      closeModal();
    } else {
      toast("Kopieren hat nicht geklappt.");
    }
  },

  // Empfangen
  openImport() {
    openModal({ type: "import", text: "" });
    focusSoon("importText");
  },
  async pasteClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      state.modal.text = text;
      renderModal(modalRoot, state);
      if (!text.trim()) toast("Die Zwischenablage ist leer.");
    } catch {
      toast("Bitte lange ins Feld tippen und „Einsetzen“ wählen.");
      document.getElementById("importText")?.focus();
    }
  },
  async copyIncoming() {
    toast(
      (await copyText(state.modal.text))
        ? "Kopiert. Jetzt die App öffnen."
        : "Kopieren hat nicht geklappt.",
    );
  },
  doImportMerge() {
    importWords("merge");
  },
  doImportReplace() {
    importWords("replace");
  },
};

function importWords(mode) {
  const { words, count } = applyImport(
    state.words,
    parseMessage(state.modal.text),
    mode,
  );
  closeModal();
  state.tab = "words";
  commit(words);
  if (mode === "replace")
    toast(`Liste ersetzt: ${plural(count, "Wort", "Wörter")}`);
  else
    toast(
      count
        ? `${count} neue ${count === 1 ? "Wort" : "Wörter"} übernommen`
        : "Alle Wörter waren schon da",
    );
}

// ---------- Ereignisse ----------

document.addEventListener("click", (e) => {
  const t = e.target;
  const tab = t.closest("[data-tab]");
  if (tab) {
    state.tab = tab.dataset.tab;
    render();
    window.scrollTo(0, 0);
    return;
  }

  const filter = t.closest("[data-filter]");
  if (filter) {
    state.filter = filter.dataset.filter;
    savePrefs();
    render();
    return;
  }

  const size = t.closest("[data-size]");
  if (size) {
    state.size = Number(size.dataset.size);
    savePrefs();
    render();
    return;
  }

  const shareList = t.closest("[data-sharelist]");
  if (shareList) {
    state.shareList = shareList.dataset.sharelist;
    renderModal(modalRoot, state);
    return;
  }

  const edit = t.closest("[data-edit]");
  if (edit) {
    openModal({ type: "edit", id: edit.dataset.edit });
    return;
  }

  const el = t.closest("[data-act]");
  if (!el) return;
  // Der Hintergrund schließt den Dialog nur bei einem Tipp direkt auf ihn
  if (el.classList.contains("backdrop") && t !== el) return;
  actions[el.dataset.act]?.(el);
});

document.addEventListener("submit", (e) => {
  if (e.target.id !== "addForm") return;
  e.preventDefault();
  const input = document.getElementById("newWord");
  const list = clean(getValue("newList"));
  state.lastList = list;
  const texts = parseWordInput(input.value);
  if (!texts.length) {
    input.focus();
    return;
  }
  input.value = "";
  addWords(texts, list);
  document.getElementById("newWord")?.focus();
});

let searchTimer;
document.addEventListener("input", (e) => {
  if (e.target.id === "search") {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = e.target.value;
      render();
    }, 120);
  }
  if (e.target.id === "importText" && state.modal) {
    state.modal.text = e.target.value;
    document.getElementById("importPreview").innerHTML = importPreview(
      state.modal.text,
      state.words,
    );
    document.getElementById("importActions").hidden = !parseMessage(
      state.modal.text,
    ).length;
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.modal) closeModal();
});

document.addEventListener("visibilitychange", () => {
  const r = state.round;
  if (document.visibilityState === "visible" && r && r.idx < r.ids.length)
    keepAwake(true);
});

// Wortkarte bei Größen- oder Farbwechsel neu zeichnen
function redrawCard() {
  const canvas = document.getElementById("lineatur");
  if (canvas) drawLineatur(canvas, canvas.getAttribute("aria-label"));
}
window.addEventListener("resize", redrawCard);
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener?.("change", redrawCard);
document.fonts
  ?.load('400 40px "Andika"')
  .then(redrawCard)
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
render();
checkIncomingLink();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
