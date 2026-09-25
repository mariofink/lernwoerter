// Dialoge: Wort bearbeiten, Liste teilen, Liste empfangen.
// state.modal ist {type:'edit', id} | {type:'share'} | {type:'import', text, fromLink}.

import {NO_LIST, listNames, wordsInList} from '../model.js';
import {importStats, parseMessage} from '../exchange.js';
import {ICONS, esc, getValue, plural, setValue} from '../ui.js';

export function renderModal(root, state){
  const m = state.modal;
  if (!m){ root.innerHTML = ''; return; }
  if (m.type === 'edit') return renderEdit(root, state, m);
  if (m.type === 'share') return renderShare(root, state);
  if (m.type === 'import') return renderImport(root, state, m);
}

function shell(title, body){
  return `<div class="backdrop" data-act="closeModal">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <h2 id="modalTitle">${title}</h2>${body}
    </div></div>`;
}

function confirmBox(text, yesAct, yesLabel, noLabel){
  return `<div class="confirm"><span>${text}</span>
    <div class="row">
      <button class="btn danger" style="flex:1" data-act="${yesAct}">${yesLabel}</button>
      <button class="btn ghost" style="flex:1" data-act="cancelConfirm">${noLabel}</button>
    </div></div>`;
}

function renderEdit(root, state, m){
  const w = state.words.find(x => x.id === m.id);
  if (!w){ state.modal = null; root.innerHTML = ''; return; }
  // Getippte Änderungen behalten, wenn der Dialog neu gezeichnet wird
  const typedText = getValue('editText'), typedList = getValue('editList');
  const last = w.lastAt ? ', zuletzt am ' + new Date(w.lastAt).toLocaleDateString('de-DE', {day: 'numeric', month: 'long'}) : '';
  root.innerHTML = shell('Lernwort bearbeiten', `
    <div class="field"><label for="editText">Wort</label>
      <input id="editText" class="input script" value="${esc(w.text)}" autocapitalize="off" autocorrect="off" spellcheck="false"></div>
    <div class="field"><label for="editList">Liste</label>
      <input id="editList" class="input" list="listOptionsEdit" value="${esc(w.list || '')}" placeholder="${NO_LIST}">
      <datalist id="listOptionsEdit">${listNames(state.words).map(l => `<option value="${esc(l)}"></option>`).join('')}</datalist></div>
    <p class="muted small" style="margin:0">Geübt: ${w.right || 0}× richtig, ${w.wrong || 0}× noch nicht${last}.</p>
    <button class="btn primary block" data-act="saveEdit">Speichern</button>
    <div class="row">
      <button class="btn ghost" style="flex:1" data-act="resetStats">Zähler zurücksetzen</button>
      <button class="btn danger" style="flex:1" data-act="askConfirm">Löschen</button>
    </div>
    ${state.confirm ? confirmBox(`„${esc(w.text)}“ wirklich löschen?`, 'doDelete', 'Ja, löschen', 'Behalten') : ''}
    <button class="linkbtn" data-act="closeModal">Abbrechen</button>`);
  setValue('editText', typedText);
  setValue('editList', typedList);
}

function renderShare(root, state){
  const lists = listNames(state.words);
  if (state.shareList !== 'alle' && !lists.includes(state.shareList)) state.shareList = 'alle';
  const words = wordsInList(state.words, state.shareList);
  const sample = words.slice(0, 8).map(w => w.text).join(', ') + (words.length > 8 ? ' …' : '');
  root.innerHTML = shell('Liste teilen', `
    <p class="muted small" style="margin:0">Schick die Wörter per Nachricht, AirDrop oder Mail. Wer sie bekommt, kopiert die Nachricht und tippt in der eigenen Lernwörter-Kiste auf „Liste empfangen“. Übungszähler werden nicht mitgeschickt.</p>
    ${lists.length ? `<div class="stack" style="gap:8px"><p class="eyebrow" style="margin:0">Was teilen?</p><div class="row">
      <button class="chip" aria-pressed="${state.shareList === 'alle'}" data-sharelist="alle">Alle (${state.words.length})</button>
      ${lists.map(l => `<button class="chip" aria-pressed="${state.shareList === l}" data-sharelist="${esc(l)}">${esc(l)}</button>`).join('')}
    </div></div>` : ''}
    <div class="preview">${plural(words.length, 'Wort', 'Wörter')}: <span style="font-family:var(--script)">${esc(sample)}</span></div>
    <button class="btn primary block" data-act="doShare">${ICONS.share}Teilen</button>
    <button class="btn ghost block" data-act="doCopy">Als Text kopieren</button>
    <button class="linkbtn" data-act="closeModal">Abbrechen</button>`);
}

function renderImport(root, state, m){
  const items = parseMessage(m.text);
  const stats = importStats(items, state.words);
  const openedInSafari = m.fromLink && !state.standalone;
  root.innerHTML = shell('Liste empfangen', `
    ${openedInSafari ? `<p class="notice">Nutzt du die Lernwörter-Kiste auf dem Home-Bildschirm? Dann tippe auf <b>Nachricht kopieren</b>, öffne die App und füge sie dort unter „Liste empfangen“ ein. Die App auf dem Home-Bildschirm hat einen eigenen Speicher.</p>
      <button class="btn ghost block" data-act="copyIncoming">Nachricht kopieren</button>` : ''}
    ${m.fromLink ? '' : `<p class="muted small" style="margin:0">Kopiere die ganze Nachricht mit der Wortliste und füge sie hier ein.</p>
      <button class="btn ghost block" data-act="pasteClipboard">Aus Zwischenablage einfügen</button>
      <textarea id="importText" class="input" placeholder="Hier einfügen" aria-label="Empfangene Nachricht" autocapitalize="off" autocorrect="off" spellcheck="false"></textarea>`}
    <div id="importPreview">${importPreview(m.text, state.words)}</div>
    <div class="stack" style="gap:8px" id="importActions" ${stats.total ? '' : 'hidden'}>
      <button class="btn primary block" data-act="doImportMerge">Neue Wörter hinzufügen</button>
      ${state.words.length ? `<button class="btn ghost block" data-act="askConfirm">Meine Liste ersetzen</button>` : ''}
      ${state.confirm ? confirmBox(
        `Deine ${state.words.length} Wörter werden durch die empfangenen ${stats.total} ersetzt. Übungszähler bleiben bei Wörtern erhalten, die in beiden Listen stehen.`,
        'doImportReplace', 'Ja, ersetzen', 'Abbrechen') : ''}
    </div>
    <button class="linkbtn" data-act="closeModal">Schließen</button>`);
  if (!m.fromLink) setValue('importText', m.text);
}

/** Vorschau unter dem Eingabefeld; wird beim Tippen live aktualisiert. */
export function importPreview(text, words){
  if (!String(text ?? '').trim()) return '';
  const items = parseMessage(text);
  const stats = importStats(items, words);
  if (!stats.total) return '<div class="preview bad">In diesem Text wurden keine Lernwörter gefunden. Kopiere bitte die ganze Nachricht.</div>';
  const lists = [...new Set(items.map(i => i.list || NO_LIST))];
  return `<div class="preview"><b>${plural(stats.total, 'Wort', 'Wörter')}</b>, davon ${stats.fresh} neu für dich<br><span class="muted small">${esc(lists.join(' · '))}</span></div>`;
}
