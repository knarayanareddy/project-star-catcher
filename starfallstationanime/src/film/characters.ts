import { Ctx, makeCanvas, mix, noise, clamp } from './util';
import { glow, streak } from './fx';

// ============ MIO ============
const GW = 1500;
const GH = 1100;
const OX = 760;
const OY = 880;
const gA = makeCanvas(GW, GH);
const gB = makeCanvas(GW, GH);

export interface GirlOpts {
  x: number; // feet (stand) or hip (sit) in screen space
  y: number;
  s: number;
  pose: 'stand' | 'sit';
  dir: 1 | -1; // facing direction
  t: number; // time (seconds)
  body?: string;
  hair?: string;
  scarf?: string;
  skin?: string;
  rim: string; // 'r,g,b'
  rimSide: 1 | -1; // light comes from this screen side
  rimW?: number;
  amb?: string; // 'r,g,b' ambient top tint
  hold?: boolean;
  wind?: number; // 0..1
}

function ribbon(g: Ctx, nx: number, ny: number, len: number, w0: number, amp: number, ph: number, wind: number, col: string) {
  const N = 22;
  const top: number[][] = [];
  const bot: number[][] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = nx - u * len * (0.5 + 0.5 * wind);
    const y = ny + Math.sin(u * 7.2 - ph) * amp * u * (0.35 + wind) + u * u * len * 0.3 * (1 - wind) - u * wind * 6;
    const wd = w0 * (1 - 0.6 * u) * (0.65 + 0.35 * Math.sin(u * 9 - ph * 1.3 + 1));
    top.push([x, y - wd / 2]);
    bot.push([x, y + wd / 2]);
  }
  g.fillStyle = col;
  g.beginPath();
  top.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  for (let i = N; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]);
  g.closePath();
  g.fill();
}

function limb(g: Ctx, pts: number[][], w0: number, w1: number, col: string) {
  g.strokeStyle = col;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let i = 0; i < pts.length - 1; i++) {
    g.lineWidth = w0 + ((w1 - w0) * i) / (pts.length - 1);
    g.beginPath();
    g.moveTo(pts[i][0], pts[i][1]);
    g.lineTo(pts[i + 1][0], pts[i + 1][1]);
    g.stroke();
  }
}

export function drawGirl(c: Ctx, o: GirlOpts): { hx: number; hy: number; hx2: number; hy2: number } {
  const g = gA.getContext('2d')!;
  g.clearRect(0, 0, GW, GH);
  const body = o.body ?? '#16203f';
  const hair = o.hair ?? '#0e1530';
  const scarf = o.scarf ?? '#e8584a';
  const skin = o.skin ?? '#7c5e78';
  const wind = o.wind ?? 0.6;
  const tq = Math.floor(o.t * 12) / 12; // on twos
  const ph = tq * 5.5;
  const gust = 0.85 + 0.15 * noise(tq * 1.7);

  g.save();
  g.translate(OX, OY);
  g.scale(o.s * o.dir, o.s);
  let hand = { x: 0, y: 0 };
  if (o.pose === 'stand') {
    // back hair mass + locks
    g.fillStyle = hair;
    g.beginPath();
    g.ellipse(-6, -238, 24, 32, 0.15, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 4; i++) {
      const L = 90 + i * 22;
      ribbon(g, -16 + i * 2, -252 + i * 11, L * (0.5 + 0.5 * wind), 17 - i * 2, 12 + i * 3, ph + i * 0.7, wind * gust, hair);
    }
    // legs
    limb(g, [[-3, -132], [-6, -70], [-4, -12]], 21, 15, body);
    limb(g, [[6, -132], [10, -70], [12, -12]], 21, 15, mix(body, '#000000', 0.18));
    g.fillStyle = '#0b1128';
    g.beginPath();
    g.ellipse(-1, -7, 15, 8, 0, 0, Math.PI * 2);
    g.ellipse(16, -7, 15, 8, 0, 0, Math.PI * 2);
    g.fill();
    // coat
    const sw = Math.sin(ph * 1.2) * 5 * wind;
    const sw2 = Math.sin(ph * 1.2 + 1.3) * 7 * wind;
    g.fillStyle = body;
    g.beginPath();
    g.moveTo(-22, -230);
    g.lineTo(18, -230);
    g.quadraticCurveTo(26, -190, 22, -152);
    g.lineTo(32 + sw, -88);
    g.quadraticCurveTo(8, -78 + sw2, -34 - wind * 12, -92 + sw2);
    g.quadraticCurveTo(-28, -170, -22, -230);
    g.fill();
    // scarf behind/over the shoulder
    ribbon(g, -2, -226, 290, 21, 34, ph, wind * gust, scarf);
    g.fillStyle = scarf;
    g.beginPath();
    g.ellipse(2, -226, 17, 9, 0.1, 0, Math.PI * 2);
    g.fill();
    // arms
    if (o.hold) {
      limb(g, [[6, -218], [16, -176], [38, -186]], 12, 10, body);
      hand = { x: 40, y: -188 };
      g.fillStyle = skin;
      g.beginPath();
      g.arc(40, -188, 6, 0, Math.PI * 2);
      g.fill();
      limb(g, [[-4, -218], [10, -172], [34, -180]], 11, 9, mix(body, '#000000', 0.15));
    } else {
      limb(g, [[4, -218], [10, -180], [8 + sw * 0.3, -140]], 12, 9, body);
      hand = { x: 8, y: -138 };
      g.fillStyle = skin;
      g.beginPath();
      g.arc(8, -138, 6, 0, Math.PI * 2);
      g.fill();
    }
    // head
    g.fillStyle = skin;
    g.beginPath();
    g.ellipse(10, -248, 13, 18, 0.1, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = hair;
    g.beginPath();
    g.ellipse(2, -258, 25, 24, 0, Math.PI, Math.PI * 2);
    g.fill();
    g.beginPath(); // bangs
    g.moveTo(-22, -256);
    g.quadraticCurveTo(-2, -286, 24, -258);
    g.quadraticCurveTo(14, -252, 20, -240);
    g.quadraticCurveTo(6, -250, -4, -244);
    g.quadraticCurveTo(-14, -240, -22, -256);
    g.fill();
  } else {
    // ---- sitting, origin = hip ----
    g.fillStyle = hair;
    g.beginPath();
    g.ellipse(-4, -122, 24, 33, 0.1, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 4; i++) {
      ribbon(g, -14 + i * 2, -136 + i * 10, (70 + i * 20) * (0.5 + 0.5 * wind), 16 - i * 2, 9 + i * 3, ph + i * 0.7, wind * gust, hair);
    }
    // thigh + shin
    limb(g, [[2, -10], [64, -12]], 27, 22, mix(body, '#000000', 0.12));
    const sh = Math.sin(ph * 0.45) * 3;
    limb(g, [[64, -12], [70 + sh, 36], [74 + sh, 78]], 22, 15, mix(body, '#000000', 0.12));
    g.fillStyle = '#0b1128';
    g.beginPath();
    g.ellipse(84 + sh, 80, 17, 8, 0.05, 0, Math.PI * 2);
    g.fill();
    // torso
    g.fillStyle = body;
    g.beginPath();
    g.moveTo(-22, 4);
    g.quadraticCurveTo(-24, -60, -14, -104);
    g.lineTo(18, -104);
    g.quadraticCurveTo(28, -50, 32, 2);
    g.quadraticCurveTo(10, 8, -16, 2);
    g.fill();
    ribbon(g, -2, -100, 250, 20, 30, ph, wind * gust, scarf);
    g.fillStyle = scarf;
    g.beginPath();
    g.ellipse(4, -100, 16, 8, 0.1, 0, Math.PI * 2);
    g.fill();
    // arm resting on knee
    limb(g, [[6, -92], [26, -50], [56, -22]], 12, 9, body);
    hand = { x: 58, y: -22 };
    g.fillStyle = skin;
    g.beginPath();
    g.arc(58, -22, 6, 0, Math.PI * 2);
    g.fill();
    // head tilted up
    g.save();
    g.translate(8, -122);
    g.rotate(-0.12);
    g.fillStyle = skin;
    g.beginPath();
    g.ellipse(7, 4, 13, 18, 0.1, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = hair;
    g.beginPath();
    g.ellipse(0, -6, 25, 24, 0, Math.PI, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(-22, -4);
    g.quadraticCurveTo(-2, -34, 24, -6);
    g.quadraticCurveTo(14, 0, 19, 12);
    g.quadraticCurveTo(6, 2, -4, 8);
    g.quadraticCurveTo(-14, 12, -22, -4);
    g.fill();
    g.restore();
  }
  g.restore();

  // ---- shading: ambient from above ----
  g.save();
  g.globalCompositeOperation = 'source-atop';
  const amb = g.createLinearGradient(0, OY - 330 * o.s, 0, OY + 20);
  amb.addColorStop(0, `rgba(${o.amb ?? '120,150,220'},0.34)`);
  amb.addColorStop(0.55, `rgba(${o.amb ?? '120,150,220'},0.05)`);
  amb.addColorStop(1, 'rgba(0,0,10,0.28)');
  g.fillStyle = amb;
  g.fillRect(0, 0, GW, GH);
  g.restore();

  // ---- rim light: original minus copy shifted away from the light ----
  const rW = (o.rimW ?? 4.5) * Math.max(0.6, o.s);
  const b = gB.getContext('2d')!;
  b.clearRect(0, 0, GW, GH);
  b.globalCompositeOperation = 'source-over';
  b.drawImage(gA, 0, 0);
  b.globalCompositeOperation = 'destination-out';
  b.drawImage(gA, -o.rimSide * rW, rW * 0.15);
  b.globalCompositeOperation = 'source-in';
  b.fillStyle = `rgba(${o.rim},1)`;
  b.fillRect(0, 0, GW, GH);
  g.globalCompositeOperation = 'source-over';
  g.drawImage(gB, 0, 0);
  // soft wider rim (glow)
  b.globalCompositeOperation = 'source-over';

  c.drawImage(gA, o.x - OX, o.y - OY);

  const hx = o.x + o.dir * hand.x * o.s;
  const hy = o.y + hand.y * o.s;
  return { hx, hy, hx2: hx, hy2: hy };
}

// ============ TRAIN ============
export interface TrainOpts {
  x: number; // front x
  y: number; // rail top
  s: number;
  dir: 1 | -1;
  dist: number; // distance travelled in px (wheel spin)
  cars?: number;
  warm?: number; // 0 = blue hour, 1 = golden
  rim: string; // 'r,g,b'
  glowWin?: number; // window brightness
  lamp?: number; // headlamp power
  t: number;
  bob?: number;
}

export const TRAIN_LEN = 250 + 18 + 370 + 18 + 370;

function wheel(g: Ctx, x: number, y: number, r: number, ang: number, col: string) {
  g.fillStyle = '#0a1020';
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = col;
  g.lineWidth = Math.max(2, r * 0.12);
  g.beginPath();
  g.arc(x, y, r * 0.86, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = Math.max(1.5, r * 0.07);
  for (let i = 0; i < 6; i++) {
    const a = ang + (i / 6) * Math.PI * 2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82);
    g.stroke();
  }
  g.fillStyle = col;
  g.beginPath();
  g.arc(x, y, r * 0.16, 0, Math.PI * 2);
  g.fill();
}

export function drawTrain(c: Ctx, o: TrainOpts) {
  const warm = o.warm ?? 0;
  const winB = o.glowWin ?? 1;
  const body = mix('#1f5068', '#2c6275', warm);
  const bodyDark = mix('#12303f', '#1a3d4d', warm);
  const roof = mix('#0f2230', '#162e3e', warm);
  const trim = mix('#e5d3a4', '#f4dca6', warm);
  const wheelCol = mix('#7d93a8', '#d9b88a', warm);
  const cars = o.cars ?? 2;

  c.save();
  c.translate(o.x, o.y + (o.bob ?? 0));
  c.scale(o.s * o.dir, o.s);

  const rimLine = (path: () => void, w = 2.2, a = 0.9) => {
    c.save();
    c.strokeStyle = `rgba(${o.rim},${a})`;
    c.lineWidth = w;
    c.lineJoin = 'round';
    path();
    c.stroke();
    c.restore();
  };

  // ---- locomotive ----
  c.fillStyle = '#0c1624';
  c.fillRect(-250, -42, 250, 18);
  // boiler
  c.fillStyle = bodyDark;
  c.beginPath();
  c.roundRect(-232, -120, 222, 76, [10, 34, 34, 10]);
  c.fill();
  c.fillStyle = body;
  c.beginPath();
  c.roundRect(-232, -120, 222, 38, [10, 34, 0, 0]);
  c.fill();
  c.fillStyle = '#0d1b29';
  c.fillRect(-32, -118, 34, 74);
  c.fillStyle = trim;
  c.fillRect(-232, -66, 222, 5);
  // cab
  c.fillStyle = body;
  c.fillRect(-252, -170, 108, 130);
  c.fillStyle = roof;
  c.beginPath();
  c.roundRect(-262, -182, 128, 14, 5);
  c.fill();
  c.fillStyle = trim;
  c.fillRect(-252, -62, 108, 6);
  // cab window
  const wa = 0.75 + 0.25 * winB;
  c.fillStyle = `rgba(255,212,130,${wa})`;
  c.fillRect(-236, -150, 40, 44);
  c.fillStyle = '#0d1b29';
  c.fillRect(-217, -150, 3, 44);
  // chimney + dome
  c.fillStyle = '#0d1b29';
  c.beginPath();
  c.moveTo(-46, -118);
  c.lineTo(-42, -150);
  c.lineTo(-54, -170);
  c.lineTo(-20, -170);
  c.lineTo(-30, -150);
  c.lineTo(-26, -118);
  c.closePath();
  c.fill();
  c.fillStyle = bodyDark;
  c.beginPath();
  c.ellipse(-120, -121, 26, 22, 0, Math.PI, 0);
  c.fill();
  c.fillStyle = trim;
  c.fillRect(-146, -122, 52, 5);
  // cowcatcher
  c.fillStyle = '#0d1b29';
  c.beginPath();
  c.moveTo(2, -46);
  c.lineTo(34, -6);
  c.lineTo(-8, -6);
  c.closePath();
  c.fill();
  // wheels + rods
  const dr = 34;
  const ang = o.dist / dr;
  [-190, -130, -70].forEach((wx) => wheel(c, wx, -34, dr, ang, wheelCol));
  c.strokeStyle = '#26384c';
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(-190 + Math.cos(ang) * 20, -34 + Math.sin(ang) * 20);
  c.lineTo(-70 + Math.cos(ang) * 20, -34 + Math.sin(ang) * 20);
  c.stroke();
  wheel(c, -22, -17, 17, o.dist / 17, wheelCol);
  // rim light on loco
  rimLine(() => {
    c.beginPath();
    c.moveTo(-262, -182);
    c.lineTo(-134, -182);
    c.moveTo(-232, -120);
    c.quadraticCurveTo(-232, -120, -200, -120);
    c.lineTo(-44, -120);
    c.quadraticCurveTo(-12, -120, -10, -90);
    c.moveTo(-54, -170);
    c.lineTo(-20, -170);
  });
  // headlamp
  c.fillStyle = '#fff2c9';
  c.beginPath();
  c.arc(-2, -100, 9, 0, Math.PI * 2);
  c.fill();

  // ---- coaches ----
  let cx = -250 - 18;
  for (let k = 0; k < cars; k++) {
    const L = 370;
    const x0 = cx - L;
    // coupling
    c.fillStyle = '#0a1420';
    c.fillRect(cx, -62, 18, 8);
    // skirt
    c.fillStyle = '#0c1624';
    c.fillRect(x0 + 6, -44, L - 12, 14);
    // body
    c.fillStyle = bodyDark;
    c.beginPath();
    c.roundRect(x0, -164, L, 126, [26, 26, 6, 6]);
    c.fill();
    c.fillStyle = body;
    c.beginPath();
    c.roundRect(x0, -164, L, 52, [26, 26, 0, 0]);
    c.fill();
    // roof
    c.fillStyle = roof;
    c.beginPath();
    c.moveTo(x0 - 4, -150);
    c.quadraticCurveTo(x0 + L / 2, -196, x0 + L + 4, -150);
    c.lineTo(x0 + L + 4, -158);
    c.quadraticCurveTo(x0 + L / 2, -204, x0 - 4, -158);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(x0, -152);
    c.quadraticCurveTo(x0 + L / 2, -192, x0 + L, -152);
    c.lineTo(x0 + L, -144);
    c.lineTo(x0, -144);
    c.fill();
    // trim stripe
    c.fillStyle = trim;
    c.fillRect(x0, -80, L, 7);
    // windows
    for (let w = 0; w < 7; w++) {
      const wx = x0 + 28 + w * 48;
      const flick = 0.85 + 0.15 * Math.sin(o.t * 7 + w * 2 + k * 3);
      c.fillStyle = `rgba(255,210,125,${(0.7 + 0.3 * winB) * flick})`;
      c.beginPath();
      c.roundRect(wx, -138, 34, 46, 6);
      c.fill();
      c.fillStyle = '#10202e';
      c.fillRect(wx + 16, -138, 2.5, 46);
    }
    // rim light
    rimLine(() => {
      c.beginPath();
      c.moveTo(x0 + 2, -150);
      c.quadraticCurveTo(x0 + L / 2, -198, x0 + L - 2, -150);
    }, 2.4, 0.95);
    // bogies
    [x0 + 68, x0 + 104, x0 + L - 104, x0 + L - 68].forEach((wx) => wheel(c, wx, -20, 20, o.dist / 20, wheelCol));
    cx = x0 - 18;
  }
  c.restore();

  // window glow spill (screen space additive)
  const fx = (lx: number) => o.x + o.dir * lx * o.s;
  c.save();
  c.globalCompositeOperation = 'lighter';
  let gx = -250 - 18;
  for (let k = 0; k < cars; k++) {
    const x0 = gx - 370;
    for (let w = 0; w < 7; w++) {
      glow(c, fx(x0 + 45 + w * 48), o.y - 115 * o.s, 70 * o.s, '255,190,100', 0.22 * winB);
    }
    gx = x0 - 18;
  }
  glow(c, fx(-216), o.y - 128 * o.s, 90 * o.s, '255,190,100', 0.25 * winB);
  c.restore();
  const lamp = o.lamp ?? 0;
  if (lamp > 0) {
    const lx = fx(-2);
    const ly = o.y - 100 * o.s;
    glow(c, lx, ly, 120 * o.s, '255,235,180', 0.8 * lamp);
    streak(c, lx, ly, 520 * o.s, 14 * o.s, '255,235,190', 0.55 * lamp);
    // beam
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(lx, 0, lx + o.dir * 700 * o.s, 0);
    g.addColorStop(0, `rgba(255,230,170,${0.28 * lamp})`);
    g.addColorStop(1, 'rgba(255,230,170,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(lx, ly - 6);
    c.lineTo(lx + o.dir * 700 * o.s, ly - 120 * o.s);
    c.lineTo(lx + o.dir * 700 * o.s, ly + 90 * o.s);
    c.lineTo(lx, ly + 6);
    c.fill();
    c.restore();
  }
}

// steam puffs, deterministic from time
export function steam(
  c: Ctx,
  t: number,
  posAt: (tt: number) => number,
  o: { y: number; s: number; dir: 1 | -1; life?: number; dt?: number; drift: number; rise: number; lit: string; shade: string }
) {
  const life = o.life ?? 3.2;
  const dt = o.dt ?? 0.18;
  const k1 = Math.floor(t / dt);
  const k0 = Math.floor((t - life) / dt);
  c.save();
  for (let k = Math.max(0, k0); k <= k1; k++) {
    const tk = k * dt;
    const age = t - tk;
    const u = clamp(age / life);
    const cx0 = posAt(tk) + o.dir * o.s * -36;
    const cy0 = o.y - 170 * o.s;
    const x = cx0 + o.drift * age + noise(k * 3.3) * 14 * age;
    const y = cy0 - o.rise * age * (1 - u * 0.4);
    const r = o.s * (12 + age * 26);
    const a = Math.pow(1 - u, 1.3) * 0.55 * Math.min(1, age * 4);
    c.globalAlpha = a;
    const sg = c.createRadialGradient(x - r * 0.25, y - r * 0.28, r * 0.05, x, y, r);
    sg.addColorStop(0, o.lit);
    sg.addColorStop(0.55, o.shade);
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sg;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}
