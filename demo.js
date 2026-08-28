// ページ全体にかかる紙面の操作。日本語版と英語版で共有する。
// 紙面そのものの数値は paper.js にあり、ここには無い。

import { SURFACES, DEFAULTS, textures, layers } from './paper.js';

// 製品の Resources/{en,ja}.lproj/Localizable.strings と揃える。
// status.on / status.off にあたるものだけがここに要る。
const JA = document.documentElement.lang.startsWith('ja');
const L = JA
  ? { on: 'オン', off: 'オフ', turnOn: 'Paperstyleをオンにする', turnOff: 'Paperstyleをオフにする' }
  : { on: 'On',   off: 'Off',  turnOn: 'Turn Paperstyle on',     turnOff: 'Turn Paperstyle off' };

const root = document.documentElement;
const body = document.body;
const mainSwitch = document.getElementById('mainSwitch');
const barToggle  = document.getElementById('barToggle');
const barLabel   = document.getElementById('barLabel');
const slider     = document.getElementById('intensity');
const val        = document.getElementById('intensityVal');
const resetBtn   = document.getElementById('resetBtn');
const surfBtns   = [...document.querySelectorAll('.surf-btn')];
const tryBtns    = [...document.querySelectorAll('.try')];

const state = { on: true, surface: DEFAULTS.surface, intensity: DEFAULTS.intensity };

// 製品のメニューは行に触れているあいだだけ実画面に仮適用し、離すと戻す。
// 紙面選びは命令ではなく比較なので、ここでも同じ振る舞いにしてある。
let preview = null;

function paint() {
  const name = preview ?? state.surface;
  const l = layers(name, state.intensity);
  const t = textures(name);

  root.style.setProperty('--tint-color', l.tintColor);
  root.style.setProperty('--tint-a', l.tintAlpha.toFixed(4));
  root.style.setProperty('--mottle-a', l.mottleAlpha.toFixed(4));
  root.style.setProperty('--grain-a', l.grainAlpha.toFixed(4));
  root.style.setProperty('--mottle-src', `url("${t.mottle}")`);
  root.style.setProperty('--grain-src', `url("${t.grain}")`);

  body.classList.toggle('is-off', !state.on);
  mainSwitch.setAttribute('aria-checked', String(state.on));
  mainSwitch.setAttribute('aria-label', state.on ? L.turnOff : L.turnOn);
  barLabel.textContent = state.on ? L.on : L.off;

  surfBtns.forEach(b => b.setAttribute('aria-checked', String(b.dataset.surface === state.surface)));
  tryBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.try === state.surface)));
  val.textContent = state.intensity;
  if (slider.value !== String(state.intensity)) slider.value = state.intensity;
}

function toggle() { state.on = !state.on; paint(); }
function pick(name) { state.surface = name; state.on = true; preview = null; paint(); }
function hover(name) { if (!state.on) return; preview = name; paint(); }
function unhover() { if (preview === null) return; preview = null; paint(); }

mainSwitch.addEventListener('click', toggle);
barToggle.addEventListener('click', toggle);

slider.addEventListener('input', () => {
  state.intensity = parseInt(slider.value, 10);
  state.on = true;
  paint();
});

resetBtn.addEventListener('click', () => {
  state.surface = DEFAULTS.surface;
  state.intensity = DEFAULTS.intensity;
  state.on = true;
  preview = null;
  paint();
});

for (const b of [...surfBtns, ...tryBtns]) {
  const name = b.dataset.surface ?? b.dataset.try;
  b.addEventListener('click', () => pick(name));
  b.addEventListener('mouseenter', () => hover(name));
  b.addEventListener('mouseleave', unhover);
  b.addEventListener('focus', () => hover(name));
  b.addEventListener('blur', unhover);
}

document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) { e.preventDefault(); toggle(); }
});

// 紙目の生成は 1 紙面あたり 0.2 秒ほどかかる。本文を待たせないよう既定の紙面だけを
// 先に用意し、残りの二つは手が空いてから作る。触られた時点で作ると、比較のための
// ホバーが一拍遅れて、比べるという操作そのものが壊れる。
requestAnimationFrame(() => {
  paint();
  const rest = Object.keys(SURFACES).filter(n => n !== state.surface);
  const warm = () => rest.forEach(textures);
  if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 2000 });
  else setTimeout(warm, 400);
});
