import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyImport,
  buildMessage,
  decodePayload,
  encodePayload,
  groupWords,
  importStats,
  parseMessage,
} from "../js/exchange.js";

const APP = "https://mariofink.github.io/lernwoerter/";
const word = (text, list = "", extra = {}) => ({
  id: "id-" + text,
  text,
  list,
  right: 0,
  wrong: 0,
  lastAt: 0,
  createdAt: 0,
  ...extra,
});

// Eine Nachricht, wie sie Version 1 der App verschickt hat. Sie muss für immer lesbar bleiben.
const V1_MESSAGE =
  "Lernwörter (4)\n\nDiktat: Tiere: Maus\nWoche 5: Fahrrad, Straße\nOhne Liste: Äpfel\n\nZum Übernehmen: Diese Nachricht kopieren, die Lernwörter-App öffnen und unter „Wörter“ auf „Liste empfangen“ tippen.\nhttps://mariofink.github.io/lernwoerter/#import=eyJ2IjoxLCJnIjpbWyJEaWt0YXQ6IFRpZXJlIixbIk1hdXMiXV0sWyJXb2NoZSA1IixbIkZhaHJyYWQiLCJTdHJhw59lIl1dLFsiIixbIsOEcGZlbCJdXV19";

const sortItems = (items) =>
  items.slice().sort((a, b) => a.text.localeCompare(b.text));

test("Nachrichten aus Version 1 bleiben lesbar", () => {
  assert.deepEqual(sortItems(parseMessage(V1_MESSAGE)), [
    { text: "Äpfel", list: "" },
    { text: "Fahrrad", list: "Woche 5" },
    { text: "Maus", list: "Diktat: Tiere" },
    { text: "Straße", list: "Woche 5" },
  ]);
});

test("Hin und zurück: Umlaute, ß und Listen bleiben erhalten", () => {
  const words = [
    word("Straße", "Woche 5"),
    word("Übung", "Woche 5"),
    word("Mäuse"),
    word("groß", "Diktat Tiere"),
  ];
  const items = parseMessage(buildMessage(words, APP));
  assert.deepEqual(
    sortItems(items),
    sortItems(words.map((w) => ({ text: w.text, list: w.list }))),
  );
});

test("Nachricht ist lesbar und enthält den Link zur App", () => {
  const msg = buildMessage([word("Hund", "Woche 2"), word("Baum")], APP);
  assert.match(msg, /^Lernwörter \(2\)/);
  assert.match(msg, /^Woche 2: Hund$/m);
  assert.match(msg, /^Ohne Liste: Baum$/m);
  assert.ok(msg.includes(APP + "#import="));
});

test("Der Link allein reicht zum Empfangen", () => {
  const msg = buildMessage([word("Hund", "Woche 2")], APP);
  const link = msg.split("\n").at(-1);
  assert.deepEqual(parseMessage(link), [{ text: "Hund", list: "Woche 2" }]);
});

test("Ohne Link werden die lesbaren Zeilen gelesen", () => {
  const text =
    "Lernwörter (3)\n\nDiktat Tiere: Maus, Pferd\nOhne Liste: Kuh\n\nZum Übernehmen: …";
  assert.deepEqual(parseMessage(text), [
    { text: "Maus", list: "Diktat Tiere" },
    { text: "Pferd", list: "Diktat Tiere" },
    { text: "Kuh", list: "" },
  ]);
});

test("Ein beschädigter Link fällt auf die lesbaren Zeilen zurück", () => {
  const text = "Woche 1: Hund\nhttps://x/#import=kaputt!!";
  assert.deepEqual(parseMessage(text), [{ text: "Hund", list: "Woche 1" }]);
});

test("Fremder Text ergibt keine Wörter", () => {
  assert.deepEqual(parseMessage("Hallo, kommst du heute Abend?"), []);
  assert.deepEqual(parseMessage(""), []);
  assert.deepEqual(parseMessage(null), []);
});

test("Payload-Kodierung ist URL-sicher", () => {
  const payload = encodePayload({ v: 1, g: [["", ["???>>>ÄÖÜ"]]] });
  assert.match(payload, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodePayload(payload), { v: 1, g: [["", ["???>>>ÄÖÜ"]]] });
});

test("groupWords: Listen sortiert, „Ohne Liste“ zuletzt, Woche 2 vor Woche 10", () => {
  const groups = groupWords([
    word("a", "Woche 10"),
    word("b"),
    word("c", "Woche 2"),
  ]);
  assert.deepEqual(
    groups.map((g) => g[0]),
    ["Woche 2", "Woche 10", ""],
  );
});

test("importStats zählt neue und doppelte Wörter richtig", () => {
  const items = [
    { text: "Hund", list: "" },
    { text: "Katze", list: "" },
    { text: "Katze", list: "X" },
  ];
  assert.deepEqual(importStats(items, [word("Hund")]), { total: 2, fresh: 1 });
});

test("Hinzufügen: nur neue Wörter, vorhandene bleiben unverändert", () => {
  const hund = word("Hund", "Alt", { right: 3 });
  const { words, count } = applyImport(
    [hund],
    [
      { text: "Hund", list: "Neu" },
      { text: "Katze", list: "Neu" },
      { text: "Katze", list: "Neu" },
    ],
    "merge",
  );
  assert.equal(count, 1);
  assert.equal(words.length, 2);
  assert.equal(words[0], hund);
  assert.equal(words[1].text, "Katze");
  assert.equal(words[1].right, 0);
});

test("Ersetzen: Zähler bleiben bei gemeinsamen Wörtern, Rest fällt weg", () => {
  const old = [word("Hund", "Alt", { right: 3, wrong: 1 }), word("Baum")];
  const { words, count } = applyImport(
    old,
    [
      { text: "Hund", list: "Neu" },
      { text: "Katze", list: "" },
    ],
    "replace",
  );
  assert.equal(count, 2);
  assert.deepEqual(
    words.map((w) => w.text),
    ["Hund", "Katze"],
  );
  assert.equal(words[0].right, 3);
  assert.equal(words[0].wrong, 1);
  assert.equal(words[0].list, "Neu");
  assert.equal(words[0].id, "id-Hund");
});

test("applyImport verändert die übergebene Liste nicht", () => {
  const old = [word("Hund")];
  applyImport(old, [{ text: "Katze", list: "" }], "merge");
  assert.equal(old.length, 1);
});
