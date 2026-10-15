import Phaser from 'phaser';
import './style.css';
import { drawFiberRope, drawMainCord } from './components/quipu-cord.js';
import { drawMountainBackdrop } from './components/mountain-backdrop.js';
import { AudioManager } from './audio/audio-manager.js';
import {
  createRunId, getLatestCompletedRun, getPendingRuns, getRun,
  getStablePlayerId, PLAYER_NAME_KEY, saveCompletedRun, updateRun,
} from './ranking.js';
import { fetchGlobalEntries, leaderboardConfigured, submitCompletedRun } from './leaderboard-client.js';

const LEVELS = [
  { title: 'La calma', rule: 'Ordena de menos a más nudos', type: 'nudos', values: [5, 1, 4, 2], colors: [0xd67d62, 0xe2b85f, 0x55aaa0, 0x8792d0], message: 'No todo lo que sentimos necesita una respuesta inmediata. A veces, escucharnos es el primer paso para encontrar calma.' },
  { title: 'Las diferencias', rule: 'Ordena de más corta a más larga', type: 'cm', values: [68, 32, 54, 21, 44], colors: [0x55aaa0, 0x8792d0, 0xe2b85f, 0xd67d62, 0xdb8da1], message: 'Las diferencias no tienen que separarnos. Pueden enseñarnos nuevas formas de mirar el mismo mundo.' },
  { title: 'La escucha', rule: 'Ordena de menos a más nudos', type: 'nudos', values: [8, 3, 11, 1, 6, 4], colors: [0x8792d0, 0xdb8da1, 0xd67d62, 0x55aaa0, 0xe2b85f, 0x8792d0], message: 'Escuchar no es esperar tu turno para hablar. Es dejar que la experiencia del otro encuentre un lugar en ti.' },
  { title: 'Soltar el pasado', rule: 'Ordena de más corta a más larga', type: 'cm', values: [74, 25, 51, 38], colors: [0xe2b85f, 0xd67d62, 0x55aaa0, 0xdb8da1], message: 'Soltar no borra lo vivido. Abre las manos para que el presente pueda llegar.' },
  { title: 'La convivencia', rule: 'Ordena de menos a más nudos', type: 'nudos', values: [9, 2, 7, 4, 1], colors: [0x55aaa0, 0xe2b85f, 0x8792d0, 0xd67d62, 0xdb8da1], message: 'Convivir es aprender a cuidar el espacio que compartimos. La paz se teje entre muchas manos.' },
];

const C = { cream: 0xf6f0e5, muted: 0xc3bdaf, line: 0x504a3f, accent: 0xe8a178, dark: 0x171714, panel: 0x28271f, night: 0x111327, indigo: 0x252b50, cord: 0xd7bb83 };
const HEX = (value) => `#${value.toString(16).padStart(6, '0')}`;
const audio = new AudioManager();
const FINAL_REFLECTION = 'Entre una voz y otra, queda un silencio donde los vínculos siguen respirando.';
const readPlayerName = () => { try { return localStorage.getItem(PLAYER_NAME_KEY) || ''; } catch { return ''; } };
const savePlayerName = (name) => { try { localStorage.setItem(PLAYER_NAME_KEY, name); } catch { /* The game remains playable when storage is blocked. */ } };
const formatTime = (milliseconds) => {
  if (!Number.isFinite(milliseconds)) return '--:--';
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
};

class QuipuScene extends Phaser.Scene {
  constructor() { super('Quipu'); }
  create() {
    this.createDustTexture();
    audio.initialize();
    this.levelIndex = 0;
    this.moves = 0;
    this.totalMoves = 0;
    this.playerName = readPlayerName();
    this.submittingRuns = new Set();
    this.rankingState = { status: 'idle', entries: [] };
    this.completedRunId = null;
    this.orders = LEVELS.map(level => level.values.map((value, id) => ({ value, id, color: level.colors[id] })).reverse());
    this.scale.on('resize', () => this.render());
    this.renderIntro();
  }
  clear() { this.nameInput?.remove(); this.nameInput = null; this.children.removeAll(true); this.input.removeAllListeners(); }
  addPlayerNameInput(x, y, width) {
    const input = document.createElement('input');
    input.className = 'quipu-name-input'; input.type = 'text'; input.maxLength = 18;
    input.autocomplete = 'nickname'; input.setAttribute('aria-label', 'Nombre para el ranking');
    input.placeholder = 'Tu nombre para el ranking'; input.value = this.playerName || '';
    Object.assign(input.style, { left: `${x}px`, top: `${y}px`, width: `${width}px` });
    document.getElementById('game').appendChild(input); this.nameInput = input;
    input.addEventListener('input', () => {
      this.playerName = input.value.trim().slice(0, 18);
      savePlayerName(this.playerName);
      if (this.screen === 'results' && this.completedRunId) {
        const run = getRun(this.completedRunId);
        if (!run?.submissionPayload) updateRun(this.completedRunId, { name: this.playerName || 'Anónimo' });
      }
    });
  }
  menuLink(x, y, label, callback, originX = 0) {
    const link = this.text(x, y, label, { fontSize: '12px', fontStyle: '500', color: '#c3c2d2', letterSpacing: .4 })
      .setOrigin(originX, 0).setInteractive({ useHandCursor: true });
    link.on('pointerover', () => link.setColor('#f0d9b5'));
    link.on('pointerout', () => link.setColor('#c3c2d2'));
    link.on('pointerdown', callback);
    return link;
  }
  creditLink(y) {
    const credit = this.text(this.scale.width / 2, y, 'Made with ♥ by mhdev', {
      fontSize: '11px', fontStyle: '400', color: '#b9b8ca', letterSpacing: .25,
    }).setOrigin(.5, 0).setInteractive({ useHandCursor: true });
    credit.on('pointerover', () => credit.setColor('#e1d3db'));
    credit.on('pointerout', () => credit.setColor('#b9b8ca'));
    credit.on('pointerdown', () => window.open('https://melissahuerta.dev/', '_blank', 'noopener,noreferrer'));
    return credit;
  }
  text(x, y, content, style = {}) {
    return this.add.text(x, y, content, { fontFamily: 'DM Sans, sans-serif', fontStyle: '400', color: HEX(C.cream), resolution: 2, ...style });
  }
  bg() {
    const { width, height } = this.scale;
    drawMountainBackdrop(this, { width, height });
  }
  createDustTexture() {
    if (this.textures.exists('quipu-dust')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1); g.fillCircle(4, 4, 4); g.generateTexture('quipu-dust', 8, 8); g.destroy();
  }
  button(x, y, label, callback) {
    const t = this.add.text(x, y, label, { fontFamily: 'DM Sans, sans-serif', fontSize: '17px', fontStyle: '500', color: HEX(C.cream), padding: { x: 20, y: 16 }, backgroundColor: '#454236', resolution: 2 })
      .setInteractive({ useHandCursor: true });
    t.on('pointerdown', callback);
    t.on('pointerover', () => t.setBackgroundColor('#5b5748'));
    t.on('pointerout', () => t.setBackgroundColor('#454236'));
    return t;
  }
  addAudioControls(x, y) {
    const makeToggle = (offset, kind, title) => {
      const enabled = kind === 'ambient' ? audio.ambientEnabled : audio.sfxEnabled;
      const toggle = this.add.text(x + offset, y, `${title} ${enabled ? 'ON' : 'OFF'}`, {
        fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontStyle: '400', color: HEX(C.cream),
        padding: { x: 7, y: 5 }, backgroundColor: '#232640', resolution: 2,
      }).setInteractive({ useHandCursor: true });
      toggle.on('pointerdown', () => {
        if (kind === 'ambient') audio.setAmbientEnabled(!audio.ambientEnabled);
        else audio.setSfxEnabled(!audio.sfxEnabled);
        const state = kind === 'ambient' ? audio.ambientEnabled : audio.sfxEnabled;
        toggle.setText(`${title} ${state ? 'ON' : 'OFF'}`);
      });
      toggle.on('pointerover', () => toggle.setColor(HEX(C.accent)));
      toggle.on('pointerout', () => toggle.setColor(HEX(C.cream)));
    };
    makeToggle(0, 'ambient', 'VIENTO');
    makeToggle(77, 'sfx', 'SFX');
  }
  drawNarrativeQuipu(y, width, colors) {
    drawMainCord(this, { x: this.scale.width / 2, y, width, color: C.cord });
    const count = 5;
    const spacing = Math.min(42, width * .12);
    const knots = [2, 4, 1, 3, 2];
    const fallback = [0xd67d62, 0xe2b85f, 0x55aaa0, 0x8792d0, 0xdb8da1];
    for (let i = 0; i < count; i++) {
      const rope = this.add.container(this.scale.width / 2 + (i - (count - 1) / 2) * spacing, y);
      drawFiberRope(this, rope, { color: colors?.[i % colors.length] ?? fallback[i], width: 6, length: 40 + (i % 3) * 12, knots: knots[i], isLength: false, gap: spacing });
      rope.setDepth(2);
    }
  }
  narrativeButton(y, label, callback, { revealAfter = 650 } = {}) {
    const { width: w } = this.scale;
    const height = 58;
    const width = Math.min(w - 40, Math.max(220, label.length * 8.2 + 42));
    const button = this.add.container(w / 2, y);
    const face = this.add.graphics();
    face.fillStyle(0x252b50, .42); face.fillRoundedRect(-width / 2, -height / 2, width, height, height / 2);
    face.lineStyle(1, 0xb8b7cc, .44); face.strokeRoundedRect(-width / 2, -height / 2, width, height, height / 2);
    face.setAlpha(.58);
    const caption = this.text(0, 0, label, { fontSize: '14px', fontStyle: '500', color: '#e4e2e8' }).setOrigin(.5);
    button.add([face, caption]);
    button.setSize(width, height).setInteractive({ useHandCursor: true });
    button.setAlpha(0).disableInteractive();
    button.on('pointerover', () => {
      this.tweens.add({ targets: button, scale: 1.025, duration: 190, ease: 'Sine.Out' });
      this.tweens.add({ targets: face, alpha: .96, duration: 190 });
    });
    button.on('pointerout', () => {
      this.tweens.add({ targets: button, scale: 1, duration: 220, ease: 'Sine.Out' });
      this.tweens.add({ targets: face, alpha: .58, duration: 220 });
    });
    button.on('pointerdown', () => this.tweens.add({ targets: button, scale: .97, duration: 80, ease: 'Sine.Out' }));
    button.on('pointerup', () => {
      this.tweens.add({ targets: button, scale: 1, duration: 240, ease: 'Back.Out' });
      callback();
    });
    this.time.delayedCall(revealAfter, () => {
      if (!button.active) return;
      button.setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: button, alpha: 1, y: y - 5, duration: 420, ease: 'Sine.Out' });
    });
    return button;
  }
  render() {
    if (this.screen === 'game') this.renderLevel();
    else if (this.screen === 'intro') this.renderIntro();
    else if (this.screen === 'memory') this.showMemory();
    else if (this.screen === 'about') this.renderAbout();
    else if (this.screen === 'ranking') this.renderRanking();
    else if (this.screen === 'results') this.renderResults(this.completedRunId);
    else if (this.screen === 'settings') this.renderSettings();
    else this.renderEnd();
  }
  renderIntro() {
    this.clear(); this.screen = 'intro'; this.bg();
    const { width: w, height: h } = this.scale;
    const title = this.text(w / 2, h * .24, 'QUIPU', {
      fontSize: `${Math.min(w < 600 ? 58 : 88, w * .18)}px`, fontStyle: '500',
      color: '#f2eadc', letterSpacing: w < 600 ? 5 : 9, stroke: '#d7bb83', strokeThickness: .45,
    }).setOrigin(.5, 0);
    title.setShadow(0, 5, '#080a1c', 18, true, true);
    this.text(w / 2, h * .40, 'Restaura las memorias', {
      fontSize: w < 600 ? '15px' : '17px', fontStyle: '400', color: '#d2ced8', letterSpacing: .7,
    }).setOrigin(.5, 0);
    this.drawNarrativeQuipu(h * .51, Math.min(w - 80, 470), LEVELS[0].colors);
    this.narrativeButton(h * .72, 'JUGAR  →', () => { audio.unlock(); this.startGame(); }, { revealAfter: 180 });
    this.menuLink(w * .18, h * .85, 'SOBRE EL JUEGO', () => this.renderAbout(), .5);
    this.menuLink(w * .50, h * .85, 'RANKING', () => this.openRanking(), .5);
    this.menuLink(w * .82, h * .85, 'AJUSTES', () => this.renderSettings(), .5);
    this.creditLink(h - 26);
  }
  startGame() {
    this.time.removeAllEvents(); this.levelIndex = 0; this.moves = 0; this.totalMoves = 0;
    this.runStartedAt = Date.now(); this.runId = createRunId(); this.rankSavedForRun = false;
    this.orders = LEVELS.map(level => level.values.map((value, id) => ({ value, id, color: level.colors[id] })).reverse()); this.renderLevel();
  }
  renderLevel() {
    this.clear(); this.screen = 'game'; this.dragged = null; this.levelSolved = false;
    const level = LEVELS[this.levelIndex]; const order = this.orders[this.levelIndex];
    const { width: w, height: h } = this.scale;
    this.bg();
    const mobile = w < 600;
    this.text(22, 20, 'QUIPU', { fontSize: '16px', fontStyle: '500', letterSpacing: 2 });
    this.text(w - (mobile ? 55 : 76), 21, `${this.levelIndex + 1}/${LEVELS.length}`, { fontSize: '13px', color: HEX(C.cream) });
    const restart = this.add.text(w - (mobile ? 110 : 145), 19, '↻', { fontFamily: 'DM Sans, sans-serif', fontStyle: '400', fontSize: '23px', color: HEX(C.cream), padding: { x: 7, y: 1 } }).setInteractive({ useHandCursor: true });
    restart.on('pointerdown', () => this.startGame());
    restart.on('pointerover', () => restart.setColor(HEX(C.accent)));
    restart.on('pointerout', () => restart.setColor(HEX(C.cream)));
    this.addAudioControls(mobile ? 78 : Math.max(185, w - 305), 18);
    for (let i = 0; i < LEVELS.length; i++) this.add.circle(w - (mobile ? 98 : 130) + i * (mobile ? 10 : 12), 48, 3, i <= this.levelIndex ? C.accent : C.line).setAlpha(.86);
    this.text(22, 63, level.title, { fontSize: `${Math.min(mobile ? 25 : 30, w * .062)}px`, fontStyle: '500' });
    const rule = level.type === 'cm' ? 'CORTA  →  LARGA' : 'POCOS NUDOS  →  MUCHOS NUDOS';
    this.text(22, mobile ? 105 : 108, rule, { fontSize: mobile ? '11px' : '13px', color: HEX(C.cream), backgroundColor: '#232640', padding: { x: 9, y: 6 } });
    const boardTop = mobile ? Math.max(160, Math.min(h * .25, 205)) : Math.max(190, Math.min(h * .27, 232));
    drawMainCord(this, { x: w / 2, y: boardTop, width: w, color: C.cord });
    this.ropeObjects = [];
    const gap = (w - (mobile ? 34 : 100)) / order.length;
    order.forEach((item, index) => {
      const x = (mobile ? 17 : 50) + gap * (index + .5);
      const rawLength = level.type === 'cm' ? 100 + item.value * 1.8 : 210;
      const maxRopeLength = Math.max(142, h - boardTop - (mobile ? 102 : 126));
      const ropeLength = Math.min(rawLength, maxRopeLength);
      const rope = this.add.container(x, boardTop);
      rope.setDepth(2);
      rope.setData('itemId', item.id);
      rope.setData('ropeLength', ropeLength);
      const cordWidth = Phaser.Math.Clamp(gap * .105, 8, mobile ? 13 : 16);
      drawFiberRope(this, rope, { color: item.color, width: cordWidth, length: ropeLength, knots: item.value, isLength: level.type === 'cm', gap });
      rope.setData('homeX', x); rope.setData('homeY', boardTop + 2);
      rope.setSize(Math.max(mobile ? 38 : 52, gap - 4), ropeLength + 26).setInteractive({ draggable: true, useHandCursor: true });
      rope.on('pointerdown', (pointer) => {
        if (this.levelSolved) return;
        if (pointer.wasTouch && this.selectedRope === rope) {
          const from = rope.getData('index'); this.selectedRope = null; this.swapRopes(from, rope.getData('index')); return;
        }
        if (this.selectedRope && this.selectedRope !== rope) {
          const from = this.selectedRope.getData('index');
          this.selectedRope = null;
          this.swapRopes(from, rope.getData('index'), true);
        } else {
          this.selectedRope = rope;
          this.tweens.add({ targets: rope, y: boardTop - 12, scale: 1.1, duration: 170, ease: 'Back.Out' });
          this.tweens.add({ targets: rope, angle: 5, duration: 170, yoyo: true, ease: 'Sine.InOut' });
          this.ropeObjects.forEach(other => { if (other !== rope) this.tweens.add({ targets: other, alpha: .62, duration: 150 }); });
        }
      });
      rope.setData('index', index);
      rope.on('dragstart', (pointer) => {
        if (this.levelSolved) return;
        audio.unlock(); audio.playGrab();
        this.dragged = rope.getData('index'); this.selectedRope = rope; this.dragOffsetX = pointer.x - rope.x; rope.setDepth(3);
        const idle = rope.getData('idleSwing'); if (idle) idle.pause();
        this.ropeObjects.forEach(other => { if (other !== rope) this.tweens.add({ targets: other, alpha: .48, duration: 120 }); });
        this.tweens.add({ targets: rope, scale: 1.13, angle: 4, duration: 120, ease: 'Back.Out' });
      });
      rope.on('drag', (pointer) => {
        rope.x = Phaser.Math.Clamp(pointer.x - this.dragOffsetX, (mobile ? 17 : 50) + gap / 2, w - (mobile ? 17 : 50) - gap / 2);
        rope.angle = Phaser.Math.Clamp((pointer.velocity.x || 0) * .035, -11, 11);
      });
      rope.on('dragend', () => { audio.playRelease(); this.dragged = rope.getData('index'); this.dropRope(rope.x); });
      this.tweens.add({ targets: rope, y: boardTop + 2, duration: 440 + index * 65, delay: index * 48, ease: 'Back.Out' });
      const idleSwing = this.tweens.add({ targets: rope, angle: { from: -1.4, to: 1.4 }, duration: 2100 + index * 115, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 500 + index * 75 });
      rope.setData('idleSwing', idleSwing);
      this.ropeObjects.push(rope);
    });
    const footerY = h - 32;
    this.moveCounter = this.text(22, footerY, `${this.moves} MOV.`, { fontSize: '12px', color: HEX(C.cream) });
    this.text(w - (mobile ? 135 : 172), footerY, 'ARRASTRA PARA ORDENAR', { fontSize: mobile ? '10px' : '11px', color: HEX(C.muted) });
  }
  dropRope(x) {
    const count = this.orders[this.levelIndex].length;
    const mobile = this.scale.width < 600; const inset = mobile ? 17 : 50;
    const actualGap = (this.scale.width - inset * 2) / count;
    const target = Phaser.Math.Clamp(Math.floor((x - inset) / actualGap), 0, count - 1); const from = this.dragged;
    if (from == null || from === target) { this.resetRopePresentation(); return; }
    this.swapRopes(from, target);
  }
  resetRopePresentation() {
    this.ropeObjects.forEach((rope, index) => {
      const idle = rope.getData('idleSwing'); if (idle) idle.resume();
      this.tweens.add({ targets: rope, x: rope.getData('homeX'), y: rope.getData('homeY'), angle: 0, scale: 1, alpha: 1, duration: 300, ease: 'Back.Out', delay: index * 18 });
      rope.setDepth(2);
    });
    this.selectedRope = null; this.dragged = null;
  }
  swapRopes(from, target, fromTap = false) {
    if (this.levelSolved) return;
    if (from == null || from === target) { this.resetRopePresentation(); return; }
    if (fromTap) { audio.unlock(); audio.playRelease(); }
    this.selectedRope = null;
    const order = [...this.orders[this.levelIndex]]; const [picked] = order.splice(from, 1); order.splice(target, 0, picked);
    this.orders[this.levelIndex] = order; this.moves++; this.totalMoves++;
    if (this.moveCounter) this.moveCounter.setText(`${this.moves} MOV.`);
    const count = order.length; const mobile = this.scale.width < 600; const inset = mobile ? 17 : 50;
    const gap = (this.scale.width - inset * 2) / count;
    const ropeById = new Map(this.ropeObjects.map(rope => [rope.getData('itemId'), rope]));
    order.forEach((item, i) => {
      const rope = ropeById.get(item.id);
      if (!rope) return;
      const idle = rope.getData('idleSwing'); if (idle) idle.pause();
      rope.setData('index', i);
      rope.setData('homeX', inset + gap * (i + .5)); rope.setData('homeY', rope.y);
      const selected = item.id === picked.id;
      this.tweens.add({ targets: rope, x: inset + gap * (i + .5), y: rope.getData('homeY') - (selected ? 8 : 0), angle: 0, scale: selected ? 1.06 : 1, alpha: 1, duration: 350, delay: Math.abs(i - target) * 22, ease: 'Cubic.Out', onComplete: () => { const swing = rope.getData('idleSwing'); if (swing && this.screen === 'game') swing.resume(); } });
      rope.setDepth(selected ? 3 : 2);
    });
    const solved = order.every((item, i) => i === 0 || order[i - 1].value <= item.value);
    if (solved) {
      this.levelSolved = true;
      const isFinalLevel = this.levelIndex === LEVELS.length - 1;
      if (isFinalLevel) {
        audio.playEnding();
        if (!this.rankSavedForRun && this.runId && this.runStartedAt) {
          this.rankSavedForRun = true;
          const completedRun = saveCompletedRun({
            runId: this.runId,
            name: this.playerName || readPlayerName() || 'Anónimo',
            elapsedMs: Date.now() - this.runStartedAt,
            totalMoves: this.totalMoves,
          });
          this.completedRunId = completedRun?.runId || this.runId;
        }
      }
      else audio.playMemory();
      this.time.delayedCall(110, () => {
        this.playCompletionGlow();
        if (isFinalLevel) this.playFinalGathering();
      });
      this.time.delayedCall(isFinalLevel ? 1450 : 640, () => { this.screen = 'memory'; this.showMemory(); });
    }
  }
  playCompletionGlow() {
    this.cameras.main.shake(140, .0025);
    this.ropeObjects.forEach((rope, index) => {
      const glow = this.add.graphics(); glow.setBlendMode(Phaser.BlendModes.ADD); glow.setDepth(rope.depth + .1); glow.setAlpha(.9);
      glow.lineStyle(15, 0xffd991, .55); glow.beginPath(); glow.moveTo(0, 0); glow.lineTo(0, 34); glow.strokePath();
      glow.setPosition(rope.x, rope.y + 4);
      this.tweens.add({ targets: glow, y: rope.y + rope.getData('ropeLength') - 25, alpha: { from: .9, to: 0 }, duration: 360, delay: index * 48, ease: 'Sine.In', onComplete: () => glow.destroy() });
      this.tweens.add({ targets: rope, scale: 1.055, duration: 150, yoyo: true, delay: index * 55, ease: 'Sine.InOut' });
    });
  }
  playFinalGathering() {
    const centerX = this.scale.width / 2;
    const centerY = this.ropeObjects[0]?.y - 4 || this.scale.height * .27;
    this.ropeObjects.forEach((rope, index) => {
      const spark = this.add.ellipse(rope.x, rope.y + Math.min(rope.getData('ropeLength') * .7, 120), 7, 7, 0xf0d9b5, .82).setDepth(4);
      this.tweens.add({
        targets: spark, x: centerX + (index - (this.ropeObjects.length - 1) / 2) * 5, y: centerY,
        alpha: .3, scale: .42, duration: 610, delay: index * 55, ease: 'Cubic.In',
        onComplete: () => spark.destroy(),
      });
    });
    const glow = this.add.ellipse(centerX, centerY, 54, 20, 0xe4c89c, .24).setDepth(3.8).setAlpha(0);
    this.time.delayedCall(520, () => {
      if (!glow.active) return;
      this.tweens.add({ targets: glow, alpha: .2, scaleX: 2.25, scaleY: 1.5, duration: 230, yoyo: true, onComplete: () => glow.destroy() });
    });
  }
  renderAbout() {
    this.clear(); this.screen = 'about'; this.bg();
    const { width: w, height: h } = this.scale;
    this.text(28, 26, 'QUIPU', { fontSize: '18px', fontStyle: '500', letterSpacing: 2 });
    this.drawNarrativeQuipu(h * .19, Math.min(w - 56, 560), LEVELS[1].colors);
    this.text(w / 2, h * .34, 'Sobre el juego', { fontSize: '24px', fontStyle: '500', color: '#d5d3df' }).setOrigin(.5, 0);
    this.text(w / 2, h * .44,
      'QUIPU.EXE es un juego de puzzles inspirado artísticamente en los quipus andinos. Una pausa para reflexionar sobre la calma, la escucha, las diferencias y los vínculos humanos.',
      { fontSize: '16px', color: '#dfdde4', align: 'center', wordWrap: { width: Math.min(w - 56, 620) }, lineSpacing: 8 })
      .setOrigin(.5, 0);
    this.text(w / 2, h * .63,
      'Una interpretación contemporánea creada para este juego; no busca atribuir significados históricos.',
      { fontSize: '13px', color: '#b9b8ca', align: 'center', wordWrap: { width: Math.min(w - 64, 560) }, lineSpacing: 6 })
      .setOrigin(.5, 0);
    this.text(w / 2, h * .75, 'Creado para Hack the Andes Challenge', { fontSize: '13px', color: '#c8c6d3' }).setOrigin(.5, 0);
    this.narrativeButton(h * .91, 'VOLVER AL INICIO', () => this.renderIntro(), { revealAfter: 120 });
  }
  renderSettings() {
    this.clear(); this.screen = 'settings'; this.bg();
    const { width: w, height: h } = this.scale;
    this.text(28, 26, 'QUIPU', { fontSize: '18px', fontStyle: '500', letterSpacing: 2 });
    this.drawNarrativeQuipu(h * .24, Math.min(w - 56, 560), LEVELS[0].colors);
    this.text(w / 2, h * .39, 'Ajustes', { fontSize: '25px', fontStyle: '500', color: '#d5d3df' }).setOrigin(.5, 0);
    this.text(w / 2, h * .47, 'El viento empieza al jugar cuando el navegador permite audio.', {
      fontSize: '13px', color: '#b9b8ca', align: 'center', wordWrap: { width: Math.min(w - 56, 460) },
    }).setOrigin(.5, 0);
    this.addAudioControls(Math.max(24, w / 2 - 61), h * .57);
    this.narrativeButton(h * .80, 'VOLVER AL INICIO', () => this.renderIntro(), { revealAfter: 120 });
  }
  openRanking() {
    this.rankingState = { status: 'loading', entries: [] };
    this.renderRanking();
    this.loadGlobalRanking();
  }
  async loadGlobalRanking() {
    this.rankingState = { status: 'loading', entries: [] };
    if (this.screen === 'ranking') this.renderRanking();
    try {
      const entries = await fetchGlobalEntries();
      this.rankingState = { status: entries.length ? 'ready' : 'empty', entries };
    } catch (error) {
      this.rankingState = {
        status: leaderboardConfigured ? 'error' : 'unconfigured',
        message: error.message,
        entries: [],
      };
    }
    if (this.screen === 'ranking') this.renderRanking();
  }
  renderRanking() {
    this.clear(); this.screen = 'ranking'; this.bg();
    const { width: w, height: h } = this.scale;
    const compact = h < 640;
    const tight = h < 520;
    const rowGap = tight ? (h < 470 ? 19 : 22) : compact ? 29 : 34;
    const rowStart = tight ? 130 : compact ? 184 : 204;
    this.text(28, 26, 'QUIPU', { fontSize: '18px', fontStyle: '500', letterSpacing: 2 });
    this.text(w / 2, 66, 'Ranking global', { fontSize: '24px', fontStyle: '500' }).setOrigin(.5, 0);
    this.text(w / 2, 105, 'Puntaje = segundos + (5 × movimientos). Menor es mejor.', {
      fontSize: '11px', color: '#c3c2d2', align: 'center', wordWrap: { width: w - 56 },
    }).setOrigin(.5, 0);
    const { status, entries = [] } = this.rankingState || { status: 'idle', entries: [] };
    if (status === 'loading' || status === 'idle') {
      this.text(w / 2, rowStart + 12, 'Conectando con el ranking…', { fontSize: '14px', color: '#c3c2d2' }).setOrigin(.5, 0);
    } else if (status === 'empty') {
      this.text(w / 2, rowStart + 12, 'Todavía no hay puntuaciones globales.', { fontSize: '14px', color: '#c3c2d2' }).setOrigin(.5, 0);
    } else if (status === 'unconfigured') {
      this.text(w / 2, rowStart + 5, 'El ranking global aún no está configurado.', {
        fontSize: '14px', color: '#d5d3df', align: 'center', wordWrap: { width: w - 64 },
      }).setOrigin(.5, 0);
    } else if (status === 'error') {
      this.text(w / 2, rowStart + 5, 'No pudimos conectar con el ranking.', {
        fontSize: '14px', color: '#d5d3df', align: 'center', wordWrap: { width: w - 64 },
      }).setOrigin(.5, 0);
    } else {
      entries.slice(0, 10).forEach((entry, index) => {
        const y = rowStart + index * rowGap;
        const compactName = tight ? String(entry.name).slice(0, w < 380 ? 8 : 14) : w < 380 ? String(entry.name).slice(0, 12) : entry.name;
        if (tight) {
          this.text(20, y, `${String(index + 1).padStart(2, '0')} · ${compactName} · ${formatTime(entry.elapsedMs)} · ${entry.totalMoves} mov · ${entry.score} pts`, {
            fontSize: w < 390 ? '8px' : '9px', fontStyle: '500', color: '#e5e2e7',
          });
          return;
        }
        this.text(28, y, `${String(index + 1).padStart(2, '0')}  ${compactName}`, {
          fontSize: compact ? '12px' : '13px', fontStyle: '500', color: '#e5e2e7',
        });
        this.text(w - 28, y, `${Number.isFinite(entry.score) ? entry.score : '—'} pts`, {
          fontSize: compact ? '11px' : '12px', color: '#e2c8aa',
        }).setOrigin(1, 0);
        this.text(46, y + 15, `${formatTime(entry.elapsedMs)} · ${entry.totalMoves} mov.`, {
          fontSize: compact ? '9px' : '10px', color: '#aaa9ba',
        });
      });
    }
    const pending = getPendingRuns();
    const pendingRun = pending.at(-1);
    if (pendingRun && h > 470) {
      const pendingY = Math.min(h - 84, rowStart + rowGap * (status === 'ready' ? Math.min(entries.length, 10) : 1) + 8);
      this.text(w / 2, pendingY, 'Tienes una partida guardada para reintentar.', {
        fontSize: '11px', color: '#c3c2d2', align: 'center',
      }).setOrigin(.5, 0);
      this.menuLink(w / 2, pendingY + 20, 'REINTENTAR ENVÍO', () => this.renderResults(pendingRun.runId), .5);
    } else if (pendingRun) {
      this.menuLink(w / 2, h - 62, 'PARTIDA PENDIENTE · REINTENTAR', () => this.renderResults(pendingRun.runId), .5);
    }
    this.menuLink(w - 32, h - 34, 'VOLVER', () => this.renderIntro(), 1);
    if (status === 'error' || status === 'unconfigured') {
      this.menuLink(32, h - 34, 'REINTENTAR', () => this.loadGlobalRanking());
    }
  }
  showMemory() {
    this.clear(); this.screen = 'memory'; this.bg(); const { width: w, height: h } = this.scale; const level = LEVELS[this.levelIndex];
    const compact = h < 440;
    this.text(28, 26, 'QUIPU', { fontSize: '18px', fontStyle: '500', letterSpacing: 2 });
    this.drawNarrativeQuipu(h * (compact ? .14 : .18), Math.min(w - 56, 560), level.colors);
    const chapter = this.text(w / 2, h * (compact ? .42 : .36), level.title, { fontSize: '15px', fontStyle: '500', color: '#b9b8ca' }).setOrigin(.5, 0).setAlpha(0);
    const reflection = this.text(w / 2, h * (compact ? .50 : .44), level.message, {
      fontFamily: 'Lora, Georgia, serif', fontSize: `${Math.max(compact ? 17 : 19, Math.min(compact ? 19 : w < 600 ? 21 : 24, w * .06))}px`, fontStyle: 'italic 400',
      color: '#ebe8e8', align: 'center', wordWrap: { width: Math.min(w - 48, 600) }, lineSpacing: 10,
    }).setOrigin(.5, 0).setAlpha(0);
    this.tweens.add({ targets: chapter, alpha: .68, duration: 620, ease: 'Sine.Out' });
    this.tweens.add({ targets: reflection, alpha: .96, y: h * (compact ? .49 : .425), duration: 1050, delay: 180, ease: 'Sine.Out', onComplete: () => {
      if (reflection.active) this.tweens.add({ targets: reflection, alpha: { from: .91, to: 1 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    } });
    const isFinalLevel = this.levelIndex === LEVELS.length - 1;
    this.narrativeButton(h * (compact ? .88 : .84), isFinalLevel ? 'LEER EL EPÍLOGO  →' : 'SEGUIR EL HILO  →', () => {
      if (isFinalLevel) this.renderEnd(); else { this.levelIndex++; this.moves = 0; this.renderLevel(); }
    }, { revealAfter: 720 });
  }
  renderEnd() {
    this.clear(); this.screen = 'end'; this.bg(); const { width: w, height: h } = this.scale;
    if (this.levelIndex !== LEVELS.length - 1) { this.showMemory(); return; }
    const compact = h < 440;
    this.text(28, 26, 'QUIPU', { fontSize: '18px', fontStyle: '500', letterSpacing: 2 });
    this.drawNarrativeQuipu(h * (compact ? .14 : .22), Math.min(w - 56, 560), LEVELS.at(-1).colors);
    const reflection = this.text(w / 2, h * (compact ? .53 : .46), FINAL_REFLECTION, {
      fontFamily: 'Lora, Georgia, serif', fontSize: `${Math.max(compact ? 18 : 20, Math.min(compact ? 20 : w < 600 ? 22 : 24, w * .062))}px`, fontStyle: 'italic 400',
      color: '#ebe8e8', align: 'center', wordWrap: { width: Math.min(w - 48, 600) }, lineSpacing: 11,
    }).setOrigin(.5, 0).setAlpha(0);
    this.tweens.add({ targets: reflection, alpha: .98, y: h * (compact ? .52 : .445), duration: 1300, ease: 'Sine.Out', onComplete: () => {
      if (reflection.active) this.tweens.add({ targets: reflection, alpha: { from: .92, to: 1 }, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    } });
    this.narrativeButton(h * (compact ? .89 : .80), 'VER RESULTADOS  →', () => this.renderResults(this.completedRunId), { revealAfter: 2100 });
  }
  renderResults(runId = this.completedRunId) {
    const run = getRun(runId) || getLatestCompletedRun();
    if (!run) { this.renderIntro(); return; }
    this.completedRunId = run.runId;
    this.clear(); this.screen = 'results'; this.bg();
    const { width: w, height: h } = this.scale;
    const compact = h < 600;
    const short = h < 500;
    this.text(28, 26, 'QUIPU', { fontSize: '18px', fontStyle: '500', letterSpacing: 2 });
    this.drawNarrativeQuipu(h * .19, Math.min(w - 56, 500), LEVELS.at(-1).colors);
    this.text(w / 2, h * .34, 'Tu partida', { fontSize: '23px', fontStyle: '500', color: '#d5d3df' }).setOrigin(.5, 0);
    const resultY = compact ? h * .36 : h * .43;
    this.text(w / 2, resultY, `TIEMPO  ${formatTime(run.elapsedMs)}`, { fontSize: compact ? '14px' : '16px', color: '#e5e2e7' }).setOrigin(.5, 0);
    this.text(w / 2, resultY + 34, `MOVIMIENTOS  ${run.totalMoves}`, { fontSize: compact ? '14px' : '16px', color: '#e5e2e7' }).setOrigin(.5, 0);
    this.text(w / 2, resultY + 68, `PUNTUACIÓN  ${run.score}`, { fontSize: compact ? '14px' : '16px', fontStyle: '500', color: '#e2c8aa' }).setOrigin(.5, 0);
    const sentPosition = run.globalPosition;
    if (run.status === 'sent') {
      const globalMessage = Number.isInteger(sentPosition) && sentPosition <= 10
        ? `Puesto ${sentPosition} en el ranking global.`
        : run.globalChecked
          ? 'Tu resultado se envió y quedó fuera del top 10 mostrado.'
          : 'Envío confirmado; no pudimos consultar tu posición global.';
      this.text(w / 2, resultY + 104, globalMessage, {
        fontSize: '12px', color: '#c3c2d2', align: 'center', wordWrap: { width: w - 48 },
      }).setOrigin(.5, 0);
    } else {
      const nameY = resultY + (short ? 94 : 112);
      const canEditName = !run.submissionPayload;
      const submittedName = run.submissionPayload?.name || run.name || 'Anónimo';
      if (!short && canEditName) {
        this.text(w / 2, nameY - 23, 'NOMBRE PARA EL RANKING', { fontSize: '10px', color: '#c3c2d2', letterSpacing: 1 }).setOrigin(.5, 0);
        this.addPlayerNameInput(w / 2 - Math.min(135, (w - 48) / 2), nameY, Math.min(270, w - 48));
        this.nameInput.value = run.name === 'Anónimo' ? (this.playerName || '') : run.name;
      } else {
        this.text(w / 2, nameY, `Nombre: ${submittedName}`, { fontSize: '12px', color: '#c3c2d2' }).setOrigin(.5, 0);
      }
      if (run.message) this.text(w / 2, nameY + (short ? 24 : 48), run.message, {
        fontSize: '11px', color: '#c3c2d2', align: 'center', wordWrap: { width: w - 52 },
      }).setOrigin(.5, 0);
      this.narrativeButton(h * (short ? .80 : .76), run.submissionPayload ? 'REINTENTAR ENVÍO' : 'ENVIAR RESULTADO', () => this.sendRun(run.runId), { revealAfter: 120 });
    }
    this.menuLink(w * .28, h - 42, 'VER RANKING', () => this.openRanking(), .5);
    this.menuLink(w * .70, h - 42, 'VOLVER A JUGAR', () => this.startGame(), .5);
    this.menuLink(w / 2, h - 20, 'VOLVER AL INICIO', () => this.renderIntro(), .5);
  }
  async sendRun(runId) {
    if (this.submittingRuns.has(runId)) return;
    let run = getRun(runId);
    if (!run || run.status === 'sent') { this.renderResults(runId); return; }
    const submissionPayload = run.submissionPayload || {
      runId: run.runId,
      name: String(this.playerName || run.name || 'Anónimo').trim().slice(0, 18) || 'Anónimo',
      elapsedMs: run.elapsedMs,
      totalMoves: run.totalMoves,
      score: run.score,
    };
    run = updateRun(runId, { name: submissionPayload.name, submissionPayload, status: 'sending', message: null });
    this.submittingRuns.add(runId);
    if (this.screen === 'results') this.renderResults(runId);
    try {
      const playerId = getStablePlayerId();
      if (!playerId) throw new Error('PLAYER_ID_NOT_PERSISTED');
      const response = await submitCompletedRun(submissionPayload, playerId);
      updateRun(runId, { status: 'sent', message: null, remoteEntryId: response?.entry?.id ?? null });
      let globalPosition = null;
      let globalChecked = false;
      try {
        const entries = await fetchGlobalEntries();
        const index = entries.findIndex((entry) => entry.runId === runId);
        if (index >= 0) globalPosition = index + 1;
        globalChecked = true;
      } catch { /* Keep the accepted result even if the follow-up ranking read fails. */ }
      updateRun(runId, { globalPosition, globalChecked });
    } catch (error) {
      const message = !leaderboardConfigured
        ? 'Ranking global no configurado; tu resultado sigue guardado en este dispositivo.'
        : 'No se pudo enviar. Tu resultado sigue guardado; puedes reintentar.';
      updateRun(runId, { status: 'pending', message, lastError: error.message });
    } finally {
      this.submittingRuns.delete(runId);
      if (this.screen === 'results' && this.completedRunId === runId) this.renderResults(runId);
    }
  }
}

const launchGame = () => new Phaser.Game({ type: Phaser.AUTO, parent: 'game', backgroundColor: HEX(C.dark), scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 720 }, input: { activePointers: 2 }, scene: QuipuScene });
if (document.fonts?.load) {
  Promise.allSettled([
    document.fonts.load('500 88px "DM Sans"'),
    document.fonts.load('italic 400 22px "Lora"'),
  ]).then(([uiFont, reflectionFont]) => {
    const uiReady = uiFont.status === 'fulfilled' && uiFont.value.some(face => face.status === 'loaded');
    const reflectionReady = reflectionFont.status === 'fulfilled' && reflectionFont.value.some(face => face.status === 'loaded');
    if (uiReady) console.info('[QUIPU] Interfaz renderizada con DM Sans local.');
    else console.warn('[QUIPU] DM Sans local no cargó; la interfaz usará sans-serif.');
    if (reflectionReady) console.info('[QUIPU] Reflexiones renderizadas con Lora local.');
    else console.warn('[QUIPU] Lora local no cargó; las reflexiones usarán Georgia.');
    launchGame();
  }, launchGame);
} else launchGame();
