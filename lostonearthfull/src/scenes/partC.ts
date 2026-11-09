import { W, H, clamp, lerp, hash, E, prog, rng, tc, battery, KNOCKS } from "../engine/util";
import {
  cover, blurred, mist, shafts, motes, fireflies, birds, glints, ferns, flash, desat, tint, vignette, black, mono, rec, batteryIcon,
  speedLines, chapterCard, glow, ring, typeText, F, type C2, type Assets,
} from "../engine/fx";
import { animeEye, blink } from "../engine/eye";
import type { Scene, Cap } from "./types";

/* ======================================================================= 7 · THE DARK */
const S7caps: Cap[] = [
  [4.0, 7.7, "Dark falls fast in the jungle. Not dusk. A door closing."],
  [8.2, 11.0, "And then my headlamp died."],
  [11.9, 15.9, "Grandpa used to say the forest talks all night… to anyone patient enough to shut up."],
  [16.4, 20.4, "He gave me my first pair of headphones when I was six."],
  [21.0, 24.6, "He said: the world isn't quiet. We're just loud."],
  [26.6, 30.4, "…Then the forest answered."],
  [31.2, 35.6, "Foxfire. Mycelium. A network under every footstep, older than any city."],
  [37.0, 41.6, "It wasn't only glowing. Every pulse was travelling in one direction."],
  [42.2, 45.7, "Like a signal. Like a finger, pointing."],
];

// ---- mycelium network, anchored in image-uv space and grown from a seeded generator
const TRUNK_KEYS: [number, number][] = [
  [0.16, 0.72], [0.27, 0.82], [0.42, 0.85], [0.58, 0.83], [0.7, 0.8], [0.8, 0.74], [0.84, 0.68], [0.78, 0.62], [0.72, 0.57], [0.78, 0.54],
];
const NET = (() => {
  const R = rng(7);
  const trunk: [number, number][] = [];
  for (let i = 0; i < TRUNK_KEYS.length - 1; i++) {
    const [a, b] = [TRUNK_KEYS[i], TRUNK_KEYS[i + 1]];
    for (let s = 0; s < 14; s++) {
      const k = s / 14;
      trunk.push([lerp(a[0], b[0], k) + (R() - 0.5) * 0.008, lerp(a[1], b[1], k) + (R() - 0.5) * 0.008]);
    }
  }
  trunk.push(TRUNK_KEYS[TRUNK_KEYS.length - 1]);
  const branches: { idx: number; pts: [number, number][] }[] = [];
  for (let i = 0; i < 38; i++) {
    const idx = Math.floor(R() * (trunk.length - 8));
    let [x, y] = trunk[idx];
    const dirTo = Math.atan2(trunk[idx + 4][1] - y, trunk[idx + 4][0] - x);
    let a = dirTo + (R() < 0.5 ? -1 : 1) * (0.7 + R() * 0.8);
    const pts: [number, number][] = [[x, y]];
    const n = 8 + Math.floor(R() * 8);
    for (let s = 0; s < n; s++) {
      a += (R() - 0.5) * 0.9;
      x += Math.cos(a) * 0.018;
      y += Math.sin(a) * 0.03;
      pts.push([x, y]);
    }
    branches.push({ idx, pts });
  }
  return { trunk, branches };
})();

function network(c: C2, lt: number, cam: { map: (u: number, v: number) => [number, number]; s: number }, strength: number) {
  const N = NET.trunk.length;
  const head = E.inOutSine(prog(lt, 0.8, 9)) * N;
  c.save();
  c.globalCompositeOperation = "lighter";
  c.lineCap = "round";
  c.lineJoin = "round";
  const pulse = (j: number) => 0.4 + 0.6 * Math.pow(0.5 + 0.5 * Math.sin(j * 0.2 - lt * 3.4), 3);
  for (let j = 1; j < N && j < head; j++) {
    const [x0, y0] = cam.map(...NET.trunk[j - 1]);
    const [x1, y1] = cam.map(...NET.trunk[j]);
    const p = pulse(j) * strength;
    c.strokeStyle = `rgba(70,255,210,${0.1 * p})`;
    c.lineWidth = 22 * cam.s;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.strokeStyle = `rgba(190,255,240,${0.95 * p})`;
    c.lineWidth = 4 * cam.s;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  }
  for (const b of NET.branches) {
    const g = clamp((head - b.idx) / 14);
    const cnt = Math.floor(g * (b.pts.length - 1));
    for (let s = 1; s <= cnt; s++) {
      const [x0, y0] = cam.map(...b.pts[s - 1]);
      const [x1, y1] = cam.map(...b.pts[s]);
      const p = (0.35 + 0.5 * pulse(b.idx + s * 2)) * strength * (1 - s / b.pts.length * 0.6);
      c.strokeStyle = `rgba(90,255,220,${0.75 * p})`;
      c.lineWidth = 2.2 * cam.s;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    }
  }
  // the head of growth glows
  if (head < N && head > 1) {
    const [hx, hy] = cam.map(...NET.trunk[Math.floor(head)]);
    c.drawImage(glowSprite2, hx - 60, hy - 60, 120, 120);
  }
  c.restore();
}
import { glowSprite } from "../engine/fx";
const glowSprite2 = glowSprite("120,255,220");

function lampShot(c: C2, t: number, g: number, A: Assets) {
  cover(c, A.fungi_night, { z: 1.05, fx: 0.3, fy: 0.56 });
  let on = 1;
  if (t > 8) on = hash(Math.floor(t * 18) * 3.1) > 0.45 ? 0.75 : 0.08;
  if (t > 10.4) on = 0;
  const lx = W * 0.4 + Math.sin(t * 0.8) * 150;
  const ly = H * 0.6 + Math.cos(t * 0.6) * 50;
  const dark = 0.96;
  const gr = c.createRadialGradient(lx, ly, 20, lx, ly, 600 * (0.6 + 0.4 * on));
  gr.addColorStop(0, `rgba(0,0,6,${lerp(dark, 0.04, on)})`);
  gr.addColorStop(0.5, `rgba(0,0,6,${lerp(dark, 0.55, on)})`);
  gr.addColorStop(1, `rgba(0,0,6,${dark})`);
  c.fillStyle = gr;
  c.fillRect(0, 0, W, H);
  c.save();
  c.globalCompositeOperation = "lighter";
  glow(c, lx, ly, 520, "255,225,170", 0.16 * on);
  c.restore();
  fireflies(c, t, 3, 26, { rgb: "200,255,150", size: 14 });
  // low-battery HUD
  const a = E.outCubic(prog(t, 3.8, 4.6));
  const blinkOn = on > 0.5 || t < 8;
  mono(c, `HEADLAMP  ${t > 10.4 ? "00" : "03"}%`, 90, 70, 22, blinkOn ? "#ffd7a0" : "#ff5a4a", "left", 4, a);
  mono(c, t > 10.4 ? "■ OFFLINE" : "LOW BATTERY", 90, 100, 15, "#ff8a7a", "left", 4, a * (t > 8 ? 1 : 0.6));
  rec(c, g, 0.0);
  vignette(c, 0.5);
}

function flashbackShot(c: C2, lt: number, A: Assets) {
  const k = E.inOutSine(prog(lt, 0, 14));
  cover(c, A.flashback, { z: lerp(1.0, 1.17, k), fx: 0.5, fy: lerp(0.52, 0.58, k), ox: Math.sin(lt * 0.3) * 8 });
  tint(c, "rgba(255,170,90,0.5)", "soft-light");
  fireflies(c, lt, 12, 34, { rgb: "255,210,120", size: 15, y0: 0.15, y1: 0.8 });
  motes(c, lt, 14, 40, { size: 8, alpha: 0.6, vx: 5, vy: -4 });
  // film dust + soft flicker
  const f = Math.floor(lt * 12);
  c.save();
  c.strokeStyle = "rgba(255,240,220,0.25)";
  c.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const x = hash(f * 3.3 + i * 9.1) * W;
    c.globalAlpha = hash(f + i * 1.7) > 0.7 ? 0.6 : 0;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x + (hash(f + i) - 0.5) * 8, H);
    c.stroke();
  }
  c.restore();
  vignette(c, 0.55, "40,10,0", 0.3);
  flash(c, (1 - prog(lt, 0, 0.9)) * 0.9, "255,228,190");
  black(c, prog(lt, 13.2, 14));
}

function ignition(c: C2, lt: number, t: number, A: Assets) {
  const k = E.inOutSine(prog(lt, 0, 21));
  const cam = cover(c, A.fungi_night, { z: lerp(1.05, 1.4, k), fx: lerp(0.3, 0.62, k), fy: lerp(0.56, 0.6, k) });
  const dark = lerp(0.97, 0, E.inOutSine(prog(lt, 5, 14.5)));
  black(c, dark);
  network(c, lt, cam, lerp(1, 0.75, prog(lt, 10, 20)));
  fireflies(c, t, 5, 36, { rgb: "170,255,190", size: 15 });
  motes(c, t, 6, 40, { size: 7, alpha: 0.5, rgb: "120,255,220", vx: 6, vy: -4 });
  vignette(c, 0.45);
}

export const sceneDark: Scene = {
  id: "dark", label: "Trial 04 · The Dark", start: 180, dur: 46, fin: 0.6, fout: 0.5, bloom: 0.34, caps: S7caps,
  draw: (c, t, g, A) => {
    if (t < 11) {
      lampShot(c, t, g, A);
      chapterCard(c, t, "TRIAL 04", "THE DARK", "第四の試練 ― 闇");
    } else if (t < 25) {
      flashbackShot(c, t - 11, A);
    } else {
      ignition(c, t - 25, t, A);
    }
  },
};

/* ======================================================================= 8 · THE KNOCKING */
const S8caps: Cap[] = [
  [1.0, 5.2, "And then, from somewhere inside the glow… a sound that wasn't the jungle."],
  [7.9, 11.6, "Wait. Rewind. I've heard this before."],
  [12.0, 15.6, "Three knocks. Every minute or so. And every time… louder."],
  [16.0, 19.2, "That's not the forest. That's a message. Somebody's been calling me home."],
  [19.9, 23.2, "Battery, two percent. Don't die yet. Don't die yet."],
  [23.8, 27.6, "Every knock closer. Every knock louder."],
  [28.0, 30.4, "I stopped being lost around then. I started being… led."],
  [31.8, 35.6, "Day two. And for the first time, the jungle didn't feel like it was against me."],
];

function fungiCam(c: C2, t: number, A: Assets) {
  const k = prog(t, 0, 30);
  return cover(c, A.fungi_night, { z: lerp(1.4, 1.95, k), fx: lerp(0.62, 0.8, k), fy: lerp(0.6, 0.58, k), ox: Math.sin(t * 0.7) * 4 });
}

function knockRings(c: C2, lt: number, times: number[], x: number, y: number) {
  for (const k of times) {
    const u = (lt - k) / 1.7;
    if (u > 0 && u < 1) ring(c, x, y, E.outExpo(u) * 1100, (1 - u) * 0.8, "190,255,235", 5);
  }
}

function strip(c: C2, u: number) {
  const x0 = 150, x1 = 1770, yc = 400, span = 250;
  const X = (s: number) => x0 + (s / span) * (x1 - x0);
  const kIn = E.outExpo(prog(u, 0.0, 0.8));
  c.fillStyle = `rgba(0,6,8,${0.8 * kIn})`;
  c.fillRect(0, 0, W, H);
  c.save();
  c.globalAlpha = kIn;
  c.font = `96px ${F.title}`;
  c.fillStyle = "#f6fff9";
  c.fillText("PLAYBACK", x0, 150);
  c.restore();
  mono(c, "LOG 001 · FULL RECORDING · 00:00 → 03:53", x0 + 330, 144, 17, "#7fd9c0", "left", 4, kIn);

  let ph = 233;
  if (u >= 0.6 && u < 4.2) ph = lerp(233, 0, E.inOutCubic(prog(u, 0.6, 4.2)));
  else if (u >= 4.2 && u < 5) ph = 0;
  else if (u >= 5 && u < 10) ph = lerp(0, 233, E.inOutCubic(prog(u, 5, 10)));
  // waveform
  c.save();
  c.globalAlpha = kIn;
  for (let s = 0; s <= 233; s += 1.6) {
    const x = X(s);
    const h = 8 + 56 * hash(s * 3.7) * (0.5 + 0.5 * Math.sin(s * 0.4));
    const passed = s <= ph;
    c.fillStyle = passed ? "rgba(120,255,225,0.75)" : "rgba(80,150,140,0.35)";
    c.fillRect(x, yc - h / 2, 6, h);
  }
  // time ticks
  for (let s = 0; s <= 240; s += 30) {
    mono(c, tc(s).slice(3), X(s), yc + 120, 14, "#6fb3a5", "center", 2, kIn);
    c.fillStyle = "rgba(120,200,185,0.4)";
    c.fillRect(X(s), yc + 80, 1, 22);
  }
  c.restore();
  // knock markers
  const amps = [0.28, 0.42, 0.58, 0.8, 1];
  const lit: [number, number][] = [];
  KNOCKS.slice(0, 5).forEach((ks, i) => {
    const a = clamp((ph - ks + 2) / 4);
    const x = X(ks);
    const hgt = 40 + amps[i] * 150;
    c.save();
    c.globalAlpha = kIn * (0.15 + 0.85 * a);
    c.fillStyle = "#ff9a3c";
    for (let q = 0; q < 3; q++) c.fillRect(x - 12 + q * 12, yc - hgt / 2, 5, hgt);
    mono(c, tc(ks).slice(3), x, yc - hgt / 2 - 16, 16, "#ffd2a0", "center", 2);
    c.restore();
    if (a > 0.5) lit.push([x, yc - hgt / 2 - 40]);
    if (a > 0.9) glow(c, x, yc, 120, "255,150,60", 0.25 * kIn);
  });
  if (lit.length > 1) {
    c.save();
    c.strokeStyle = "rgba(255,170,80,0.8)";
    c.setLineDash([10, 8]);
    c.lineWidth = 2.5;
    c.beginPath();
    lit.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
    c.restore();
  }
  // playhead
  c.save();
  c.globalAlpha = kIn;
  c.fillStyle = "#fff";
  c.fillRect(X(ph) - 1.5, yc - 120, 3, 240);
  c.beginPath();
  c.moveTo(X(ph) - 10, yc - 128);
  c.lineTo(X(ph) + 10, yc - 128);
  c.lineTo(X(ph), yc - 110);
  c.closePath();
  c.fill();
  c.restore();
  mono(c, tc(ph), X(ph), yc - 142, 18, "#ffffff", "center", 3, kIn);
  // analysis
  const ik = E.outCubic(prog(u, 6.8, 7.6));
  mono(c, "INTERVAL   66s  →  54s  →  48s  →  42s", x0, 612, 24, "#ffcfa0", "left", 4, ik);
  mono(c, "AMPLITUDE   ▁ ▂ ▄ ▆ █", x0 + 780, 612, 24, "#ffcfa0", "left", 4, ik);
  typeText(c, "NOT RANDOM.", x0, 700, 9.4, u, { font: `120px ${F.title}`, color: "#ff7a2f", per: 0.06, sp: 6, rise: 14 });
}

function dawn(c: C2, lt: number, A: Assets) {
  const k = E.outQuint(prog(lt, 0, 5.4));
  const cam = cover(c, A.ridge_dawn, { z: lerp(1.35, 1.0, k), fx: 0.5, fy: lerp(0.62, 0.5, k) });
  const [sx, sy] = cam.map(0.5, 0.42);
  shafts(c, lt, { ox: sx, oy: sy, ang: Math.PI * 0.5, spread: 2.4, n: 12, alpha: 0.22, len: 1600, seed: 31 });
  glints(c, lt, 8, 40, cam.map, 0.1, 0.95, 0.45, 0.75, 10);
  mist(c, lt, 12, { alpha: 0.1, y0: 0.5, y1: 0.85, n: 8, speed: 12, size: 640 });
  birds(c, lt, 13, 6, { y0: 0.18, y1: 0.4, speed: 120, size: 22, rgb: "200,40,25", dir: -1 });
  motes(c, lt, 15, 30, { size: 8, alpha: 0.6 });
  vignette(c, 0.3);
  flash(c, (1 - prog(lt, 0, 0.9)), "255,235,200");
}

export const sceneKnock: Scene = {
  id: "knock", label: "The Knocking", start: 226, dur: 36, fin: 0.4, fout: 0.4, bloom: 0.32, caps: S8caps,
  draw: (c, t, g, A) => {
    if (t < 7.6) {
      fungiCam(c, t, A);
      fireflies(c, g, 5, 36, { rgb: "170,255,190", size: 15 });
      motes(c, g, 6, 40, { size: 7, alpha: 0.5, rgb: "120,255,220", vx: 6, vy: -4 });
      const lf = [6.0, 6.45, 6.9].reduce((a, k) => Math.max(a, t > k ? Math.exp(-(t - k) * 9) : 0), 0);
      flash(c, lf * 0.12, "180,255,230");
      knockRings(c, t, [6.0, 6.45, 6.9], W * 0.86, H * 0.55);
      vignette(c, 0.45);
    } else if (t < 19.6) {
      fungiCam(c, 7.6, A);
      strip(c, t - 7.6);
    } else if (t < 30.6) {
      const u = t - 19.6;
      const cam = cover(c, A.fungi_night, { z: lerp(1.55, 2.05, E.inQuad(prog(u, 0, 11))), fx: lerp(0.66, 0.8, prog(u, 0, 11)), fy: 0.58, ox: Math.sin(twosT(t) * 40) * 3, oy: Math.cos(twosT(t) * 33) * 3 });
      void cam;
      fireflies(c, t * 3, 5, 46, { rgb: "170,255,190", size: 18 });
      speedLines(c, t, W / 2, H / 2, { inner: 720, color: "rgba(140,255,215,0.08)", n: 70, seed: 3 });
      ferns(c, t * 1.6, 77, { n: 9, sway: 2.2, scale: 1.2, grow: u * 0.05, dark: "rgba(2,12,14,0.96)", rim: "rgba(20,90,80,0.9)" });
      knockRings(c, u, [2.4, 2.85, 3.3, 10.0], W * 0.84, H * 0.5);
      vignette(c, 0.5);
      const a = E.outCubic(prog(u, 0.2, 1));
      rec(c, g, a * 0.9);
      batteryIcon(c, W - 190, 52, battery(g), a);
    } else {
      dawn(c, t - 30.6, A);
    }
  },
};
const twosT = (t: number) => Math.floor(t * 12) / 12;

/* ======================================================================= 9 · THE CLEARING */
const S9caps: Cap[] = [
  [0.8, 4.8, "Day two. By dusk, the knocks were so close I could feel them in my teeth."],
  [5.2, 8.8, "A fire. Still warm. A hammock. Hundreds of tally marks carved into the roots."],
  [9.2, 12.8, "And on the tree… a handprint. Small. Red clay. Still wet."],
  [17.6, 21.2, "Tok. Tok. Tok. Right behind me."],
  [21.9, 25.9, "Whoever's been leading me home… is very small."],
];

function clearing(c: C2, t: number, g: number, A: Assets) {
  const u = E.inOutSine(prog(t, 0, 12));
  const v = E.inOutCubic(prog(t, 12, 16.4));
  let z = lerp(1.0, 2.2, u) + v * 1.4;
  for (const k of [15.0, 15.45, 15.9]) if (t > k) z *= 1 + 0.035 * Math.exp(-(t - k) * 9);
  const cam = cover(c, A.clearing, { z, fx: lerp(0.5, 0.495, u), fy: lerp(0.5, 0.46, u), ox: Math.sin(t * 0.5) * 5 });
  // campfire smoke + embers
  const [fx, fy] = cam.map(0.506, 0.895);
  c.save();
  for (let i = 0; i < 16; i++) {
    const age = ((t * 0.28 + i / 16) % 1);
    const x = fx + Math.sin(age * 5 + i) * 26 * cam.s * 1.2 + age * 40 * cam.s;
    const y = fy - age * 340 * cam.s * 1.1;
    const r = (24 + age * 120) * cam.s;
    c.globalAlpha = Math.sin(Math.PI * age) * 0.2;
    c.drawImage(glowSpriteGrey, x - r, y - r, r * 2, r * 2);
  }
  c.restore();
  c.save();
  c.globalCompositeOperation = "lighter";
  glow(c, fx, fy, 140 * cam.s, "255,150,50", 0.35 + 0.15 * Math.sin(t * 17) * Math.sin(t * 7.3));
  for (let i = 0; i < 14; i++) {
    const age = ((t * 0.5 + hash(i) * 3) % 1.6) / 1.6;
    const x = fx + (hash(i * 2.1) - 0.5) * 60 * cam.s + Math.sin(age * 6 + i) * 20 * cam.s;
    const y = fy - age * 260 * cam.s;
    glow(c, x, y, (5 + hash(i) * 6) * cam.s, "255,170,60", (1 - age) * 0.9);
  }
  c.restore();
  fireflies(c, t, 22, 40, { rgb: "210,255,120", size: 13, y0: 0.2, y1: 0.95 });
  mist(c, t, 4, { alpha: 0.08, n: 6, y0: 0.55, y1: 0.95, speed: 8, rgb: "200,190,230" });
  // handprint glow
  const [hx, hy] = cam.map(0.495, 0.455);
  const hk = prog(t, 8.8, 11);
  if (hk > 0) {
    c.save();
    c.globalCompositeOperation = "lighter";
    glow(c, hx, hy, 150 * cam.s, "255,70,50", 0.35 * hk * (0.7 + 0.3 * Math.sin(t * 3)));
    c.restore();
    for (let j = 0; j < 2; j++) {
      const ph = (t * 0.4 + j / 2) % 1;
      ring(c, hx, hy, (30 + ph * 150) * cam.s, (1 - ph) * 0.5 * hk, "255,120,90", 2.5);
    }
  }
  // knocks behind her
  for (const k of [15.0, 15.45, 15.9]) {
    const q = (t - k) / 1.4;
    if (q > 0 && q < 1) ring(c, W / 2, H * 1.1, E.outExpo(q) * 1500, (1 - q) * 0.7, "255,220,190", 6);
  }
  vignette(c, 0.4 + 0.3 * v);
  rec(c, g, t > 1 ? 0.75 : 0);
  batteryIcon(c, W - 190, 52, battery(g), 0.9);
}
import { glowSprite as gs } from "../engine/fx";
const glowSpriteGrey = gs("170,160,165");

function whip(c: C2, u: number, A: Assets) {
  const f = Math.floor(u * 24);
  const white = f % 2 === 1;
  c.fillStyle = white ? "#fff" : "#000";
  c.fillRect(0, 0, W, H);
  speedLines(c, u, W / 2, H / 2, { color: white ? "#000" : "#fff", inner: 120 + f * 60, seed: 40 + f, fps: 24, n: 120 });
  void A;
}

function cliffEye(c: C2, lt: number, A: Assets) {
  const op = 0.95 * blink(lt, 2.6, 0.3);
  const fig = E.inOutSine(prog(lt, 4.0, 7.8));
  animeEye(c, {
    cx: W / 2,
    cy: H / 2 + 20,
    w: lerp(1150, 1500, E.inOutCubic(prog(lt, 0, 9.4))),
    open: op,
    t: lt,
    lookX: 0.0,
    lookY: 0.0,
    pupil: lerp(0.6, 0.5, prog(lt, 0, 6)),
    tremor: 0.7,
    skin: ["#cf9a72", "#8f5a3f"],
    reflect: (g, r) => {
      g.save();
      g.globalAlpha = 0.65;
      g.drawImage(A.clearing, -r * 1.5, -r * 0.95, r * 3, r * 1.3);
      g.restore();
    },
    // the pupil becomes a tiny window: firelight, and a small silhouette standing in it
    after: (g, _r, pr) => {
      g.globalAlpha = fig;
      const gr = g.createRadialGradient(0, pr * 0.25, 0, 0, pr * 0.25, pr * 0.95);
      gr.addColorStop(0, "rgba(255,196,120,0.95)");
      gr.addColorStop(0.55, "rgba(255,140,60,0.55)");
      gr.addColorStop(1, "rgba(255,120,40,0)");
      g.fillStyle = gr;
      g.fillRect(-pr, -pr, pr * 2, pr * 2);
      g.fillStyle = "#0b0503";
      const s = pr * 0.34;
      g.beginPath();
      g.arc(0, pr * 0.02, s * 0.26, 0, Math.PI * 2); // head
      g.fill();
      g.beginPath();
      g.moveTo(-s * 0.3, pr * 0.14);
      g.quadraticCurveTo(0, pr * 0.08, s * 0.3, pr * 0.14);
      g.lineTo(s * 0.4, pr * 0.62);
      g.lineTo(-s * 0.4, pr * 0.62);
      g.closePath();
      g.fill();
    },
  });
  tint(c, "rgba(255,200,160,0.35)", "soft-light");
  vignette(c, 0.6);
  motes(c, lt, 5, 14, { size: 7, alpha: 0.4 });
}

export const sceneClearing: Scene = {
  id: "clearing", label: "The Clearing", start: 262, dur: 28, fin: 0.7, fout: 0.8, bloom: 0.34, caps: S9caps,
  draw: (c, t, g, A) => {
    if (t < 16.4) clearing(c, t, g, A);
    else if (t < 17.0) whip(c, t - 16.4, A);
    else if (t < 26.4) {
      cliffEye(c, t - 17.0, A);
      rec(c, g, 0.7);
      batteryIcon(c, W - 190, 52, battery(g), 0.9);
    } else {
      c.fillStyle = "#000";
      c.fillRect(0, 0, W, H);
    }
    if (t > 26 && t < 26.6) black(c, 0);
    if (t > 25.6 && t < 26.4) black(c, prog(t, 25.6, 26.4));
  },
};

/* ======================================================================= 10 · END CARD */
export const sceneEnd: Scene = {
  id: "end", label: "End", start: 290, dur: 10, fin: 0, fout: 1.0, caps: [],
  draw: (c, t) => {
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);
    const gr = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 700);
    gr.addColorStop(0, "rgba(20,70,60,0.22)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = gr;
    c.fillRect(0, 0, W, H);
    // recording stops
    c.fillStyle = "#ff3b30";
    c.fillRect(W / 2 - 330, 150, 14, 14);
    typeText(c, "00:05:00  ·  RECORDING SAVED", W / 2 - 300, 164, 0.6, t, { font: `500 22px ${F.mono}`, color: "#ffd9d4", per: 0.035, sp: 4, rise: 6 });
    typeText(c, "LOST ON EARTH", W / 2, H / 2 + 20, 1.6, t, { font: `170px ${F.title}`, color: "#fff4e2", per: 0.06, sp: 10, align: "center", rise: 20 });
    c.fillStyle = "#ff7a2f";
    c.fillRect(W / 2 - 300 * E.outExpo(prog(t, 2.6, 3.4)), H / 2 + 52, 600 * E.outExpo(prog(t, 2.6, 3.4)), 3);
    mono(c, "EPISODE 01  ·  THE GREEN SILENCE  ·  END", W / 2, H / 2 + 100, 20, "#9fe8d2", "center", 8, E.outCubic(prog(t, 3.0, 4.0)));
    mono(c, "NEXT — EPISODE 02", W / 2, H / 2 + 190, 20, "#ffbe8a", "center", 10, E.outCubic(prog(t, 4.6, 5.4)));
    c.save();
    c.globalAlpha = E.outCubic(prog(t, 5.0, 6.0));
    c.font = `500 52px ${F.serif}`;
    c.textAlign = "center";
    c.fillStyle = "#fff4e2";
    c.fillText("ノックする者  ―  THE ONE WHO KNOCKS", W / 2, H / 2 + 262);
    c.restore();
    mono(c, "Every frame is a pure function of time — drawn, scored and synthesized in code.", W / 2, H - 70, 15, "#5f8f84", "center", 2, E.outCubic(prog(t, 7, 8)));
  },
};

void blurred;
void desat;
