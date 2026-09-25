// Üben: Startbildschirm, Wortkarte während der Runde, Auswertung.

import { html } from "../vendor/lit-html.js";
import { listNames, wordsInList } from "../model.js";
import {
  ChipGroup,
  Eyebrow,
  HeroCount,
  LabeledChoice,
  ResultPill,
  when,
} from "../components.js";

const ROUND_SIZES = [3, 5, 10];

export function TrainView(state, actions) {
  if (!state.words.length) return EmptyState(actions);
  const round = state.round;
  if (!round) return StartScreen(state, actions);
  if (round.idx >= round.ids.length) return Summary(state, actions);
  const word = state.words.find((w) => w.id === round.ids[round.idx]);
  return WordCard(state, word, actions);
}

const EmptyState = (actions) => html`
  <div class="panel empty">
    ${Eyebrow("Noch keine Lernwörter")}
    <p>
      Trage die Wörter ein, die dein Kind gerade in der Schule lernt. Danach
      schlägt die App dir jederzeit zufällige Wörter zum Diktieren vor.
    </p>
    <div class="stack">
      <button class="btn primary block" @click=${actions.goToWords}>
        Wörter eintragen
      </button>
      <button class="btn ghost block" @click=${actions.openImport}>
        Liste von jemandem empfangen
      </button>
      <button class="btn ghost block" @click=${actions.addExamples}>
        Mit Beispielwörtern ausprobieren
      </button>
    </div>
  </div>
`;

function StartScreen(state, actions) {
  const lists = listNames(state.words);
  const filter = lists.includes(state.filter) ? state.filter : "alle";
  const pool = wordsInList(state.words, filter);
  const shaky = pool.filter((w) => (w.wrong || 0) > (w.right || 0)).length;
  const countText = `${pool.length === 1 ? "Wort" : "Wörter"} in der Kiste${shaky ? ` · ${shaky} noch wackelig` : ""}`;

  return html`
    <div class="stack">
      <section class="panel stack">
        <div>
          ${Eyebrow("Bereit zum Üben")} ${HeroCount(pool.length, countText)}
        </div>

        ${when(lists.length, () =>
          LabeledChoice(
            "Welche Wörter?",
            ChipGroup({
              options: [
                { value: "alle", label: "Alle" },
                ...lists.map((l) => ({ value: l, label: l })),
              ],
              value: filter,
              onSelect: actions.setFilter,
            }),
          ),
        )}
        ${LabeledChoice(
          "Wie viele?",
          ChipGroup({
            options: ROUND_SIZES.map((n) => ({
              value: n,
              label: `${n} Wörter`,
            })),
            value: state.size,
            onSelect: actions.setSize,
          }),
        )}

        <button class="btn primary block" @click=${actions.startRound}>
          Los geht's
        </button>
      </section>

      <p class="muted small hint">
        So geht's: Du liest das Wort vor, dein Kind schreibt es auf Papier.
        Danach vergleicht ihr und du tippst, ob es richtig war. Wörter, die noch
        nicht sitzen, kommen häufiger dran.
      </p>

      ${when(
        !state.standalone,
        () => html`
          <p class="notice">
            Tipp fürs iPhone: In Safari auf <b>Teilen</b> und dann
            <b>Zum Home-Bildschirm</b>
            tippen. Dann startet die Kiste wie eine App und funktioniert auch
            ohne Internet.
          </p>
        `,
      )}
    </div>
  `;
}

const ProgressBar = (round) => html`
  <div class="progress" aria-hidden="true">
    ${round.ids.map((id, i) => {
      const result = round.results[id];
      const cls = result ? `done-${result}` : i === round.idx ? "now" : "";
      return html`<span class=${cls}></span>`;
    })}
  </div>
`;

function scoreText(word) {
  const right = word.right || 0;
  const wrong = word.wrong || 0;
  if (!right && !wrong) return "neu";
  return `${right}× richtig · ${wrong}× geübt`;
}

// Das Canvas #lineatur wird nach jedem Rendern in main.js bemalt.
function WordCard(state, word, actions) {
  const round = state.round;
  const hidden = state.hide && !round.revealed;
  return html`
    <div class="stack">
      <div class="toolbar">
        <span class="muted small"
          >Wort ${round.idx + 1} von ${round.ids.length}</span
        >
        <button class="linkbtn" @click=${actions.stopRound}>
          Runde beenden
        </button>
      </div>

      ${ProgressBar(round)}

      <div class="sheet ${hidden ? "hide-word" : ""}">
        <div class="meta">
          <span>${word.list || "Lernwort"}</span>
          <span>${scoreText(word)}</span>
        </div>
        <canvas id="lineatur" role="img" aria-label=${word.text}></canvas>
        ${when(
          hidden,
          () =>
            html`<button class="reveal" @click=${actions.reveal}>
              Antippen zum Aufdecken
            </button>`,
        )}
      </div>

      <div class="answer">
        <button class="btn warn" @click=${() => actions.mark("warn")}>
          Noch üben
        </button>
        <button class="btn good" @click=${() => actions.mark("good")}>
          Richtig
        </button>
      </div>

      <div class="toolbar">
        <button class="linkbtn" @click=${actions.toggleHide}>
          ${state.hide ? "Wort sofort zeigen" : "Wort erst verdecken"}
        </button>
        <button class="linkbtn" @click=${actions.skip}>Überspringen</button>
      </div>
    </div>
  `;
}

function Summary(state, actions) {
  const round = state.round;
  const done = round.ids.filter((id) => round.results[id]);
  const good = done.filter((id) => round.results[id] === "good").length;
  const rows = done
    .map((id) => state.words.find((w) => w.id === id))
    .filter(Boolean)
    .map(
      (w) =>
        html`<li><span>${w.text}</span>${ResultPill(round.results[w.id])}</li>`,
    );

  return html`
    <div class="stack">
      <section class="panel stack">
        <div>
          ${Eyebrow("Runde geschafft")}
          ${HeroCount(`${good}/${done.length}`, "richtig geschrieben")}
        </div>
        ${
          done.length
            ? html`<ul class="result-list">
                ${rows}
              </ul>`
            : html`<p class="muted plain">Keine Wörter bewertet.</p>`
        }
      </section>
      <button class="btn primary block" @click=${actions.startRound}>
        Noch eine Runde
      </button>
      <button class="btn ghost block" @click=${actions.stopRound}>
        Fertig
      </button>
    </div>
  `;
}
