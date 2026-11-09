import {
  Ctx, W, H, clamp, lerp, prog, smooth, eio, eis, eoc, eiq, rng, noise, hash, twos,
} from './util';
import {
  glow, streak, sparkle4, heroStar, drawSky, drawWater, reflect, rippleBands, shimmer, lightColumn,
  drawBirds, motes, vgrad, skyRect,
} from './fx';
import { drawGirl, drawTrain, steam } from './characters';
import { ShotFn } from './assets';

// ================= SHOT 1 / SHOT 10 : the sky lets go (and takes them back) =================
export const SKY_STARS = (() => {
  const r = rng(77);
  const a: { x: number; y: number; rel: number; fall: number; tx: number; sz: number }[] = [];
  for (let i = 0; i < 28; i++) {
    const x = 100 + r() * 1720;
    const y = 30 + r() * 330;
    a.push({ x, y, rel: 3.0 + (i / 28) * 6.4 + r() * 0.2, fall: 1.3 + r() * 1.1, tx: x + (r() - 0.15) * 420, sz: 3 + r() * 4 });
  }
  return a;
})();

function qpos(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, u: number) {
  const a = (1 - u) * (1 - u);
  const b = 2 * (1 - u) * u;
  const c = u * u;
  return [a * x0 + b * cx + c * x1, a * y0 + b * cy + c * y1];
}

function starsLayer(c: Ctx, tm: number, hy: number, rise: boolean, pan: number) {
  const dy = hy - 560;
  SKY_STARS.forEach((s, i) => {
    const sx = s.x + pan;
    const sy = s.y + dy;
    const u = (tm - s.rel) / s.fall;
    const pos = (uu: number) => {
      const e = Math.pow(clamp(uu), 1.7);
      return qpos(sx, sy, sx + (s.tx - s.x) * 0.45, sy + (hy - sy) * 0.12, s.tx + pan, hy + 2, e);
    };
    if (u <= 0) {
      const warn = u > -0.4 ? 1 + (u + 0.4) * 3 : 1;
      const a = (0.5 + 0.5 * Math.sin(tm * (2 + (i % 5) * 0.6) + i)) * 0.8 + 0.2;
      glow(c, sx, sy, s.sz * 7 * warn, '190,215,255', 0.35 * a);
      sparkle4(c, sx, sy, s.sz * 2.6 * warn, 0, '225,238,255', a);
    } else if (u < 1.0) {
      const [hx, hyy] = pos(u);
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.lineCap = 'butt';
      let px = hx;
      let py = hyy;
      for (let k = 1; k <= 18; k++) {
        const uk = rise ? u + k * 0.022 : u - k * 0.022;
        if (uk < 0 || uk > 1) break;
        const [x, y] = pos(uk);
        const f = 1 - k / 19;
        c.strokeStyle = `rgba(200,225,255,${Math.pow(f, 1.6) * 0.85})`;
        c.lineWidth = s.sz * 0.9 * f + 0.6;
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(x, y);
        c.stroke();
        px = x;
        py = y;
      }
      c.restore();
      glow(c, hx, hyy, 26 + s.sz * 4, '200,225,255', 0.9);
      sparkle4(c, hx, hyy, s.sz * 2.4, 0.4, '235,245,255', 1);
    } else {
      const age = (u - 1) * s.fall;
      if (age < 1.5) {
        const r = age * 110 + 4;
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = `rgba(190,220,255,${(1 - age / 1.5) * 0.55})`;
        c.lineWidth = 1.5;
        c.beginPath();
        c.ellipse(s.tx + pan, hy + 5, r, r * 0.1, 0, 0, Math.PI * 2);
        c.stroke();
        c.restore();
      }
    }
  });
}

function bigStar(c: Ctx, tm: number, hy: number, start: [number, number], rise: boolean, pan: number) {
  const t0 = 8;
  const t1 = 11;
  const sx = start[0] + pan;
  const sy = start[1] + (hy - 560);
  const ex = 1130 + pan;
  const ey = hy - 4;
  const pos = (uu: number) => qpos(sx, sy, 900 + pan, sy + 180, ex, ey, Math.pow(clamp(uu), 1.5));
  if (tm < t0) {
    if (rise) heroStar(c, sx, sy, 9, tm, 0.95);
    return;
  }
  const u = prog(tm, t0, t1);
  if (u < 1) {
    const [hx, hyy] = pos(u);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'butt';
    let px = hx;
    let py = hyy;
    for (let k = 1; k <= 46; k++) {
      const uk = rise ? u + k * 0.011 : u - k * 0.011;
      if (uk < 0 || uk > 1) break;
      const [x, y] = pos(uk);
      const f = 1 - k / 47;
      c.strokeStyle = `rgba(255,${Math.round(150 + 90 * f)},${Math.round(100 + 110 * f)},${Math.pow(f, 1.3) * 0.8})`;
      c.lineWidth = 11 * f + 1;
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(x, y);
      c.stroke();
      px = x;
      py = y;
    }
    c.restore();
    heroStar(c, hx, hyy, 10, tm, 1);
  } else {
    const age = tm - t1;
    // impact: flash, shock rings, then the star sits in the water
    glow(c, ex, hy + 10, 1500, '255,225,190', 0.9 * Math.exp(-age * 1.9));
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const a2 = age - k * 0.22;
      if (a2 <= 0) continue;
      const r = a2 * 640;
      c.strokeStyle = `rgba(255,226,180,${Math.max(0, 1 - a2 / 2.2) * 0.6})`;
      c.lineWidth = 2.5;
      c.beginPath();
      c.ellipse(ex, hy + 16, r, r * 0.11, 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
    heroStar(c, ex, hy + 14, 8, tm, 0.9);
  }
}

export function nightSky(c: Ctx, tm: number, A: { night: HTMLImageElement }, rise: boolean, bright = 0) {
  const p = prog(tm, 0, 12);
  const hy = lerp(560, 610, eio(p));
  const zoom = lerp(1.2, 1.1, p);
  const pan = lerp(40, -40, p);
  drawSky(c, A.night, hy, zoom, pan);
  const shed = smooth(5, 10.5, tm);
  c.fillStyle = `rgba(4,8,26,${shed * 0.55})`;
  c.fillRect(0, 0, W, hy);
  if (bright > 0) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = bright * 0.4;
    drawSky(c, A.night, hy, zoom, pan);
    c.restore();
  }
  drawWater(c, A.night, hy, tm, { zoom, panX: pan, tint: '4,14,36', tintTop: 0.12, tintBot: 0.72, amp: 5 });
  reflect(c, hy, () => starsLayer(c, tm, hy, rise, pan), 0.35);
  starsLayer(c, tm, hy, rise, pan);
  rippleBands(c, hy, tm, '4,14,36', 0.4, 4);
  shimmer(c, hy, tm, '150,220,255', 0.45, 11);
  const bs: [number, number] = rise ? [1500, 190] : [260, -60];
  if (tm > 8 && tm < 11) lightColumn(c, 1130 + pan, hy + 4, '255,210,160', 0.5 * smooth(8, 10.8, tm), tm, 1.2);
  if (tm >= 11) lightColumn(c, 1130 + pan, hy + 4, '255,210,160', 0.5 * (0.6 + 0.2 * Math.sin(tm * 3)), tm, 1.1);
  bigStar(c, tm, hy, bs, rise, pan);
  vgrad(c, 0, H, [[0, 'rgba(0,10,40,0.0)'], [1, 'rgba(0,4,20,0.25)']]);
}

export const shotNight: ShotFn = (c, t, _d, A) => nightSky(c, t, A, false);

// ================= SHOT 2 / SHOT 11 : the platform =================
function drawRails(c: Ctx, rim: string, vx: number, vy: number) {
  const pts: { x: number; y: number; s: number }[] = [];
  for (let k = 0; k <= 26; k++) {
    const s = 1 / (1 + 0.5 * k);
    pts.push({ x: vx - 500 * s, y: vy + 162 * s, s });
  }
  c.save();
  // posts + reflections
  pts.forEach((p) => {
    c.fillStyle = '#070b1c';
    c.fillRect(p.x - 4.5 * p.s, p.y + 9 * p.s, 9 * p.s, 59 * p.s);
    c.globalAlpha = 0.3;
    c.fillRect(p.x - 4.5 * p.s, p.y + 68 * p.s, 9 * p.s, 59 * p.s);
    c.globalAlpha = 1;
  });
  c.fillStyle = '#0a1230';
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
  for (let i = pts.length - 1; i >= 0; i--) c.lineTo(pts[i].x, pts[i].y + 9 * pts[i].s);
  c.fill();
  c.globalAlpha = 0.28;
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y + 136 * p.s) : c.moveTo(p.x, p.y + 136 * p.s)));
  for (let i = pts.length - 1; i >= 0; i--) c.lineTo(pts[i].x, pts[i].y + 145 * pts[i].s);
  c.fill();
  c.globalAlpha = 1;
  c.strokeStyle = `rgba(${rim},0.55)`;
  for (let i = 0; i < pts.length - 1; i++) {
    c.lineWidth = Math.max(0.6, 2.2 * pts[i].s);
    c.beginPath();
    c.moveTo(pts[i].x, pts[i].y);
    c.lineTo(pts[i + 1].x, pts[i + 1].y);
    c.stroke();
  }
  c.restore();
}

function drawPier(c: Ctx, rim: string) {
  c.fillStyle = '#0a1128';
  c.fillRect(-320, 656, 1100, 26);
  c.fillStyle = `rgba(${rim},0.6)`;
  c.fillRect(-320, 656, 1100, 2.5);
  c.fillStyle = 'rgba(0,0,10,0.5)';
  for (let x = -300; x < 780; x += 64) c.fillRect(x, 658, 2, 24);
  c.fillStyle = '#070b1c';
  [-200, -40, 120, 280, 440, 600, 765].forEach((x) => c.fillRect(x - 8, 682, 16, 44));
}

export const shotPlatform = (mood: 'blue' | 'dawn'): ShotFn => (c, t, d, A) => {
  const dawn = mood === 'dawn';
  const img = dawn ? A.dawn : A.blue;
  const hy = 482;
  const p = prog(t, 0, d);
  const z = dawn ? lerp(1.2, 1.0, eis(p)) : lerp(1.0, 1.15, eis(p));
  const pan = dawn ? lerp(46, 0, eis(p)) : lerp(0, 70, eis(p));
  const fx = W * 0.5;
  const fy = hy + 90;
  const rim = dawn ? '255,205,170' : '255,185,120';
  c.save();
  c.translate(fx, fy);
  c.scale(z, z);
  c.translate(-fx, -fy);
  const zp = 1.14;
  const sp = -pan * 0.15;
  drawSky(c, img, hy, zp, sp);
  vgrad(c, hy - 80, hy + 4, [[0, 'rgba(255,190,160,0)'], [1, dawn ? 'rgba(255,215,185,0.4)' : 'rgba(255,170,140,0.3)']], -300, W + 600);
  const r = skyRect(img, hy, zp, sp);
  const sunX = r.px + r.pw * 0.698;
  const starX = 1388;
  drawWater(c, img, hy, t, {
    zoom: zp, panX: sp, tint: dawn ? '70,100,130' : '8,20,56', tintTop: 0.06, tintBot: dawn ? 0.42 : 0.62,
    amp: dawn ? 3 : 7, calm: 1,
  });
  if (dawn) {
    glow(c, sunX, hy, 560, '255,214,170', 0.5);
    streak(c, sunX, hy, 1500, 16, '255,225,190', 0.5);
    lightColumn(c, sunX, hy + 2, '255,214,170', 0.6, t, 1.5);
  } else {
    lightColumn(c, starX - pan * 0.5, hy + 4, '255,196,140', 0.5, t, 0.9);
  }
  // mid layer: rails + pier reflection
  c.save();
  c.translate(-pan * 0.5, 0);
  drawRails(c, rim, 1380, 494);
  c.restore();
  c.save();
  c.translate(-pan, 0);
  reflect(c, 724, () => drawPier(c, rim), 0.4);
  c.restore();
  rippleBands(c, hy, t, dawn ? '70,100,130' : '8,20,56', dawn ? 0.3 : 0.45, 8);
  shimmer(c, hy, t, dawn ? '255,230,200' : '255,200,150', dawn ? 0.8 : 0.5, 6);

  if (!dawn) {
    // the fallen star at the end of the rails
    const sx = starX - pan * 0.5;
    const pulse = 0.75 + 0.25 * Math.sin(t * 2.2);
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(0, 120, 0, 494);
    g.addColorStop(0, 'rgba(255,210,160,0)');
    g.addColorStop(1, `rgba(255,210,160,${0.28 * pulse})`);
    c.fillStyle = g;
    c.fillRect(sx - 5, 120, 10, 374);
    c.restore();
    heroStar(c, sx, 490, 7, t, pulse);
  }

  // pier layer
  c.save();
  c.translate(-pan, 0);
  drawPier(c, rim);
  // lamp
  const L = dawn ? 1 : 0.5 + 0.18 * noise(Math.floor(t * 8) * 1.3) + 0.12 * Math.sin(t * 1.7);
  c.fillStyle = '#070b1c';
  c.fillRect(636, 440, 8, 216);
  c.beginPath();
  c.moveTo(640, 442);
  c.quadraticCurveTo(642, 424, 678, 432);
  c.lineTo(678, 438);
  c.quadraticCurveTo(650, 432, 646, 448);
  c.fill();
  c.fillStyle = `rgba(255,214,140,${0.6 + 0.4 * L})`;
  c.fillRect(670, 438, 16, 24);
  c.fillStyle = '#070b1c';
  c.fillRect(667, 434, 22, 5);
  glow(c, 678, 452, 220 * L + 50, '255,200,120', 0.75 * L);
  c.save();
  c.globalCompositeOperation = 'lighter';
  const lg = c.createLinearGradient(0, 462, 0, 660);
  lg.addColorStop(0, `rgba(255,205,130,${0.2 * L})`);
  lg.addColorStop(1, 'rgba(255,205,130,0)');
  c.fillStyle = lg;
  c.beginPath();
  c.moveTo(672, 462);
  c.lineTo(684, 462);
  c.lineTo(840, 658);
  c.lineTo(520, 658);
  c.fill();
  c.restore();
  // Mio
  drawGirl(c, {
    x: 738, y: 654, s: 0.95, pose: 'sit', dir: 1, t,
    body: dawn ? '#2b3158' : '#141c3c', hair: dawn ? '#1c1f45' : '#0c1330', scarf: '#ee5b4b',
    rim, rimSide: 1, amb: dawn ? '255,210,190' : '110,140,220', wind: dawn ? 0.4 : 0.55,
  });
  c.restore();

  // atmosphere
  drawBirds(c, t, 1900, 250, dawn ? 24 : 34, 7, 13, dawn ? 'rgba(70,60,100,0.8)' : 'rgba(8,14,40,0.8)');
  if (dawn) motes(c, t, [200, 200, 1300, 700], 70, '255,232,190', 21, 30, 2.4);
  else motes(c, t, [300, 380, 1100, 700], 36, '190,215,255', 9, 12, 2.2);
  c.restore();
  vgrad(c, 0, H, [[0, dawn ? 'rgba(80,60,120,0.0)' : 'rgba(10,20,90,0.16)'], [1, 'rgba(0,0,20,0.28)']]);
};

// ================= SHOT 3 / SHOT 8 : the eye =================
type P2 = [number, number];
const bez = (a: P2, b: P2, cc: P2, d: P2, u: number): P2 => {
  const m = 1 - u;
  return [
    m * m * m * a[0] + 3 * m * m * u * b[0] + 3 * m * u * u * cc[0] + u * u * u * d[0],
    m * m * m * a[1] + 3 * m * m * u * b[1] + 3 * m * u * u * cc[1] + u * u * u * d[1],
  ];
};
const mixP = (a: P2, b: P2, k: number): P2 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

function strand(c: Ctx, x0: number, y0: number, len: number, w: number, sway: number, col: string, rim: string) {
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x0 - w / 2, y0);
  c.quadraticCurveTo(x0 - w / 2 + sway * 0.5, y0 + len * 0.5, x0 + sway, y0 + len);
  c.quadraticCurveTo(x0 + w / 2 + sway * 0.5, y0 + len * 0.5, x0 + w / 2, y0);
  c.fill();
  c.strokeStyle = rim;
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(x0 + w / 2 - 2, y0);
  c.quadraticCurveTo(x0 + w / 2 + sway * 0.5 - 2, y0 + len * 0.5, x0 + sway, y0 + len - 4);
  c.stroke();
}

export const shotEye = (mode: 1 | 2): ShotFn => (c, t, d, _A) => {
  const p = prog(t, 0, d);
  const z = lerp(1.0, 1.1, eis(p));
  const tq = twos(t);
  const I: P2 = [430, 440];
  const O: P2 = [1470, 395];
  const U1: P2 = [620, 225];
  const U2: P2 = [1190, 185];
  const L1: P2 = [700, 585];
  const L2: P2 = [1210, 590];
  const blinks = mode === 1 ? [2.6, 5.1] : [1.9, 3.7];
  let b = 0;
  blinks.forEach((bt) => {
    const x = (t - bt) / 0.26;
    if (x > 0 && x < 1) b = Math.max(b, Math.sin(Math.PI * x));
  });
  const warmRGB = mode === 1 ? '255,190,130' : '255,205,150';

  c.save();
  c.translate(W / 2, H / 2);
  c.scale(z, z);
  c.translate(-W / 2 + noise(t * 0.6) * 5, -H / 2 + noise(t * 0.6 + 7) * 4);
  // skin
  let g = c.createLinearGradient(-100, 0, W + 100, 0);
  g.addColorStop(0, '#76679a');
  g.addColorStop(0.35, '#c79aa8');
  g.addColorStop(0.75, '#efbaa2');
  g.addColorStop(1, mode === 1 ? '#ffd0a4' : '#ffc3a8');
  c.fillStyle = g;
  c.fillRect(-100, -100, W + 200, H + 200);
  let rg = c.createRadialGradient(960, 80, 40, 960, 80, 520);
  rg.addColorStop(0, 'rgba(60,30,90,0.55)');
  rg.addColorStop(1, 'rgba(60,30,90,0)');
  c.fillStyle = rg;
  c.fillRect(-100, -100, W + 200, 700);
  rg = c.createRadialGradient(1300, 700, 20, 1300, 700, 520);
  rg.addColorStop(0, 'rgba(255,230,210,0.35)');
  rg.addColorStop(1, 'rgba(255,230,210,0)');
  c.fillStyle = rg;
  c.fillRect(600, 400, 1400, 500);
  // nose bridge shade
  g = c.createLinearGradient(-100, 0, 340, 0);
  g.addColorStop(0, 'rgba(50,30,90,0.55)');
  g.addColorStop(1, 'rgba(50,30,90,0)');
  c.fillStyle = g;
  c.fillRect(-100, -100, 440, H + 200);

  // eyebrow
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(48,28,64,0.9)';
  [26, 16].forEach((lw, i) => {
    c.lineWidth = lw * (i ? 0.8 : 1);
    c.beginPath();
    c.moveTo(430, 150 - (b * 4));
    c.bezierCurveTo(700, 62 - b * 4, 1150, 40 - b * 4, 1500, 146 - b * 4);
    c.stroke();
  });

  // aperture
  const U1b = mixP(U1, L1, b * 0.97);
  const U2b = mixP(U2, L2, b * 0.97);
  c.save();
  c.beginPath();
  c.moveTo(I[0], I[1]);
  c.bezierCurveTo(U1b[0], U1b[1], U2b[0], U2b[1], O[0], O[1]);
  c.bezierCurveTo(L2[0], L2[1], L1[0], L1[1], I[0], I[1]);
  c.clip();
  g = c.createLinearGradient(0, 200, 0, 600);
  g.addColorStop(0, '#a79bc4');
  g.addColorStop(0.4, '#f1e4ee');
  g.addColorStop(1, '#fff3f2');
  c.fillStyle = g;
  c.fillRect(300, 150, 1300, 500);
  // iris
  const lookX = mode === 1 ? lerp(-44, 34, eis(prog(t, 0, 3.2))) : lerp(14, -10, eis(prog(t, 0, 2.5)));
  const lookY = mode === 1 ? lerp(24, -10, smooth(3, 6.2, t)) : -26 * smooth(0, 2.2, t);
  const ic: P2 = [960 + lookX, 400 + lookY];
  const R = 160;
  g = c.createLinearGradient(0, ic[1] - R, 0, ic[1] + R);
  g.addColorStop(0, '#07173a');
  g.addColorStop(0.45, mode === 1 ? '#1b5f9d' : '#3a4f9a');
  g.addColorStop(1, mode === 1 ? '#7ff0e6' : '#ffd07c');
  c.fillStyle = g;
  c.beginPath();
  c.arc(ic[0], ic[1], R, 0, Math.PI * 2);
  c.fill();
  const lim = c.createRadialGradient(ic[0], ic[1], R * 0.72, ic[0], ic[1], R);
  lim.addColorStop(0, 'rgba(5,10,40,0)');
  lim.addColorStop(1, 'rgba(5,10,40,0.85)');
  c.fillStyle = lim;
  c.beginPath();
  c.arc(ic[0], ic[1], R, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 1.6;
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    const r0 = R * (0.32 + 0.1 * hash(i));
    const r1 = R * (0.7 + 0.25 * hash(i + 99));
    c.strokeStyle = hash(i + 3) > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,10,50,0.22)';
    c.beginPath();
    c.moveTo(ic[0] + Math.cos(a) * r0, ic[1] + Math.sin(a) * r0);
    c.lineTo(ic[0] + Math.cos(a) * r1, ic[1] + Math.sin(a) * r1);
    c.stroke();
  }
  // pupil
  const dil = mode === 1 ? lerp(1.0, 0.82, smooth(2, 6, t)) : lerp(0.8, 1.15, smooth(0.5, 3, t));
  c.fillStyle = '#040818';
  c.beginPath();
  c.arc(ic[0], ic[1], R * 0.37 * dil, 0, Math.PI * 2);
  c.fill();
  // the reflection of what she sees
  if (mode === 1) {
    const grow = smooth(0.8, 5.5, t);
    glow(c, ic[0] + 10, ic[1] + 56, 120 * grow, warmRGB, 0.85 * grow);
    sparkle4(c, ic[0] + 10, ic[1] + 56, 62 * grow, tq * 0.3, '255,246,225', 0.95 * grow);
  } else {
    // the ring, mirrored in her iris
    const grow = smooth(0.2, 2.2, t);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = `rgba(255,214,150,${0.8 * grow})`;
    c.lineWidth = 6;
    c.beginPath();
    c.ellipse(ic[0] + 6, ic[1] + 30, 78 * grow, 70 * grow, -0.18, 0, Math.PI * 2);
    c.stroke();
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(ic[0] + 6, ic[1] + 30, 96 * grow, 88 * grow, -0.18, 0, Math.PI * 2);
    c.stroke();
    c.restore();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - 0.18;
      sparkle4(c, ic[0] + 6 + Math.cos(a) * 78 * grow, ic[1] + 30 + Math.sin(a) * 70 * grow, 7 * grow, 0, '255,240,200', 0.9);
    }
    glow(c, ic[0], ic[1] + 20, 130, '255,200,140', 0.4 * grow);
  }
  // catchlights
  c.fillStyle = 'rgba(255,255,255,0.96)';
  c.beginPath();
  c.ellipse(ic[0] - 52, ic[1] - 62, 38, 30, -0.4, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.beginPath();
  c.arc(ic[0] + 58, ic[1] + 46, 14, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(ic[0] + 30, ic[1] - 76, 6.5, 0, Math.PI * 2);
  c.fill();
  // upper lid shadow
  g = c.createLinearGradient(0, 180, 0, 360);
  g.addColorStop(0, 'rgba(28,14,64,0.75)');
  g.addColorStop(1, 'rgba(28,14,64,0)');
  c.fillStyle = g;
  c.fillRect(300, 150, 1300, 260);
  // wet lower line
  c.strokeStyle = 'rgba(255,255,255,0.4)';
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(I[0] + 40, I[1] + 40);
  c.bezierCurveTo(L1[0], L1[1] - 14, L2[0], L2[1] - 14, O[0] - 40, O[1] + 36);
  c.stroke();
  c.restore();

  // lid lines
  c.lineCap = 'round';
  c.strokeStyle = '#1a0f2e';
  c.lineWidth = 17;
  c.beginPath();
  c.moveTo(I[0] - 6, I[1] + 2);
  c.bezierCurveTo(U1b[0], U1b[1], U2b[0], U2b[1], O[0] + 6, O[1] - 2);
  c.stroke();
  c.lineWidth = 5;
  c.strokeStyle = 'rgba(255,214,190,0.5)';
  c.beginPath();
  c.moveTo(I[0] + 60, I[1] - 18);
  c.bezierCurveTo(U1b[0] + 30, U1b[1] - 12, U2b[0] - 60, U2b[1] - 12, O[0] - 80, O[1] - 20);
  c.stroke();
  // crease
  c.strokeStyle = 'rgba(120,70,120,0.55)';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(I[0] + 30, I[1] - 60);
  c.bezierCurveTo(U1b[0] + 10, U1b[1] - 62 + b * 20, U2b[0] - 20, U2b[1] - 62 + b * 20, O[0] - 20, O[1] - 60);
  c.stroke();
  // lashes
  c.strokeStyle = '#1a0f2e';
  for (let j = 0; j < 5; j++) {
    const u = 0.7 + j * 0.075;
    const [x, y] = bez(I, U1b, U2b, O, u);
    c.lineWidth = 9 - j * 1.2;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + 40 + j * 8, y - 8 + j * 4, x + 80 + j * 6, y + 14 + j * 14);
    c.stroke();
  }
  for (let j = 0; j < 4; j++) {
    const [x, y] = bez(I, L1, L2, O, 0.82 + j * 0.05);
    c.lineWidth = 3.5;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 22, y + 18 + j * 2);
    c.stroke();
  }
  c.strokeStyle = 'rgba(110,60,100,0.8)';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(I[0], I[1]);
  c.bezierCurveTo(L1[0], L1[1], L2[0], L2[1], O[0], O[1]);
  c.stroke();

  // hair strands in front, hand-animated on twos
  const sw = (k: number) => noise(tq * 1.3 + k * 9) * 16;
  const hcol = '#0b1230';
  const hrim = `rgba(${warmRGB},0.55)`;
  strand(c, 90, -40, 560, 120, 60 + sw(1), hcol, hrim);
  strand(c, 230, -40, 480, 70, 40 + sw(2), hcol, hrim);
  strand(c, 360, -40, 330, 46, 20 + sw(3), hcol, hrim);
  strand(c, 1180 + sw(5) * 0.4, -40, 250, 12, 18 + sw(4), hcol, hrim);
  strand(c, 1700, -40, 300, 30, -30 + sw(6), hcol, hrim);
  c.restore();
  glow(c, 1850, 520, 700, warmRGB, mode === 1 ? 0.28 : 0.22);
  motes(c, t, [0, 0, W, H], 26, '255,230,200', 17, 10, 2);
  vgrad(c, 0, H, [[0, 'rgba(10,0,40,0.25)'], [0.5, 'rgba(10,0,40,0)'], [1, 'rgba(10,0,40,0.3)']]);
};

// ================= SHOT 4 : the train arrives =================
export const shotArrive: ShotFn = (c, t, d, A) => {
  const hy = 430;
  const p = prog(t, 0, d);
  const pan = lerp(0, -40, eis(p));
  const zp = 1.16;
  const RAIL = 600;
  c.save();
  c.translate(noise(t * 2) * 1.2, noise(t * 2 + 5) * 1.2);
  drawSky(c, A.blue, hy, zp, pan * 0.3);
  vgrad(c, hy - 80, hy + 4, [[0, 'rgba(255,170,140,0)'], [1, 'rgba(255,170,140,0.3)']]);
  drawWater(c, A.blue, hy, t, { zoom: zp, panX: pan * 0.3, tint: '8,18,50', tintTop: 0.06, tintBot: 0.7, amp: 6 });
  const front = (tt: number) => -40 + 1660 * eoc(prog(tt, 0.4, 11.4));
  const X = front(t);
  const s = 1.12;
  const trestle = () => {
    c.fillStyle = '#0a1228';
    c.fillRect(-60, RAIL, W + 120, 14);
    c.fillStyle = 'rgba(150,190,255,0.35)';
    c.fillRect(-60, RAIL, W + 120, 2);
    c.fillStyle = '#070b1c';
    for (let x = 0; x < W + 120; x += 120) c.fillRect(x - 7, RAIL + 14, 14, 26);
  };
  const train = () =>
    drawTrain(c, { x: X, y: RAIL, s, dir: 1, dist: X, cars: 2, warm: 0.15, rim: '150,190,255', glowWin: 1, lamp: 0, t });
  reflect(c, 640, () => { trestle(); train(); }, 0.4);
  // light from windows on the water
  for (let i = 0; i < 6; i++) glow(c, X - i * 170 * s + 40, 690, 260, '255,190,100', 0.1);
  rippleBands(c, hy, t, '8,18,50', 0.45, 2);
  shimmer(c, hy, t, '200,215,255', 0.5, 5);
  trestle();
  steam(c, t, front, { y: RAIL, s, dir: 1, drift: -18, rise: 36, lit: '#97abd6', shade: '#4d5c92' });
  drawTrain(c, { x: X, y: RAIL, s, dir: 1, dist: X, cars: 2, warm: 0.15, rim: '150,190,255', glowWin: 1, lamp: smooth(0, 3, t), t, bob: Math.sin(X * 0.05) * 0.6 * (1 - p) });
  // foreground pier + Mio
  c.fillStyle = '#05091a';
  c.fillRect(-20, 742, W + 40, H - 740);
  c.fillStyle = 'rgba(255,200,140,0.35)';
  c.fillRect(-20, 742, W + 40, 2);
  c.fillStyle = 'rgba(0,0,10,0.6)';
  for (let x = 0; x < W; x += 90) c.fillRect(x, 744, 2, 70);
  c.fillStyle = '#05091a';
  c.beginPath();
  c.roundRect(1296, 690, 40, 56, 8);
  c.fill();
  const k = 0.35 + 0.65 * smooth(1.5, 9, t);
  drawGirl(c, {
    x: 1730, y: 748, s: 1.08, pose: 'stand', dir: -1, t,
    body: '#121a38', hair: '#0a102c', scarf: '#ee5b4b',
    rim: `${Math.round(255 * k)},${Math.round(205 * k)},${Math.round(140 * k)}`, rimSide: -1, amb: '110,140,220', wind: 0.5,
  });
  c.restore();
  vgrad(c, 0, H, [[0, 'rgba(10,20,90,0.14)'], [1, 'rgba(0,0,20,0.25)']]);
  // dusk warms as the lamp arrives
  c.fillStyle = `rgba(255,120,90,${0.08 * smooth(4, 11, t)})`;
  c.fillRect(0, 0, W, H);
};

// ================= SHOT 5a : the run across the water =================
export const shotRun: ShotFn = (c, t, _d, A) => {
  const hy = 450;
  const zp = 1.25;
  const pan = -t * 9;
  const SPEED = 900;
  const RAIL = 590;
  c.save();
  c.translate(noise(t * 3) * 2, noise(t * 3 + 9) * 2);
  drawSky(c, A.sunset, hy, zp, pan);
  const r = skyRect(A.sunset, hy, zp, pan);
  const sunX = r.px + r.pw * 0.258;
  const sunY = r.py + r.ph * 0.795;
  drawWater(c, A.sunset, hy, t, { zoom: zp, panX: pan, tint: '70,24,80', tintTop: 0.05, tintBot: 0.55, amp: 9 });
  lightColumn(c, sunX, hy, '255,190,110', 0.6, t, 1.5);
  // speed streaks on the water
  c.save();
  c.globalCompositeOperation = 'lighter';
  const rr = rng(12);
  for (let i = 0; i < 70; i++) {
    const q = Math.pow(rr(), 1.5);
    const y = hy + 8 + q * (H - hy - 8);
    const sp = 120 + 2600 * q;
    const x = ((rr() * (W + 600) - t * sp) % (W + 600) + (W + 600)) % (W + 600) - 300;
    c.fillStyle = `rgba(255,205,170,${0.05 + 0.2 * q})`;
    c.fillRect(x, y, 80 + 600 * q, 1 + 2.4 * q);
  }
  c.restore();
  const X = 1500;
  const s = 1.0;
  const trestle = () => {
    c.fillStyle = '#1b1238';
    c.fillRect(-60, RAIL, W + 120, 14);
    c.fillStyle = 'rgba(255,190,130,0.5)';
    c.fillRect(-60, RAIL, W + 120, 2);
    c.fillStyle = '#150e2e';
    for (let i = 0; i < 16; i++) {
      const x = ((i * 150 - t * SPEED) % 2400 + 2400) % 2400 - 100;
      c.fillRect(x - 7, RAIL + 14, 14, 36);
    }
  };
  const train = () => drawTrain(c, { x: X, y: RAIL, s, dir: 1, dist: t * SPEED, cars: 2, warm: 1, rim: '255,190,120', glowWin: 0.8, t, bob: noise(t * 9) * 1.2 });
  reflect(c, 640, () => { trestle(); train(); }, 0.38);
  rippleBands(c, hy, t, '70,24,80', 0.4, 3);
  shimmer(c, hy, t, '255,210,160', 1, 7);
  glow(c, sunX, sunY, 700, '255,190,120', 0.5);
  streak(c, sunX, sunY, 1600, 22, '255,210,150', 0.55);
  trestle();
  steam(c, t, () => X, { y: RAIL, s, dir: 1, drift: -760, rise: 70, lit: '#ffd9cf', shade: '#a77aa6', life: 2.2, dt: 0.12 });
  train();
  // foreground pylons whip past
  for (let i = 0; i < 3; i++) {
    const x = ((i * 900 - t * 1500) % 2700 + 2700) % 2700 - 300;
    const g = c.createLinearGradient(x, 0, x + 120, 0);
    g.addColorStop(0, 'rgba(10,6,24,1)');
    g.addColorStop(0.25, 'rgba(10,6,24,0.9)');
    g.addColorStop(1, 'rgba(10,6,24,0)');
    c.fillStyle = g;
    c.fillRect(x, -10, 120, H + 20);
    c.fillStyle = 'rgba(255,190,120,0.7)';
    c.fillRect(x - 1, -10, 2, H + 20);
  }
  drawBirds(c, t, 1500, 200, 60, 6, 14, 'rgba(60,20,70,0.85)', 31);
  motes(c, t, [0, 150, W, 650], 60, '255,220,170', 14, -40, 2.4);
  c.restore();
  vgrad(c, 0, H, [[0, 'rgba(60,20,110,0.12)'], [1, 'rgba(20,0,40,0.3)']]);
};

// ================= SHOT 5b : on the rear deck =================
export const shotDeck: ShotFn = (c, t, d, A) => {
  const hy = 440;
  const zp = 1.6;
  const pan = 320 - t * 6;
  const p = prog(t, 0, d);
  const z = lerp(1.0, 1.07, eis(p));
  c.save();
  c.translate(1150, 560);
  c.scale(z, z);
  c.translate(-1150, -560);
  c.translate(noise(t * 3) * 2.5, noise(t * 3 + 3) * 2.5);
  drawSky(c, A.sunset, hy, zp, pan);
  const r = skyRect(A.sunset, hy, zp, pan);
  const sunX = r.px + r.pw * 0.258;
  const sunY = r.py + r.ph * 0.795;
  drawWater(c, A.sunset, hy, t, { zoom: zp, panX: pan, tint: '70,24,80', tintTop: 0.05, tintBot: 0.5, amp: 10 });
  lightColumn(c, sunX, hy, '255,190,110', 0.6, t, 1.7);
  glow(c, sunX, sunY, 900, '255,190,120', 0.6);
  streak(c, sunX, sunY, 1800, 26, '255,215,160', 0.6);
  c.save();
  c.globalCompositeOperation = 'lighter';
  const rr = rng(22);
  for (let i = 0; i < 60; i++) {
    const q = Math.pow(rr(), 1.3);
    const y = hy + 10 + q * (745 - hy - 10);
    const sp = 200 + 3200 * q;
    const x = ((rr() * (W + 800) - t * sp) % (W + 800) + (W + 800)) % (W + 800) - 400;
    c.fillStyle = `rgba(255,205,170,${0.05 + 0.18 * q})`;
    c.fillRect(x, y, 120 + 800 * q, 1 + 3 * q);
  }
  c.restore();
  shimmer(c, hy, t, '255,210,160', 0.9, 8);
  // poles whipping behind her
  for (let i = 0; i < 2; i++) {
    const x = ((i * 1300 - t * 1900) % 2600 + 2600) % 2600 - 300;
    const g = c.createLinearGradient(x, 0, x + 200, 0);
    g.addColorStop(0, 'rgba(14,8,30,0)');
    g.addColorStop(0.3, 'rgba(14,8,30,0.8)');
    g.addColorStop(0.55, 'rgba(14,8,30,0.8)');
    g.addColorStop(1, 'rgba(14,8,30,0)');
    c.fillStyle = g;
    c.fillRect(x, 0, 200, 700);
  }
  // Mio
  const hand = drawGirl(c, {
    x: 1150, y: 758, s: 1.75, pose: 'stand', dir: 1, t, hold: true,
    body: '#241a44', hair: '#1a1238', scarf: '#f0604c',
    rim: '255,200,130', rimSide: -1, rimW: 5, amb: '255,170,150', wind: 1,
  });
  glow(c, hand.hx, hand.hy, 260, '255,210,150', 0.5);
  heroStar(c, hand.hx, hand.hy, 8, t, 1);
  // railing
  c.fillStyle = '#0d0820';
  c.fillRect(-100, 652, W + 200, 9);
  c.fillStyle = 'rgba(255,190,130,0.7)';
  c.fillRect(-100, 652, W + 200, 2);
  for (let x = 20; x < W + 100; x += 96) c.fillRect(x, 661, 7, 100);
  c.fillRect(-100, 744, W + 200, H);
  c.restore();
  motes(c, t, [0, 100, W, 700], 50, '255,225,180', 41, -30, 2.6);
  vgrad(c, 0, H, [[0, 'rgba(60,20,110,0.1)'], [1, 'rgba(20,0,40,0.35)']]);
};

export const _unused = { eiq };
