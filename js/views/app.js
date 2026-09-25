// Grundgerüst: Kopfzeile, aktuelle Ansicht, Tab-Leiste, offener Dialog.

import { html } from "../vendor/lit-html.js";
import { Icons, when } from "../components.js";
import { plural } from "../ui.js";
import { TrainView } from "./train.js";
import { WordsView } from "./words.js";
import { ModalView } from "./modals.js";

const TABS = [
  { id: "train", label: "Üben", icon: Icons.pencil },
  { id: "words", label: "Wörter", icon: Icons.book },
];

export function App(state, actions) {
  const count = state.words.length;
  return html`
    <div class="wrap">
      <header class="top">
        <h1>Lernwörter-Kiste</h1>
        <span class="count"
          >${count ? plural(count, "Wort", "Wörter") : ""}</span
        >
      </header>
      ${when(state.updateReady, () => UpdateNotice(actions))}
      <main aria-live="polite">
        ${state.tab === "train" ? TrainView(state, actions) : WordsView(state, actions)}
      </main>
    </div>
    ${TabBar(state.tab, actions.setTab)} ${ModalView(state, actions)}
  `;
}

const TabBar = (current, onSelect) => html`
  <nav class="tabs" role="tablist">
    ${TABS.map(
      (t) => html`
        <button
          role="tab"
          aria-selected=${String(t.id === current)}
          @click=${() => onSelect(t.id)}
        >
          ${t.icon} ${t.label}
        </button>
      `,
    )}
  </nav>
`;

const UpdateNotice = (actions) => html`
  <div class="notice update">
    <span>Eine neue Version der Lernwörter-Kiste ist da.</span>
    <button class="btn primary" @click=${actions.reloadApp}>Neu laden</button>
  </div>
`;
