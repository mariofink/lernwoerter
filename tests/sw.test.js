// Prüft, dass der Service Worker alle Dateien der App kennt.
// Fehlt eine Datei, funktioniert die installierte App offline nicht.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join, relative} from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const listed = [...sw.match(/const APP_FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);

function filesIn(dir){
  return readdirSync(join(ROOT, dir), {withFileTypes: true}).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesIn(path) : [relative('.', path)];
  });
}

test('Jede Datei in APP_FILES existiert', () => {
  for (const file of listed.filter(f => f !== './')){
    assert.ok(existsSync(join(ROOT, file)), `${file} fehlt`);
  }
});

test('Alle CSS-, JS- und Icon-Dateien stehen in APP_FILES', () => {
  for (const file of [...filesIn('css'), ...filesIn('js'), ...filesIn('icons')]){
    assert.ok(listed.includes(file), `${file} fehlt in sw.js APP_FILES`);
  }
});

test('Alle in index.html eingebundenen lokalen Dateien stehen in APP_FILES', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]).filter(u => !/^https?:/.test(u));
  for (const ref of refs) assert.ok(listed.includes(ref), `${ref} fehlt in sw.js APP_FILES`);
});
