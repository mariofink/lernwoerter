// Üben: Startbildschirm, Wortkarte während der Runde, Auswertung.

import {listNames, wordsInList} from '../model.js';
import {drawLineatur} from '../lineatur.js';
import {esc} from '../ui.js';

const ROUND_SIZES = [3, 5, 10];

export function renderTrain(root, state){
  if (!state.words.length){ root.innerHTML = emptyState(); return; }
  const round = state.round;
  if (!round){ root.innerHTML = startScreen(state); return; }
  if (round.idx >= round.ids.length){ root.innerHTML = summary(state); return; }

  const word = state.words.find(w => w.id === round.ids[round.idx]);
  if (!word){ round.ids.splice(round.idx, 1); renderTrain(root, state); return; }
  root.innerHTML = card(state, word);
  drawLineatur(document.getElementById('lineatur'), word.text);
}

function emptyState(){
  return `<div class="panel empty">
    <p class="eyebrow">Noch keine Lernwörter</p>
    <p>Trage die Wörter ein, die dein Kind gerade in der Schule lernt. Danach schlägt die App dir jederzeit zufällige Wörter zum Diktieren vor.</p>
    <div class="stack">
      <button class="btn primary block" data-act="goWords">Wörter eintragen</button>
      <button class="btn ghost block" data-act="openImport">Liste von jemandem empfangen</button>
      <button class="btn ghost block" data-act="examples">Mit Beispielwörtern ausprobieren</button>
    </div>
  </div>`;
}

function startScreen(state){
  const lists = listNames(state.words);
  if (state.filter !== 'alle' && !lists.includes(state.filter)) state.filter = 'alle';
  const pool = wordsInList(state.words, state.filter);
  const shaky = pool.filter(w => (w.wrong || 0) > (w.right || 0)).length;
  return `<div class="stack">
    <section class="panel stack">
      <div>
        <p class="eyebrow">Bereit zum Üben</p>
        <div class="hero-count"><b>${pool.length}</b><span class="muted">${pool.length === 1 ? 'Wort' : 'Wörter'} in der Kiste${shaky ? ` · ${shaky} noch wackelig` : ''}</span></div>
      </div>
      ${lists.length ? `<div class="stack" style="gap:8px"><p class="eyebrow" style="margin:0">Welche Wörter?</p>
        <div class="row">
          <button class="chip" aria-pressed="${state.filter === 'alle'}" data-filter="alle">Alle</button>
          ${lists.map(l => `<button class="chip" aria-pressed="${state.filter === l}" data-filter="${esc(l)}">${esc(l)}</button>`).join('')}
        </div></div>` : ''}
      <div class="stack" style="gap:8px"><p class="eyebrow" style="margin:0">Wie viele?</p>
        <div class="row">${ROUND_SIZES.map(s => `<button class="chip" aria-pressed="${state.size === s}" data-size="${s}">${s} Wörter</button>`).join('')}</div>
      </div>
      <button class="btn primary block" data-act="start">Los geht's</button>
    </section>
    <p class="muted small" style="margin:0 4px">So geht's: Du liest das Wort vor, dein Kind schreibt es auf Papier. Danach vergleicht ihr und du tippst, ob es richtig war. Wörter, die noch nicht sitzen, kommen häufiger dran.</p>
    ${!state.standalone ? `<p class="notice">Tipp fürs iPhone: In Safari auf <b>Teilen</b> und dann <b>Zum Home-Bildschirm</b> tippen. Dann startet die Kiste wie eine App und funktioniert auch ohne Internet.</p>` : ''}
  </div>`;
}

function card(state, word){
  const round = state.round;
  const hidden = state.hide && !round.revealed;
  const progress = round.ids.map((id, i) => {
    const cls = round.results[id] ? 'done-' + round.results[id] : i === round.idx ? 'now' : '';
    return `<span class="${cls}"></span>`;
  }).join('');
  return `<div class="stack">
    <div class="toolbar">
      <span class="muted small">Wort ${round.idx + 1} von ${round.ids.length}</span>
      <button class="linkbtn" data-act="stop">Runde beenden</button>
    </div>
    <div class="progress" aria-hidden="true">${progress}</div>
    <div class="sheet enter ${hidden ? 'hide-word' : ''}">
      <div class="meta"><span>${esc(word.list || 'Lernwort')}</span><span>${statText(word)}</span></div>
      <canvas id="lineatur" role="img" aria-label="${esc(word.text)}"></canvas>
      ${hidden ? '<button class="reveal" data-act="reveal">Antippen zum Aufdecken</button>' : ''}
    </div>
    <div class="answer">
      <button class="btn warn" data-act="mark" data-res="warn">Noch üben</button>
      <button class="btn good" data-act="mark" data-res="good">Richtig</button>
    </div>
    <div class="toolbar">
      <button class="linkbtn" data-act="toggleHide">${state.hide ? 'Wort sofort zeigen' : 'Wort erst verdecken'}</button>
      <button class="linkbtn" data-act="skip">Überspringen</button>
    </div>
  </div>`;
}

function statText(word){
  const right = word.right || 0, wrong = word.wrong || 0;
  if (!right && !wrong) return 'neu';
  return `${right}× richtig · ${wrong}× geübt`;
}

function summary(state){
  const round = state.round;
  const done = round.ids.filter(id => round.results[id]);
  const good = done.filter(id => round.results[id] === 'good').length;
  const items = done.map(id => {
    const w = state.words.find(x => x.id === id);
    if (!w) return '';
    const pill = round.results[id] === 'good' ? '<span class="pill good">richtig</span>' : '<span class="pill warn">noch üben</span>';
    return `<li><span>${esc(w.text)}</span>${pill}</li>`;
  }).join('');
  return `<div class="stack">
    <section class="panel stack">
      <div>
        <p class="eyebrow">Runde geschafft</p>
        <div class="hero-count"><b>${good}/${done.length}</b><span class="muted">richtig geschrieben</span></div>
      </div>
      ${done.length ? `<ul class="result-list">${items}</ul>` : '<p class="muted" style="margin:0">Keine Wörter bewertet.</p>'}
    </section>
    <button class="btn primary block" data-act="start">Noch eine Runde</button>
    <button class="btn ghost block" data-act="stop">Fertig</button>
  </div>`;
}
