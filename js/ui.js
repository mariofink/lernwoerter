// Kleine Helfer für die Oberfläche.

export const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const getValue = id => document.getElementById(id)?.value ?? null;

export function setValue(id, value){
  const el = document.getElementById(id);
  if (el && value != null) el.value = value;
}

export function focusSoon(id){
  setTimeout(() => document.getElementById(id)?.focus(), 60);
}

let toastTimer;
export function toast(message){
  let el = document.querySelector('.toast');
  if (!el){
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
}

/** Kopiert Text; fällt auf execCommand zurück, wo die Clipboard-API fehlt. */
export async function copyText(text){
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* nichts */ }
    ta.remove();
    return ok;
  }
}

/** Hält den Bildschirm während einer Übungsrunde an, wo der Browser das erlaubt. */
let wakeLock = null;
export async function keepAwake(on){
  try {
    if (on && !wakeLock && navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
    if (!on && wakeLock){ await wakeLock.release(); wakeLock = null; }
  } catch {
    wakeLock = null;
  }
}

const svg = path => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
export const ICONS = {
  share: svg('<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>'),
  receive: svg('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 17v2a2 2 0 002 2h10a2 2 0 002-2v-2"/>'),
};
