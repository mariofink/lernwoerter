// Verbindung zum Service Worker: registrieren, Version abfragen, Updates melden.
//
// Die Versionsnummer steht nur in sw.js. Die App fragt den laufenden Service
// Worker danach und zeigt so die Version an, die wirklich auf dem Gerät läuft.

const DEV_VERSION = "Entwicklung";

/**
 * @param {object} handlers
 * @param {(version: string) => void} handlers.onVersion  aktuelle Version
 * @param {() => void} handlers.onUpdate  eine neue Version ist aktiv, die Seite läuft aber noch mit der alten
 */
export async function connectServiceWorker({ onVersion, onUpdate }) {
  // Lokal (http://localhost) ohne Service Worker entwickeln, damit nichts veraltet zwischengespeichert wird
  if (!("serviceWorker" in navigator) || location.protocol !== "https:") {
    onVersion(DEV_VERSION);
    return;
  }

  // Beim ersten Besuch gibt es noch keinen Service Worker; dann ist die erste Übernahme kein Update
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", async () => {
    if (hadController) onUpdate();
    else onVersion(await askVersion(navigator.serviceWorker.controller));
  });

  let registration;
  try {
    registration = await navigator.serviceWorker.register("sw.js", {
      updateViaCache: "none",
    });
  } catch {
    onVersion(DEV_VERSION);
    return;
  }

  const worker =
    navigator.serviceWorker.controller ??
    (await navigator.serviceWorker.ready).active;
  onVersion(await askVersion(worker));

  // Auf dem iPhone bleibt die App oft tagelang im Hintergrund offen:
  // beim Zurückkehren nach einer neuen Version schauen
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible")
      registration.update().catch(() => {});
  });
}

/** Fragt einen Service Worker nach seiner Version; nach 3 Sekunden ohne Antwort „unbekannt“. */
function askVersion(worker) {
  if (!worker) return Promise.resolve("unbekannt");
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve("unbekannt"), 3000);
    channel.port1.onmessage = (e) => {
      clearTimeout(timer);
      resolve(e.data?.version ?? "unbekannt");
    };
    worker.postMessage({ type: "version" }, [channel.port2]);
  });
}
