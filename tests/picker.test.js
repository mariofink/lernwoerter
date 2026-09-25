import { test } from "node:test";
import assert from "node:assert/strict";
import { pickRound, weight } from "../js/picker.js";

const NOW = Date.UTC(2026, 8, 25, 12);
const word = (id, extra = {}) => ({
  id,
  text: id,
  list: "",
  right: 0,
  wrong: 0,
  lastAt: 0,
  ...extra,
});

// Einfacher, reproduzierbarer Zufall
function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

test("Eine Runde enthält kein Wort doppelt", () => {
  const words = Array.from({ length: 20 }, (_, i) => word("w" + i));
  for (let s = 1; s <= 50; s++) {
    const ids = pickRound(words, 10, { random: seeded(s), now: NOW });
    assert.equal(ids.length, 10);
    assert.equal(new Set(ids).size, 10);
  }
});

test("Gibt es weniger Wörter als gewünscht, kommen alle genau einmal", () => {
  const ids = pickRound([word("a"), word("b")], 5, {
    random: seeded(1),
    now: NOW,
  });
  assert.deepEqual(ids.slice().sort(), ["a", "b"]);
});

test("Leere Auswahl ergibt eine leere Runde", () => {
  assert.deepEqual(pickRound([], 5), []);
});

test("Wackelige Wörter wiegen mehr als sichere", () => {
  const shaky = word("x", { right: 1, wrong: 3 });
  const solid = word("y", { right: 5, wrong: 0 });
  assert.ok(weight(shaky, NOW) > weight(solid, NOW));
});

test("Neue Wörter wiegen mehr als sicher gekonnte", () => {
  assert.ok(weight(word("neu"), NOW) > weight(word("alt", { right: 4 }), NOW));
});

test("Gerade erst geübte Wörter wiegen weniger", () => {
  const recent = word("a", { right: 1, lastAt: NOW - 10 * 60 * 1000 });
  const earlier = word("b", { right: 1, lastAt: NOW - 24 * 60 * 60 * 1000 });
  assert.ok(weight(recent, NOW) < weight(earlier, NOW));
});

test("Wackelige Wörter kommen in vielen Runden deutlich öfter dran", () => {
  const words = [
    word("wackelig", { right: 0, wrong: 4 }),
    ...Array.from({ length: 9 }, (_, i) => word("sicher" + i, { right: 5 })),
  ];
  const random = seeded(42);
  let hits = 0;
  for (let i = 0; i < 2000; i++)
    if (pickRound(words, 1, { random, now: NOW })[0] === "wackelig") hits++;
  // Gleichverteilt wären es etwa 10 %
  assert.ok(hits / 2000 > 0.3, `nur ${hits} Treffer`);
});
