// Offline-Unterstützung: App-Dateien und Schriften werden zwischengespeichert.
// Bei Änderungen an der App VERSION erhöhen, damit Geräte die neue Fassung laden.
const VERSION = 'v2';
const APP_CACHE = 'lernwoerter-app-' + VERSION;
const FONT_CACHE = 'lernwoerter-fonts';
// Jede Datei der App muss hier stehen, sonst fehlt sie offline.
// tests/sw.test.js prüft das.
const APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/tokens.css',
  'css/base.css',
  'css/components.css',
  'js/main.js',
  'js/model.js',
  'js/store.js',
  'js/picker.js',
  'js/exchange.js',
  'js/lineatur.js',
  'js/ui.js',
  'js/views/train.js',
  'js/views/words.js',
  'js/views/modals.js',
  'icons/icon.svg',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('lernwoerter-app-') && k !== APP_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Schriften: einmal laden, dann aus dem Speicher
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com'){
    e.respondWith(caches.open(FONT_CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // App-Dateien: zuerst Netz (für Updates), ohne Netz aus dem Speicher
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok){ const copy = res.clone(); caches.open(APP_CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, {ignoreSearch: true}).then(hit => hit || caches.match('index.html')))
  );
});
