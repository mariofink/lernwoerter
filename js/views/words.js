// Wörter: neue Wörter eintragen, austauschen, Liste nach Gruppen anzeigen.

import {NO_LIST, compareListNames, listNames} from '../model.js';
import {ICONS, esc, getValue, setValue} from '../ui.js';

const BULK_SHOW = 'Mehrere Wörter auf einmal eintragen';
const BULK_HIDE = 'Mehrere Wörter ausblenden';
export const bulkToggleLabel = open => open ? BULK_HIDE : BULK_SHOW;

export function renderWords(root, state){
  // Eingaben überleben das Neuzeichnen
  const focusId = document.activeElement?.id;
  const bulkBox = document.getElementById('bulkBox');
  const keep = {
    newWord: getValue('newWord'),
    newList: getValue('newList') ?? state.lastList ?? '',
    bulk: getValue('bulk'),
    bulkOpen: bulkBox ? !bulkBox.hidden : false,
  };

  const q = state.search.trim().toLowerCase();
  const shown = state.words.filter(w => !q || w.text.toLowerCase().includes(q));
  const groups = {};
  for (const w of shown){
    const key = (w.list || '').trim() || NO_LIST;
    (groups[key] ??= []).push(w);
  }
  const keys = Object.keys(groups).sort(compareListNames);
  const lists = listNames(state.words);
  const hasWords = state.words.length > 0;

  root.innerHTML = `<div class="stack">
    <section class="panel stack">
      <p class="eyebrow" style="margin:0">Neues Lernwort</p>
      <form id="addForm" class="stack" style="gap:12px" autocomplete="off">
        <div class="add-row">
          <input id="newWord" class="input script" placeholder="z. B. Fahrrad" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Lernwort">
          <button class="btn primary" type="submit">Hinzufügen</button>
        </div>
        <div class="field">
          <label for="newList">Liste (optional, z. B. „Woche 5“ oder „Diktat Tiere“)</label>
          <input id="newList" class="input" list="listOptions" placeholder="${NO_LIST}">
          <datalist id="listOptions">${lists.map(l => `<option value="${esc(l)}"></option>`).join('')}</datalist>
        </div>
      </form>
      <button class="linkbtn" style="align-self:flex-start" data-act="toggleBulk">${bulkToggleLabel(keep.bulkOpen)}</button>
      <div id="bulkBox" class="stack" style="gap:8px" ${keep.bulkOpen ? '' : 'hidden'}>
        <textarea id="bulk" class="input script" placeholder="Ein Wort pro Zeile oder durch Komma getrennt" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Mehrere Wörter"></textarea>
        <button class="btn ghost block" data-act="bulkAdd">Alle hinzufügen (Liste von oben)</button>
      </div>
    </section>

    <section class="stack" style="gap:8px">
      <p class="eyebrow" style="margin:0 4px">Mit anderen Geräten austauschen</p>
      <div class="exchange">
        <button class="btn ghost" data-act="openShare" ${hasWords ? '' : 'disabled'}>${ICONS.share}Liste teilen</button>
        <button class="btn ghost" data-act="openImport">${ICONS.receive}Liste empfangen</button>
      </div>
    </section>

    ${state.words.length > 6 ? `<input id="search" class="input" type="search" placeholder="Wort suchen" aria-label="Wort suchen" value="${esc(state.search)}">` : ''}
    ${!hasWords ? `<div class="panel empty"><p class="muted">Noch keine Wörter. Trage oben das erste ein oder</p><button class="btn ghost" data-act="examples">Beispielwörter einfügen</button></div>` : ''}
    ${keys.map(k => group(k, groups[k])).join('')}
    ${hasWords && !shown.length ? `<p class="muted">Kein Wort passt zu „${esc(state.search)}“.</p>` : ''}
  </div>`;

  setValue('newWord', keep.newWord);
  setValue('newList', keep.newList);
  setValue('bulk', keep.bulk);
  if (focusId && !state.modal) document.getElementById(focusId)?.focus();
}

function group(name, words){
  const items = words
    .slice()
    .sort((a, b) => a.text.localeCompare(b.text, 'de'))
    .map(w => `<li><button data-edit="${esc(w.id)}"><span class="w">${esc(w.text)}</span>${badge(w)}</button></li>`)
    .join('');
  return `<section class="group">
    <h3><span>${esc(name)}</span><span>${words.length}</span></h3>
    <ul class="wordlist">${items}</ul>
  </section>`;
}

function badge(word){
  const right = word.right || 0, wrong = word.wrong || 0;
  if (!right && !wrong) return '<span class="pill new">neu</span>';
  const cls = wrong > right ? 'warn' : 'good';
  return `<span class="pill ${cls}">${right}/${right + wrong} richtig</span>`;
}
