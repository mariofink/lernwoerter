// Dialoge: Wort bearbeiten, Liste teilen, Liste empfangen.
// state.modal ist { type: "edit", id } | { type: "share" } | { type: "import", text, fromLink }.

import { html, nothing } from "../vendor/lit-html.js";
import { NO_LIST, listNames, wordsInList } from "../model.js";
import { importStats, parseMessage } from "../exchange.js";
import {
  ChipGroup,
  ConfirmBox,
  Icons,
  LabeledChoice,
  ListOptions,
  Modal,
  when,
} from "../components.js";
import { plural } from "../ui.js";

export function ModalView(state, actions) {
  const m = state.modal;
  if (!m) return nothing;
  if (m.type === "edit") return EditDialog(state, m.id, actions);
  if (m.type === "share") return ShareDialog(state, actions);
  if (m.type === "import") return ImportDialog(state, m, actions);
  return nothing;
}

const CloseLink = (label, actions) =>
  html`<button type="button" class="linkbtn" @click=${actions.closeModal}>
    ${label}
  </button>`;

// ---------- Wort bearbeiten ----------

function EditDialog(state, id, actions) {
  const word = state.words.find((w) => w.id === id);
  if (!word) return nothing;
  const lastPracticed = word.lastAt
    ? `, zuletzt am ${new Date(word.lastAt).toLocaleDateString("de-DE", { day: "numeric", month: "long" })}`
    : "";
  const save = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    actions.saveEdit(word.id, form.editText.value, form.editList.value);
  };

  return Modal({
    title: "Lernwort bearbeiten",
    onClose: actions.closeModal,
    content: html`
      <form class="stack" @submit=${save}>
        <div class="field">
          <label for="editText">Wort</label>
          <input
            id="editText"
            name="editText"
            class="input script"
            .value=${word.text}
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
          />
        </div>
        <div class="field">
          <label for="editList">Liste</label>
          <input
            id="editList"
            name="editList"
            class="input"
            list="listOptionsEdit"
            .value=${word.list || ""}
            placeholder=${NO_LIST}
          />
          ${ListOptions("listOptionsEdit", listNames(state.words))}
        </div>
        <p class="muted small plain">
          Geübt: ${word.right || 0}× richtig, ${word.wrong || 0}× noch
          nicht${lastPracticed}.
        </p>
        <button type="submit" class="btn primary block">Speichern</button>
      </form>
      <div class="row split">
        <button class="btn ghost" @click=${() => actions.resetStats(word.id)}>
          Zähler zurücksetzen
        </button>
        <button class="btn danger" @click=${actions.askConfirm}>Löschen</button>
      </div>
      ${when(state.confirm, () =>
        ConfirmBox({
          message: `„${word.text}“ wirklich löschen?`,
          confirmLabel: "Ja, löschen",
          cancelLabel: "Behalten",
          onConfirm: () => actions.deleteWord(word.id),
          onCancel: actions.cancelConfirm,
        }),
      )}
      ${CloseLink("Abbrechen", actions)}
    `,
  });
}

// ---------- Liste teilen ----------

function ShareDialog(state, actions) {
  const lists = listNames(state.words);
  const selected = lists.includes(state.shareList) ? state.shareList : "alle";
  const words = wordsInList(state.words, selected);
  const sample =
    words
      .slice(0, 8)
      .map((w) => w.text)
      .join(", ") + (words.length > 8 ? " …" : "");

  return Modal({
    title: "Liste teilen",
    onClose: actions.closeModal,
    content: html`
      <p class="muted small plain">
        Schick die Wörter per Nachricht, AirDrop oder Mail. Wer sie bekommt,
        kopiert die Nachricht und tippt in der eigenen Lernwörter-Kiste auf
        „Liste empfangen“. Übungszähler werden nicht mitgeschickt.
      </p>
      ${when(lists.length, () =>
        LabeledChoice(
          "Was teilen?",
          ChipGroup({
            options: [
              { value: "alle", label: `Alle (${state.words.length})` },
              ...lists.map((l) => ({ value: l, label: l })),
            ],
            value: selected,
            onSelect: actions.setShareList,
          }),
        ),
      )}
      <div class="preview">
        ${plural(words.length, "Wort", "Wörter")}:
        <span class="script">${sample}</span>
      </div>
      <button class="btn primary block" @click=${actions.share}>
        ${Icons.share}Teilen
      </button>
      <button class="btn ghost block" @click=${actions.copyShare}>
        Als Text kopieren
      </button>
      ${CloseLink("Abbrechen", actions)}
    `,
  });
}

// ---------- Liste empfangen ----------

function ImportDialog(state, modal, actions) {
  const items = parseMessage(modal.text);
  const stats = importStats(items, state.words);
  const openedInSafari = modal.fromLink && !state.standalone;

  return Modal({
    title: "Liste empfangen",
    onClose: actions.closeModal,
    content: html`
      ${when(
        openedInSafari,
        () => html`
          <p class="notice">
            Nutzt du die Lernwörter-Kiste auf dem Home-Bildschirm? Dann tippe
            auf
            <b>Nachricht kopieren</b>, öffne die App und füge sie dort unter
            „Liste empfangen“ ein. Die App auf dem Home-Bildschirm hat einen
            eigenen Speicher.
          </p>
          <button class="btn ghost block" @click=${actions.copyIncoming}>
            Nachricht kopieren
          </button>
        `,
      )}
      ${when(!modal.fromLink, () => PasteArea(modal.text, actions))}
      ${ImportPreview(modal.text, items, stats)}
      ${when(stats.total, () => ImportChoices(state, stats, actions))}
      ${CloseLink("Schließen", actions)}
    `,
  });
}

const PasteArea = (text, actions) => html`
  <p class="muted small plain">
    Kopiere die ganze Nachricht mit der Wortliste und füge sie hier ein.
  </p>
  <button class="btn ghost block" @click=${actions.pasteClipboard}>
    Aus Zwischenablage einfügen
  </button>
  <textarea
    id="importText"
    class="input"
    placeholder="Hier einfügen"
    aria-label="Empfangene Nachricht"
    autocapitalize="off"
    autocorrect="off"
    spellcheck="false"
    .value=${text}
    @input=${(e) => actions.setImportText(e.target.value)}
  ></textarea>
`;

function ImportPreview(text, items, stats) {
  if (!text.trim()) return nothing;
  if (!stats.total) {
    return html`
      <div class="preview bad">
        In diesem Text wurden keine Lernwörter gefunden. Kopiere bitte die ganze
        Nachricht.
      </div>
    `;
  }
  const lists = [...new Set(items.map((i) => i.list || NO_LIST))];
  return html`
    <div class="preview">
      <b>${plural(stats.total, "Wort", "Wörter")}</b>, davon ${stats.fresh} neu
      für dich<br />
      <span class="muted small">${lists.join(" · ")}</span>
    </div>
  `;
}

const ImportChoices = (state, stats, actions) => html`
  <div class="stack tight">
    <button
      class="btn primary block"
      @click=${() => actions.importWords("merge")}
    >
      Neue Wörter hinzufügen
    </button>
    ${when(
      state.words.length,
      () =>
        html`<button class="btn ghost block" @click=${actions.askConfirm}>
          Meine Liste ersetzen
        </button>`,
    )}
    ${when(state.confirm, () =>
      ConfirmBox({
        message: `Deine ${state.words.length} Wörter werden durch die empfangenen ${stats.total} ersetzt. Übungszähler bleiben bei Wörtern erhalten, die in beiden Listen stehen.`,
        confirmLabel: "Ja, ersetzen",
        cancelLabel: "Abbrechen",
        onConfirm: () => actions.importWords("replace"),
        onCancel: actions.cancelConfirm,
      }),
    )}
  </div>
`;
