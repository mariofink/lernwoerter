// Wörter: neue Wörter eintragen, mit anderen Geräten austauschen, Liste nach Gruppen.

import { html } from "../vendor/lit-html.js";
import {
  NO_LIST,
  compareListNames,
  listNames,
  parseWordInput,
} from "../model.js";
import { Eyebrow, Icons, ListOptions, ScorePill, when } from "../components.js";
import { focusById } from "../ui.js";

export function WordsView(state, actions) {
  const hasWords = state.words.length > 0;
  const shown = filterWords(state.words, state.search);
  return html`
    <div class="stack">
      ${AddForm(state, actions)} ${Exchange(hasWords, actions)}
      ${when(state.words.length > 6, () => SearchField(state.search, actions))}
      ${when(
        !hasWords,
        () => html`
          <div class="panel empty">
            <p class="muted">
              Noch keine Wörter. Trage oben das erste ein oder
            </p>
            <button class="btn ghost" @click=${actions.addExamples}>
              Beispielwörter einfügen
            </button>
          </div>
        `,
      )}
      ${groupByList(shown).map(([name, words]) => WordGroup(name, words, actions))}
      ${when(
        hasWords && !shown.length,
        () => html`<p class="muted">Kein Wort passt zu „${state.search}“.</p>`,
      )}
    </div>
  `;
}

function filterWords(words, search) {
  const q = search.trim().toLowerCase();
  return q ? words.filter((w) => w.text.toLowerCase().includes(q)) : words;
}

function groupByList(words) {
  const groups = new Map();
  for (const w of words) {
    const name = (w.list || "").trim() || NO_LIST;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(w);
  }
  return [...groups.entries()].sort((a, b) => compareListNames(a[0], b[0]));
}

// Die Eingabefelder sind nicht an den Zustand gebunden: lit-html lässt sie beim
// Neuzeichnen in Ruhe, getippter Text bleibt also stehen.
function AddForm(state, actions) {
  const submit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const texts = parseWordInput(form.newWord.value);
    if (!texts.length) return form.newWord.focus();
    actions.addWords(texts, form.newList.value);
    form.newWord.value = "";
    form.newWord.focus();
  };
  const addBulk = (e) => {
    const form = e.currentTarget.form;
    if (actions.addWords(parseWordInput(form.bulk.value), form.newList.value))
      form.bulk.value = "";
  };
  const toggleBulk = () => {
    actions.toggleBulk();
    if (state.bulkOpen) focusById("bulk");
  };

  return html`
    <form class="panel stack" autocomplete="off" @submit=${submit}>
      ${Eyebrow("Neues Lernwort")}
      <div class="add-row">
        <input
          id="newWord"
          name="newWord"
          class="input script"
          placeholder="z. B. Fahrrad"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          aria-label="Lernwort"
        />
        <button class="btn primary" type="submit">Hinzufügen</button>
      </div>
      <div class="field">
        <label for="newList"
          >Liste (optional, z. B. „Woche 5“ oder „Diktat Tiere“)</label
        >
        <input
          id="newList"
          name="newList"
          class="input"
          list="listOptions"
          placeholder=${NO_LIST}
          value=${state.lastList}
        />
        ${ListOptions("listOptions", listNames(state.words))}
      </div>

      <button type="button" class="linkbtn align-start" @click=${toggleBulk}>
        ${state.bulkOpen ? "Mehrere Wörter ausblenden" : "Mehrere Wörter auf einmal eintragen"}
      </button>
      <div class="stack tight" ?hidden=${!state.bulkOpen}>
        <textarea
          id="bulk"
          name="bulk"
          class="input script"
          placeholder="Ein Wort pro Zeile oder durch Komma getrennt"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          aria-label="Mehrere Wörter"
        ></textarea>
        <button type="button" class="btn ghost block" @click=${addBulk}>
          Alle hinzufügen (Liste von oben)
        </button>
      </div>
    </form>
  `;
}

const Exchange = (hasWords, actions) => html`
  <section class="stack tight">
    <p class="eyebrow hint">Mit anderen Geräten austauschen</p>
    <div class="exchange">
      <button
        class="btn ghost"
        ?disabled=${!hasWords}
        @click=${actions.openShare}
      >
        ${Icons.share}Liste teilen
      </button>
      <button class="btn ghost" @click=${actions.openImport}>
        ${Icons.receive}Liste empfangen
      </button>
    </div>
  </section>
`;

const SearchField = (search, actions) => html`
  <input
    id="search"
    class="input"
    type="search"
    placeholder="Wort suchen"
    aria-label="Wort suchen"
    value=${search}
    @input=${(e) => actions.setSearch(e.target.value)}
  />
`;

function WordGroup(name, words, actions) {
  const sorted = words
    .slice()
    .sort((a, b) => a.text.localeCompare(b.text, "de"));
  return html`
    <section class="group">
      <h3><span>${name}</span><span>${words.length}</span></h3>
      <ul class="wordlist">
        ${sorted.map(
          (w) => html`
            <li>
              <button @click=${() => actions.openEdit(w.id)}>
                <span class="w">${w.text}</span>${ScorePill(w)}
              </button>
            </li>
          `,
        )}
      </ul>
    </section>
  `;
}
