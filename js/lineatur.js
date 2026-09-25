// Zeichnet ein Wort auf Grundschul-Lineatur:
// Oberlinie, Mittelband (schattiert), Grundlinie (rot), Unterlinie.
// Die Linien richten sich nach den echten Maßen der Schrift.
//
// Das Wort steht in Schulausgangsschrift (Playwrite DE SAS von Google Fonts),
// so wie die Kinder es in der Grundschule schreiben lernen.

export const LINEATUR_FONT = "Playwrite DE SAS";
const FONT = `"${LINEATUR_FONT}", "Andika", cursive`;
const MAX_SIZE = 84,
  MIN_SIZE = 22,
  PAD = 14;

export function drawLineatur(canvas, text) {
  if (!canvas) return;
  const css = getComputedStyle(document.documentElement);
  const color = (name) => css.getPropertyValue(name).trim();
  const W = canvas.parentElement.clientWidth - 24;
  const dpr = window.devicePixelRatio || 1;
  const ctx = canvas.getContext("2d");

  // Schrift so groß wie möglich, aber das Wort muss in die Breite passen
  let size = Math.min(MAX_SIZE, W * 0.2);
  ctx.font = `400 ${size}px ${FONT}`;
  while (ctx.measureText(text).width > W - PAD * 2 && size > MIN_SIZE) {
    size -= 2;
    ctx.font = `400 ${size}px ${FONT}`;
  }
  const m = (s) => ctx.measureText(s);
  const ascender = m("Hdlk").actualBoundingBoxAscent || size * 0.72;
  const xHeight = m("x").actualBoundingBoxAscent || size * 0.48;
  const descender = m("gjpy").actualBoundingBoxDescent || size * 0.22;
  const base = size * 0.3 + ascender;
  const H = Math.ceil(base + descender + size * 0.3);

  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = color("--rule-band");
  ctx.fillRect(0, base - xHeight, W, xHeight);

  const line = (y, stroke, width) => {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(W, Math.round(y) + 0.5);
    ctx.stroke();
  };
  line(base - ascender, color("--rule"), 1); // Oberlinie
  line(base - xHeight, color("--rule"), 1); // Mittellinie
  line(base, color("--rule-mid"), 1.5); // Grundlinie
  line(base + descender, color("--rule"), 1); // Unterlinie

  ctx.font = `400 ${size}px ${FONT}`;
  ctx.fillStyle = color("--ink-blue");
  ctx.textBaseline = "alphabetic";
  const textWidth = ctx.measureText(text).width;
  ctx.fillText(text, Math.max(PAD, (W - textWidth) / 2), base);
}
