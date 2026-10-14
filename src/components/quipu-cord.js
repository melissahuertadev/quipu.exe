import Phaser from 'phaser';

const shade = (color, amount) => Phaser.Display.Color.IntegerToColor(color).darken(amount).color;
const lighten = (color, amount) => Phaser.Display.Color.IntegerToColor(color).brighten(amount).color;

/**
 * Dibuja una cuerda colgante de aspecto tejido dentro de un Container existente.
 * `knots` determina los nudos visibles cuando `isLength` es false; en cuerdas de
 * longitud se muestran dos nudos decorativos para conservar el mismo lenguaje.
 */
export function drawFiberRope(scene, container, { color, width, length, knots, isLength = false, gap = 80 }) {
  const dark = shade(color, 32);
  const light = lighten(color, 24);
  const body = scene.add.graphics();

  // Sombra, cuerpo, luz lateral y diagonales alternas: sugieren torsión/fibra.
  body.lineStyle(width + 5, 0x080a15, .43); body.beginPath(); body.moveTo(3, 1); body.lineTo(3, length + 3); body.strokePath();
  body.lineStyle(width + 2, dark, 1); body.beginPath(); body.moveTo(0, 0); body.lineTo(0, length); body.strokePath();
  body.lineStyle(width, color, 1); body.beginPath(); body.moveTo(0, 0); body.lineTo(0, length); body.strokePath();
  body.lineStyle(Math.max(1, width * .23), light, .8); body.beginPath(); body.moveTo(-width * .2, 2); body.lineTo(-width * .2, length - 2); body.strokePath();
  const twistStep = 10;
  for (let y = 3, n = 0; y < length - 3; y += twistStep, n++) {
    const offset = n % 2 ? width * .34 : -width * .34;
    body.lineStyle(Math.max(1.2, width * .34), n % 2 ? light : dark, .8);
    body.beginPath(); body.moveTo(offset, y); body.lineTo(-offset, Math.min(length, y + twistStep * .58)); body.strokePath();
  }
  container.add(body);

  const knotGraphics = scene.add.graphics();
  const visibleKnots = isLength ? 2 : knots;
  const firstKnot = Math.min(30, length * .2);
  const knotGap = Math.min(36, (length - firstKnot - 16) / Math.max(1, visibleKnots - 1));
  for (let index = 0; index < visibleKnots; index++) {
    const y = firstKnot + index * knotGap;
    const knotWidth = Math.min(gap * .42, width * 2.6);
    const side = index % 2 ? 1 : -1;
    drawFiberKnot(knotGraphics, { x: side * width * .38, y, width: knotWidth, cordWidth: width, base: color, shadow: dark, highlight: light });
    if (!isLength && index < visibleKnots - 1) {
      knotGraphics.lineStyle(Math.max(2, width * .48), dark, .82); knotGraphics.beginPath(); knotGraphics.moveTo(0, y + width * .5); knotGraphics.lineTo(0, y + knotGap - width * .5); knotGraphics.strokePath();
      knotGraphics.lineStyle(Math.max(1.4, width * .26), color, 1); knotGraphics.beginPath(); knotGraphics.moveTo(0, y + width * .5); knotGraphics.lineTo(0, y + knotGap - width * .5); knotGraphics.strokePath();
    }
  }
  container.add(knotGraphics);

  // Cinco hebras abiertas forman el fleco inferior.
  const fringe = scene.add.graphics();
  for (let strand = -2; strand <= 2; strand++) {
    const startX = strand * Math.max(1.5, width * .26);
    const endX = startX + (strand % 2 ? 2 : -2);
    const endY = length + 10 + (2 - Math.abs(strand)) * 2;
    fringe.lineStyle(Math.max(1.2, width * .22), strand % 2 ? light : color, .95);
    fringe.beginPath(); fringe.moveTo(startX, length - 1); fringe.lineTo(endX, endY); fringe.strokePath();
    fringe.lineStyle(1, dark, .58); fringe.beginPath(); fringe.moveTo(startX + 1, length - 1); fringe.lineTo(endX + 1, endY - 1); fringe.strokePath();
  }
  container.add(fringe);
}

/** Dibuja un lazo orgánico con núcleo y cruces de hilo sobre Graphics. */
export function drawFiberKnot(graphics, { x, y, width, cordWidth, base, shadow, highlight }) {
  graphics.lineStyle(cordWidth * .62, shadow, .98);
  graphics.strokeEllipse(x, y, width, Math.max(7, cordWidth * 1.45), 18);
  graphics.lineStyle(cordWidth * .4, base, 1);
  graphics.strokeEllipse(x, y, width * .78, Math.max(5, cordWidth * 1.05), 18);
  graphics.lineStyle(cordWidth * .38, highlight, .96);
  graphics.beginPath(); graphics.moveTo(x - cordWidth * .52, y - cordWidth * .48); graphics.lineTo(x + cordWidth * .52, y + cordWidth * .48); graphics.strokePath();
  graphics.beginPath(); graphics.moveTo(x - cordWidth * .52, y + cordWidth * .48); graphics.lineTo(x + cordWidth * .52, y - cordWidth * .48); graphics.strokePath();
}

/** Dibuja la cuerda horizontal gruesa de la que cuelgan las cuerdas hijas. */
export function drawMainCord(scene, { x, y, width, color = 0xd7bb83 }) {
  const main = scene.add.container(x, y);
  const graphics = scene.add.graphics();
  graphics.lineStyle(19, 0x090b18, .5); graphics.beginPath(); graphics.moveTo(-width * .43, 4); graphics.lineTo(width * .43, 4); graphics.strokePath();
  graphics.lineStyle(15, 0x755634, 1); graphics.beginPath(); graphics.moveTo(-width * .43, 0); graphics.lineTo(width * .43, 0); graphics.strokePath();
  graphics.lineStyle(10, color, 1); graphics.beginPath(); graphics.moveTo(-width * .43, -2); graphics.lineTo(width * .43, -2); graphics.strokePath();
  for (let px = -width * .43; px < width * .43; px += 12) {
    graphics.lineStyle(2.1, px % 24 ? 0xf0d7a2 : 0x8d704a, .86);
    graphics.beginPath(); graphics.moveTo(px, -6); graphics.lineTo(px + 6, 4); graphics.strokePath();
  }
  main.add(graphics); main.setDepth(1);
  return main;
}
