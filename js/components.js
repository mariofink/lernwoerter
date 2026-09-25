// Wiederverwendbare Bausteine für die Ansichten.
// Jeder Baustein ist eine Funktion, die ein lit-html-Template zurückgibt.

import { html, nothing, svg } from "./vendor/lit-html.js";

// Die Pfade stehen in svg`…`, damit sie als SVG-Elemente entstehen.
const icon = (paths) => html`
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    ${paths}
  </svg>
`;

export const Icons = {
  pencil: icon(
    svg`<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" /><path d="M14 6l3 3" />`,
  ),
  book: icon(
    svg`<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3V4z" /><path
        d="M9 9h6M9 13h6"
      />`,
  ),
  share: icon(
    svg`<path d="M12 3v12M7 8l5-5 5 5" /><path
        d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
      />`,
  ),
  receive: icon(
    svg`<path d="M12 3v12M7 10l5 5 5-5" /><path
        d="M5 17v2a2 2 0 002 2h10a2 2 0 002-2v-2"
      />`,
  ),
};

/** Kleine Überschrift in Großbuchstaben. */
export const Eyebrow = (text) => html`<p class="eyebrow">${text}</p>`;

/** Große Zahl mit Erklärung daneben, z. B. „12 Wörter in der Kiste“. */
export const HeroCount = (value, text) => html`
  <div class="hero-count">
    <b>${value}</b><span class="muted">${text}</span>
  </div>
`;

/**
 * Auswahl aus mehreren Chips, von denen genau einer aktiv ist.
 * options: [{ value, label }]
 */
export const ChipGroup = ({ options, value, onSelect }) => html`
  <div class="row">
    ${options.map(
      (o) => html`
        <button
          type="button"
          class="chip"
          aria-pressed=${String(o.value === value)}
          @click=${() => onSelect(o.value)}
        >
          ${o.label}
        </button>
      `,
    )}
  </div>
`;

/** Auswahl mit Überschrift darüber. */
export const LabeledChoice = (label, choice) => html`
  <div class="stack tight">${Eyebrow(label)} ${choice}</div>
`;

/** Wie gut sitzt ein Wort? „neu“, „2/3 richtig“ … */
export function ScorePill(word) {
  const right = word.right || 0;
  const wrong = word.wrong || 0;
  if (!right && !wrong) return html`<span class="pill new">neu</span>`;
  const cls = wrong > right ? "warn" : "good";
  return html`<span class="pill ${cls}"
    >${right}/${right + wrong} richtig</span
  >`;
}

/** Ergebnis einer einzelnen Antwort in der Runde. */
export const ResultPill = (result) =>
  result === "good"
    ? html`<span class="pill good">richtig</span>`
    : html`<span class="pill warn">noch üben</span>`;

/** Rückfrage vor einer Aktion, die sich nicht rückgängig machen lässt. */
export const ConfirmBox = ({
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) => html`
  <div class="confirm">
    <span>${message}</span>
    <div class="row split">
      <button type="button" class="btn danger" @click=${onConfirm}>
        ${confirmLabel}
      </button>
      <button type="button" class="btn ghost" @click=${onCancel}>
        ${cancelLabel}
      </button>
    </div>
  </div>
`;

/** Dialog, der von unten hereinfährt. Ein Tipp auf den Hintergrund schließt ihn. */
export const Modal = ({ title, onClose, content }) => html`
  <div
    class="backdrop"
    @click=${(e) => e.target === e.currentTarget && onClose()}
  >
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalTitle"
    >
      <h2 id="modalTitle">${title}</h2>
      ${content}
    </div>
  </div>
`;

/** Vorschläge für ein Eingabefeld mit list="…". */
export const ListOptions = (id, names) => html`
  <datalist id=${id}>
    ${names.map((n) => html`<option value=${n}></option>`)}
  </datalist>
`;

/** Rendert einen Teil nur, wenn die Bedingung stimmt. */
export const when = (condition, template) => (condition ? template() : nothing);
