/** Dibuja fondo índigo, resplandor, dos cordilleras, neblina y polvo ambiental. */
export function drawMountainBackdrop(scene, { width, height, particleTexture = 'quipu-dust' }) {
  scene.add.rectangle(0, 0, width, height, 0x111327).setOrigin(0);

  const glow = scene.add.graphics();
  for (let i = 20; i >= 0; i--) {
    glow.fillStyle(0xe4a46e, 0.006 + (20 - i) * 0.0008);
    glow.fillCircle(width * .5, height * .35, Math.max(width, height) * (0.12 + i * .018));
  }

  const mountains = scene.add.graphics();
  mountains.fillStyle(0x171c37, .96);
  mountains.beginPath(); mountains.moveTo(0, height * .52);
  mountains.lineTo(width * .16, height * .30); mountains.lineTo(width * .29, height * .50);
  mountains.lineTo(width * .47, height * .26); mountains.lineTo(width * .68, height * .51);
  mountains.lineTo(width * .84, height * .32); mountains.lineTo(width, height * .49);
  mountains.lineTo(width, height); mountains.lineTo(0, height); mountains.closePath(); mountains.fillPath();

  mountains.fillStyle(0x11162d, .92);
  mountains.beginPath(); mountains.moveTo(0, height * .64); mountains.lineTo(width * .22, height * .46);
  mountains.lineTo(width * .42, height * .66); mountains.lineTo(width * .71, height * .43);
  mountains.lineTo(width, height * .64); mountains.lineTo(width, height); mountains.lineTo(0, height); mountains.closePath(); mountains.fillPath();

  const haze = scene.add.graphics();
  haze.fillStyle(0x7d6580, .055); haze.fillEllipse(width * .5, height * .61, width * 1.15, height * .22);

  const dust = scene.add.particles(0, 0, particleTexture, {
    x: { min: 0, max: width }, y: { min: height * .12, max: height * .74 },
    lifespan: { min: 4500, max: 8500 }, speedY: { min: -5, max: -16 }, speedX: { min: -5, max: 5 },
    scale: { start: .8, end: 0 }, alpha: { start: .44, end: 0 },
    tint: [0xf0c78b, 0xed9f74, 0xb1acd9], frequency: 150, quantity: 1, blendMode: 'ADD',
  });
  dust.setDepth(.2);
}
