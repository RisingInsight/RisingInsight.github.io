// Generate forward/reverse diffusion sprite sheets for the image demo.
// Usage: node scripts/generate-image-diffusion-demo.mjs
// Change SOURCE to use another image; rerun and commit public/demo/*.webp.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SOURCE = 'public/avatar.jpg';
const OUT_DIR = 'public/demo';
const FRAME = 192;
const STEPS = 200;
const CAPTURE_EVERY = 10;
const COLS = 7;
const CAPTURES = STEPS / CAPTURE_EVERY + 1;

function mulberry32(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(random) {
  let u = 0;
  let v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const { data: sourceData } = await sharp(SOURCE)
  .resize(FRAME, FRAME, { fit: 'cover' })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const x0 = new Float32Array(sourceData.length);
for (let i = 0; i < sourceData.length; i++) x0[i] = sourceData[i] / 255;
const pixels = FRAME * FRAME * 3;

const betas = [];
const alphas = [];
const alphaBars = [];
for (let i = 0; i < STEPS; i++) {
  const beta = 1e-4 + (0.04 - 1e-4) * (i / (STEPS - 1));
  betas.push(beta);
  alphas.push(1 - beta);
}
let running = 1;
for (let i = 0; i < STEPS; i++) {
  running *= alphas[i];
  alphaBars.push(running);
}
const alphaBarAt = (t) => (t <= 0 ? 1 : alphaBars[t - 1]);

function toRaw(values) {
  const out = Buffer.alloc(pixels);
  for (let i = 0; i < pixels; i++) {
    out[i] = Math.max(0, Math.min(255, Math.round(values[i] * 255)));
  }
  return out;
}

async function frameToPng(raw) {
  return sharp(raw, { raw: { width: FRAME, height: FRAME, channels: 3 } }).png().toBuffer();
}

async function writeSheet(name, frames) {
  const rows = Math.ceil(frames.length / COLS);
  const composites = [];
  for (let i = 0; i < frames.length; i++) {
    composites.push({
      input: await frameToPng(frames[i]),
      left: (i % COLS) * FRAME,
      top: Math.floor(i / COLS) * FRAME,
    });
  }
  const path = `${OUT_DIR}/${name}.webp`;
  await sharp({
    create: {
      width: COLS * FRAME,
      height: rows * FRAME,
      channels: 3,
      background: { r: 251, g: 250, b: 247 },
    },
  })
    .composite(composites)
    .webp({ quality: 82 })
    .toFile(path);
  return path;
}

await mkdir(OUT_DIR, { recursive: true });

// Forward process: exact DDPM noising at t = 0, 10, ..., 200.
const forwardRandom = mulberry32(20261021);
const forwardFrames = [];
for (let capture = 0; capture < CAPTURES; capture++) {
  const t = capture * CAPTURE_EVERY;
  const alphaBar = alphaBarAt(t);
  const signal = Math.sqrt(alphaBar);
  const noise = Math.sqrt(1 - alphaBar);
  const frame = new Float32Array(pixels);
  for (let i = 0; i < pixels; i++) {
    frame[i] = x0[i] * signal + gaussian(forwardRandom) * noise;
  }
  forwardFrames.push(toRaw(frame));
}

// Reverse process: a single-image empirical score.
// q(x_t | x_0) = N(sqrt(abar_t) x_0, (1-abar_t) I)
// score = (x_0 - x_t) / (1-abar_t), then the DDPM ancestral step.
// This is a real reverse diffusion for a degenerate (single-image) data
// distribution: it illustrates the trajectory, not a trained generative model.
const reverseRandom = mulberry32(424242);
let state = new Float32Array(pixels);
for (let i = 0; i < pixels; i++) state[i] = gaussian(reverseRandom);
const reverseFrames = new Array(CAPTURES);
reverseFrames[0] = toRaw(state);

for (let t = STEPS; t >= 1; t--) {
  const beta = betas[t - 1];
  const alpha = alphas[t - 1];
  const alphaBar = alphaBarAt(t);
  const variance = 1 - alphaBar;
  const next = new Float32Array(pixels);
  for (let i = 0; i < pixels; i++) {
    const score = (x0[i] - state[i]) / variance;
    next[i] = (state[i] + beta * score) / Math.sqrt(alpha) + Math.sqrt(beta) * gaussian(reverseRandom);
  }
  state = next;
  if ((t - 1) % CAPTURE_EVERY === 0) {
    reverseFrames[(STEPS - (t - 1)) / CAPTURE_EVERY] = toRaw(state);
  }
}

const forwardPath = await writeSheet('image-forward', forwardFrames);
const reversePath = await writeSheet('image-reverse', reverseFrames);
console.log(JSON.stringify({
  forwardPath,
  reversePath,
  frame: FRAME,
  captures: CAPTURES,
  schedule: { steps: STEPS, betaStart: betas[0], betaEnd: betas[STEPS - 1], alphaBarStart: alphaBars[0], alphaBarEnd: alphaBars[STEPS - 1] },
}, null, 2));
