// Kleine Helfer rund um den Browser, unabhängig von den Ansichten.

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function focusById(id) {
  document.getElementById(id)?.focus();
}

let toastTimer;
export function toast(message) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 2400);
}

/** Kopiert Text; fällt auf execCommand zurück, wo die Clipboard-API fehlt. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      /* nichts */
    }
    ta.remove();
    return ok;
  }
}

/** Hält den Bildschirm während einer Übungsrunde an, wo der Browser das erlaubt. */
let wakeLock = null;
export async function keepAwake(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock)
      wakeLock = await navigator.wakeLock.request("screen");
    if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    wakeLock = null;
  }
}

/** Lässt ein Element kurz einschweben, außer bei „Bewegung reduzieren“. */
export function slideIn(el) {
  if (!el?.animate || matchMedia("(prefers-reduced-motion: reduce)").matches)
    return;
  el.animate(
    [
      { transform: "translateY(8px)", opacity: 0.3 },
      { transform: "none", opacity: 1 },
    ],
    { duration: 280, easing: "ease-out" },
  );
}
