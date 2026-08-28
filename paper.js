// Paperstyle の紙面を、ブラウザで製品と同じ手順で組み立てる。
//
// 数値も手順も移植で、出どころは非公開リポジトリ kishiyyyyy/Paperstyle の
// Sources/PaperSurface.swift（definition(for:) と PaperTextures、NoiseField、
// SplitMix64）と Tools/MakeStoreShot.swift の drawPaper。乱数の種まで同じなので、
// 出てくる紙目は製品のものと同じ模様になる。
//
// **ここで数値を調整しないこと。** 見え方を変えたくなったら製品側を変えて、その値を
// ここへ写す。LPが製品より強い絵を出した時点で、このページは買う前の人に嘘をつく。
// 効果が弱いことは欠陥ではなく仕様で、「オンにしていることを忘れる程度」が基準。

const M64 = (1n << 64n) - 1n;

// Sources/PaperSurface.swift の definition(for:) の写し。
export const SURFACES = {
  clear: {
    tint: [0.98, 0.972, 0.955], maxTintAlpha: 0.14,
    maxGrainAlpha: 0.32, fineContrast: 0.75, fiberContrast: 0.15,
    fiberCells: 16, fiberOctaves: 3,
    maxMottleAlpha: 0.05, mottleContrast: 0.5,
    seed: 0x50415031n
  },
  warm: {
    tint: [0.992, 0.933, 0.827], maxTintAlpha: 0.32,
    maxGrainAlpha: 0.34, fineContrast: 0.45, fiberContrast: 0.55,
    fiberCells: 8, fiberOctaves: 4,
    maxMottleAlpha: 0.07, mottleContrast: 1.0,
    seed: 0x50415032n
  },
  quiet: {
    tint: [0.803, 0.800, 0.788], maxTintAlpha: 0.45,
    maxGrainAlpha: 0.28, fineContrast: 0.35, fiberContrast: 0.45,
    fiberCells: 12, fiberOctaves: 4,
    maxMottleAlpha: 0.07, mottleContrast: 0.8,
    seed: 0x50415033n
  }
};

/// 製品と同じ既定値。Sources/Settings.swift の Default。
export const DEFAULTS = { surface: 'clear', intensity: 55 };

// 512 px のタイルを 256 pt で描くので、Retina では 1:1。ブラウザでも
// 512 px の画像を 256 CSS px で敷けば同じ密度になる。
const TILE_PX = 512;
const TILE_CSS = 256;
const MOTTLE_PX = 256;

/// 起動のたびに同じ紙面になるよう、製品と同じ決定的な乱数を使う。
function makeRng(seed) {
  let state = seed & M64;
  return function nextUnit() {
    state = (state + 0x9E3779B97F4A7C15n) & M64;
    let z = state;
    z = ((z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n) & M64;
    z = ((z ^ (z >> 27n)) * 0x94D049BB133111EBn) & M64;
    z = z ^ (z >> 31n);
    return Number(z >> 40n) / 16777216 * 2 - 1;
  };
}

function smoothstep(t) { return t * t * (3 - 2 * t); }

/// 折り返す格子をバイリニアで拾い、smoothstep でならす。
function sample(lattice, cells, x, y, size) {
  const u = x / size * cells;
  const v = y / size * cells;
  const ui = Math.floor(u);
  const vi = Math.floor(v);
  const x0 = ui % cells;
  const y0 = vi % cells;
  const x1 = (x0 + 1) % cells;
  const y1 = (y0 + 1) % cells;
  const fx = smoothstep(u - ui);
  const fy = smoothstep(v - vi);

  const a = lattice[y0 * cells + x0];
  const b = lattice[y0 * cells + x1];
  const c = lattice[y1 * cells + x0];
  const d = lattice[y1 * cells + x1];

  const top = a + (b - a) * fx;
  const bottom = c + (d - c) * fx;
  return top + (bottom - top) * fy;
}

/// タイルとして繋がる fBm。各オクターブは生成直後に平均を引く。
/// 最低オクターブは格子点が数個しかなく、平均が0からずれたまま最大の振幅で
/// 全体を支配するため、これをしないと層に明るさの偏りが出る。
function fbm(px, baseCells, octaves, gain, nextUnit) {
  const result = new Float32Array(px * px);
  let amplitude = 1;
  let total = 0;
  let cells = Math.max(1, baseCells);

  for (let o = 0; o < Math.max(1, octaves); o++) {
    if (cells > px) break;

    const lattice = new Float32Array(cells * cells);
    for (let i = 0; i < lattice.length; i++) lattice[i] = nextUnit();

    let mean = 0;
    for (let i = 0; i < lattice.length; i++) mean += lattice[i];
    mean /= lattice.length;
    for (let i = 0; i < lattice.length; i++) lattice[i] -= mean;

    for (let y = 0; y < px; y++) {
      const rowBase = y * px;
      for (let x = 0; x < px; x++) {
        result[rowBase + x] += sample(lattice, cells, x, y, px) * amplitude;
      }
    }

    total += amplitude;
    amplitude *= gain;
    cells *= 2;
  }

  if (total > 0) for (let i = 0; i < result.length; i++) result[i] /= total;
  return result;
}

/// 正の値を明るい粒、負の値を暗い粒にする。明暗を同量出すので、この層は
/// 平均輝度を変えない。画面全体を暗くしないという製品のルールがここで守られる。
function signedFieldURL(values, px, peakAlpha) {
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(px, px);
  const data = image.data;

  for (let i = 0; i < px * px; i++) {
    const raw = values[i];
    const v = Number.isFinite(raw) ? Math.max(-1, Math.min(1, raw)) : 0;
    const a = Math.min(255, Math.max(0, Math.round(Math.abs(v) * peakAlpha * 255)));
    // 製品側はプリマルチプライで書いているが ImageData はストレートアルファ。
    // 白は (a,a,a,a) が (255,255,255,a) に、黒は (0,0,0,a) のままで一致する。
    const c = v >= 0 ? 255 : 0;
    const o = i * 4;
    data[o] = c;
    data[o + 1] = c;
    data[o + 2] = c;
    data[o + 3] = a;
  }

  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

function makeGrain(s) {
  const rng = makeRng(s.seed);
  const fiber = fbm(TILE_PX, s.fiberCells, s.fiberOctaves, 0.55, rng);
  const values = new Float32Array(TILE_PX * TILE_PX);
  for (let i = 0; i < values.length; i++) {
    values[i] = rng() * s.fineContrast + fiber[i] * s.fiberContrast;
  }
  return signedFieldURL(values, TILE_PX, 0.7);
}

function makeMottle(s) {
  const rng = makeRng((s.seed + 0x9999n) & M64);
  const field = fbm(MOTTLE_PX, 2, 3, 0.5, rng);
  const values = new Float32Array(MOTTLE_PX * MOTTLE_PX);
  for (let i = 0; i < values.length; i++) values[i] = field[i] * s.mottleContrast;
  return signedFieldURL(values, MOTTLE_PX, 0.6);
}

const cache = new Map();

/// 紙目の生成は 1 紙面あたり 0.2 秒ほどかかるので、必要になったときだけ作る。
/// 地色は即座に出るので、待っている間もページは正しい方向に見えている。
export function textures(name) {
  if (!cache.has(name)) {
    const s = SURFACES[name];
    cache.set(name, { grain: makeGrain(s), mottle: makeMottle(s) });
  }
  return cache.get(name);
}

export const tileSize = TILE_CSS;

/// Tools/MakeStoreShot.swift の drawPaper と同じ順序・同じアルファ。
/// 1. 地色の膜  2. 画面全体に伸ばすムラ  3. タイル状の紙目
export function layers(name, intensity) {
  const s = SURFACES[name];
  const k = intensity / 100;
  const [r, g, b] = s.tint;
  return {
    tintColor: `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`,
    tintAlpha: s.maxTintAlpha * k,
    mottleAlpha: s.maxMottleAlpha * k,
    grainAlpha: s.maxGrainAlpha * k
  };
}
