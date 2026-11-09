import * as THREE from "three";
import { canvasTexture, rnd } from "./loft";
import { furTime } from "./fur";
import type { EnvId, EnvOpts, MoodId, Speaker } from "../story/script";

export interface EnvCtx {
  t: number;
  dt: number;
  st: number; // scene time
  opts: EnvOpts;
  mood: MoodId;
  talk: Record<Speaker, number>;
}
export interface Env {
  group: THREE.Group;
  update(c: EnvCtx): void;
}

const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);

function radialTex(inner: string, outer = "rgba(255,255,255,0)") {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.3, inner.replace(/[\d.]+\)$/, "0.35)"));
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

function glowSprite(color: number, size: number, opacity = 1) {
  const m = new THREE.SpriteMaterial({
    map: radialTex("rgba(255,255,255,1)"),
    color,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    opacity,
    toneMapped: false,
  });
  const s = new THREE.Sprite(m);
  s.scale.setScalar(size);
  return s;
}

/* ------------------------------------------------------------------ dumpster */
function makeDumpster() {
  const g = new THREE.Group();
  const r = rnd(11);
  const tex = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#1f6b3c";
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x, 0, 6, h);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(x + 6, 0, 3, h);
    }
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? "20,10,0" : "200,200,180"},${r() * 0.09})`;
      ctx.fillRect(r() * w, r() * h, 1 + r() * 14, 1 + r() * 3);
    }
    for (let i = 0; i < 24; i++) {
      const gr = ctx.createLinearGradient(0, 0, 0, 1);
      void gr;
      ctx.fillStyle = `rgba(120,60,20,${0.05 + r() * 0.1})`;
      ctx.fillRect(r() * w, r() * h * 0.6, 3 + r() * 6, 40 + r() * 140);
    }
  });
  tex.repeat.set(2, 1);
  const mat = std({ map: tex, bumpMap: tex, bumpScale: 1.2, roughness: 0.55, metalness: 0.35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.25, 1.1), mat);
  body.position.y = 0.72;
  body.castShadow = body.receiveShadow = true;
  g.add(body);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 1.2), std({ color: 0x14502b, roughness: 0.5, metalness: 0.5 }));
  rim.position.y = 1.36;
  g.add(rim);
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 1.38, -0.58);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.07, 1.2), std({ color: 0x1b5c34, roughness: 0.5, metalness: 0.45 }));
  lid.position.set(0, 0.03, 0.6);
  lid.castShadow = true;
  lidPivot.add(lid);
  g.add(lidPivot);
  for (const x of [-0.9, 0.9]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16), std({ color: 0x111111, roughness: 0.9 }));
    wh.rotation.z = Math.PI / 2;
    wh.position.set(x, 0.1, 0.45);
    g.add(wh);
  }
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x3dff7a, toneMapped: false });
  const eyes: THREE.Mesh[] = [];
  for (const x of [-0.52, 0.52]) {
    const e = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), eyeMat);
    e.position.set(x, 0.95, 0.56);
    e.scale.setScalar(0.001);
    g.add(e);
    eyes.push(e);
  }
  const light = new THREE.PointLight(0x66ff99, 0, 14);
  light.position.set(0, 1.0, 1.4);
  g.add(light);
  return {
    group: g,
    set(eyeAmt: number, talk: number, t: number) {
      eyes.forEach((e, i) => e.scale.setScalar(Math.max(0.001, eyeAmt * (1 + Math.sin(t * 3 + i) * 0.06))));
      light.intensity = eyeAmt * 5;
      lidPivot.rotation.x = -(0.04 + eyeAmt * 0.16 + talk * (0.25 + 0.25 * Math.abs(Math.sin(t * 9))));
    },
  };
}

/* ------------------------------------------------------------------ STREET */
function buildStreet(): Env {
  const g = new THREE.Group();
  const r = rnd(2);
  const asphalt = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#2b2d31";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 22000; i++) {
      const v = 30 + r() * 60;
      ctx.fillStyle = `rgba(${v},${v},${v + 4},${0.3 + r() * 0.5})`;
      ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      let x = r() * w, y = r() * h;
      ctx.moveTo(x, y);
      for (let k = 0; k < 8; k++) ctx.lineTo((x += (r() - 0.5) * 80), (y += (r() - 0.5) * 80));
      ctx.stroke();
    }
  });
  asphalt.repeat.set(14, 14);
  const rough = canvasTexture(
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = "#d0d0d0";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 14; i++) {
        const x = r() * w, y = r() * h, rad = 40 + r() * 110;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, "#4a4a4a");
        gr.addColorStop(0.7, "#5a5a5a");
        gr.addColorStop(1, "rgba(208,208,208,0)");
        ctx.fillStyle = gr;
        ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    },
    false
  );
  rough.repeat.set(3, 3);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshPhysicalMaterial({ map: asphalt, roughnessMap: rough, roughness: 1, metalness: 0.0, clearcoat: 0, specularIntensity: 0.3, envMapIntensity: 0.5 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  g.add(ground);

  const brick = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#5b5650";
    ctx.fillRect(0, 0, w, h);
    const bh = 32, bw = 96;
    for (let y = 0; y < h / bh; y++) {
      for (let x = -1; x < w / bw; x++) {
        const ox = (y % 2) * (bw / 2);
        const c = 90 + r() * 60;
        ctx.fillStyle = `rgb(${c + 30},${c * 0.55},${c * 0.45})`;
        ctx.fillRect(x * bw + ox + 3, y * bh + 3, bw - 6, bh - 6);
        for (let k = 0; k < 40; k++) {
          ctx.fillStyle = `rgba(0,0,0,${r() * 0.18})`;
          ctx.fillRect(x * bw + ox + r() * bw, y * bh + r() * bh, 2, 2);
        }
      }
    }
  });
  brick.repeat.set(10, 3);
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 12),
    new THREE.MeshStandardMaterial({ map: brick, bumpMap: brick, bumpScale: 3, roughness: 0.85 })
  );
  wall.position.set(0, 6, -4.6);
  wall.receiveShadow = true;
  g.add(wall);
  // wall streaks (grime)
  // neon sign
  const sign = canvasTexture(512, 192, (ctx, w, h) => {
    ctx.fillStyle = "#06060a";
    ctx.fillRect(0, 0, w, h);
    ctx.font = "bold 92px 'Arial Black', Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "#ff2d95";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#ff8cc5";
    ctx.fillText("BURGER", w / 2, 92);
    ctx.shadowColor = "#2de2ff";
    ctx.fillStyle = "#b8f6ff";
    ctx.font = "bold 66px 'Arial Black', Impact, sans-serif";
    ctx.fillText("BARN · 24H", w / 2, 168);
  });
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.28), new THREE.MeshBasicMaterial({ map: sign, toneMapped: false }));
  signMesh.position.set(2.4, 2.9, -4.55);
  g.add(signMesh);
  const neonL = new THREE.PointLight(0xff3d9a, 9, 9);
  neonL.position.set(2.4, 2.7, -3.4);
  g.add(neonL);
  const neonT = new THREE.PointLight(0x2de2ff, 3, 8);
  neonT.position.set(3.6, 2.2, -3.2);
  g.add(neonT);

  // dumpster
  const dump = makeDumpster();
  dump.group.position.set(-2.6, 0, -3.2);
  dump.group.rotation.y = 0.1;
  g.add(dump.group);

  // bags
  const bagMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0e, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.6 });
  for (const [x, z, s] of [[-1.3, -3.4, 0.5], [-0.9, -3.0, 0.38], [0.2, -3.7, 0.55], [-4.3, -2.6, 0.45]] as [number, number, number][]) {
    const geo = new THREE.SphereGeometry(s, 24, 18);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 1 + (r() - 0.5) * 0.18 + Math.sin(p.getX(i) * 9) * 0.05;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, bagMat);
    m.position.set(x, s * 0.7, z);
    m.castShadow = true;
    g.add(m);
  }
  // soda cup + fries
  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.07, 0.24, 20),
    std({ color: 0xd8302c, roughness: 0.5 })
  );
  cup.position.set(-0.9, 0.08, 1.5);
  cup.rotation.z = Math.PI / 2 - 0.2;
  cup.castShadow = true;
  g.add(cup);
  // fry grease puddle tint
  const grease = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 32),
    new THREE.MeshStandardMaterial({ color: 0x3a2a10, transparent: true, opacity: 0.22, roughness: 0.6 })
  );
  grease.rotation.x = -Math.PI / 2;
  grease.position.set(0.1, 0.004, 0.1);
  g.add(grease);

  // lamp post
  const lampG = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.6, 10), std({ color: 0x1a1d22, metalness: 0.6, roughness: 0.5 }));
  pole.position.set(3.2, 1.8, -1.2);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.07, 0.07), pole.material);
  arm.position.set(2.85, 3.55, -1.2);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffc27a, toneMapped: false }));
  bulb.position.set(2.55, 3.45, -1.2);
  const halo = glowSprite(0xffa850, 3.2, 0.8);
  halo.position.copy(bulb.position);
  const lampL = new THREE.PointLight(0xffa850, 12, 14);
  lampL.position.set(2.5, 3.2, -1.1);
  lampG.add(pole, arm, bulb, halo, lampL);
  g.add(lampG);

  // dawn sun
  const sun = glowSprite(0xffc88a, 60, 0.9);
  sun.position.set(40, 5, -10);
  g.add(sun);

  // rain
  const N = 2600;
  const rp = new Float32Array(N * 6);
  const rv = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = (r() - 0.5) * 26, y = r() * 10, z = -5 + r() * 14;
    rp.set([x, y, z, x - 0.02, y + 0.42, z], i * 6);
    rv[i] = 11 + r() * 5;
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute("position", new THREE.BufferAttribute(rp, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: 0xb8d4ff, transparent: true, opacity: 0.3, depthWrite: false });
  const rain = new THREE.LineSegments(rg, rainMat);
  rain.frustumCulled = false;
  g.add(rain);

  // phone
  const phoneG = new THREE.Group();
  const phoneTex = canvasTexture(256, 512, () => {});
  const pc = phoneTex.image as HTMLCanvasElement;
  const pctx = pc.getContext("2d")!;
  let lastTxt = "";
  const drawPhone = (txt: string, pulse: number) => {
    pctx.fillStyle = "#0a0e18";
    pctx.fillRect(0, 0, 256, 512);
    const gr = pctx.createRadialGradient(128, 190, 10, 128, 190, 260);
    gr.addColorStop(0, `rgba(80,160,255,${0.5 + pulse * 0.4})`);
    gr.addColorStop(1, "rgba(10,14,24,0)");
    pctx.fillStyle = gr;
    pctx.fillRect(0, 0, 256, 512);
    pctx.fillStyle = "#e8f1ff";
    pctx.textAlign = "center";
    pctx.font = "bold 74px sans-serif";
    pctx.fillText(txt.split(" ")[0], 128, 210);
    pctx.font = "24px sans-serif";
    pctx.fillStyle = "#9fb8d8";
    pctx.fillText(txt.includes(":") ? txt.split(" ")[1] : "incoming call…", 128, 255);
    pctx.fillStyle = "#33d17a";
    pctx.beginPath();
    pctx.arc(196, 430, 32, 0, 7);
    pctx.fill();
    pctx.fillStyle = "#ff453a";
    pctx.beginPath();
    pctx.arc(60, 430, 32, 0, 7);
    pctx.fill();
    pctx.fillStyle = "#ffb4b0";
    pctx.font = "20px sans-serif";
    pctx.fillText("47 missed", 128, 330);
    phoneTex.needsUpdate = true;
  };
  const phoneBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.82), std({ color: 0x121317, roughness: 0.3, metalness: 0.8 }));
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.76), new THREE.MeshBasicMaterial({ map: phoneTex, toneMapped: false }));
  phoneScreen.rotation.x = -Math.PI / 2;
  phoneScreen.rotation.z = Math.PI;
  phoneScreen.position.y = 0.0165;
  const phoneLight = new THREE.PointLight(0x7ab8ff, 0, 4);
  phoneLight.position.y = 0.35;
  phoneG.add(phoneBody, phoneScreen, phoneLight);
  phoneG.position.set(1.42, 0.016, 0.6);
  phoneG.rotation.y = 0.5;
  phoneG.castShadow = true;
  g.add(phoneG);

  // car
  const car = new THREE.Group();
  const carBody = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.15, 1.9), std({ color: 0x0c0d11, roughness: 0.25, metalness: 0.8 }));
  carBody.position.set(2.4, 0.78, 0);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.7, 1.7), std({ color: 0x08090c, roughness: 0.1, metalness: 0.9 }));
  cabin.position.set(3.2, 1.6, 0);
  car.add(carBody, cabin);
  const beamL: THREE.SpotLight[] = [];
  for (const z of [-0.65, 0.65]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    hl.scale.set(0.5, 1, 1.5);
    hl.position.set(0.1, 0.75, z);
    const fl = glowSprite(0xe6f0ff, 2.6, 0.8);
    fl.position.set(-0.05, 0.75, z);
    const sp = new THREE.SpotLight(0xf2f6ff, 0, 60, 0.45, 0.6, 1.6);
    sp.position.set(0.1, 0.8, z);
    sp.target.position.set(-20, 0.2, z * 0.3);
    car.add(hl, fl, sp, sp.target);
    beamL.push(sp);
  }
  car.visible = false;
  g.add(car);

  return {
    group: g,
    update(c) {
      const o = c.opts;
      const rainAmt = o.rain ?? 0;
      rain.visible = rainAmt > 0.01;
      rainMat.opacity = 0.32 * rainAmt;
      if (rain.visible) {
        const pa = rg.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < N; i++) {
          const d = rv[i] * c.dt;
          for (let k = 0; k < 2; k++) {
            const idx = (i * 2 + k) * 3 + 1;
            (pa.array as Float32Array)[idx] -= d;
          }
          if ((pa.array as Float32Array)[i * 6 + 1] < 0) {
            for (let k = 0; k < 2; k++) (pa.array as Float32Array)[(i * 2 + k) * 3 + 1] += 10;
          }
        }
        pa.needsUpdate = true;
      }
      const dawn = c.mood === "alleyDawn";
      sun.visible = dawn;
      const lampOn = dawn ? 0.15 : 1;
      lampL.intensity = 12 * lampOn;
      (bulb.material as THREE.MeshBasicMaterial).color.set(dawn ? 0x806040 : 0xffc27a);
      halo.visible = !dawn;
      const talkM = c.talk.MANAGEMENT;
      dump.set(o.eyes ?? 0, talkM, c.t);
      neonL.intensity = 9 * (0.92 + 0.08 * Math.sin(c.t * 31) * Math.sin(c.t * 7));
      // phone
      phoneG.visible = !!o.phone;
      if (o.phone) {
        if (o.phone !== lastTxt) {
          lastTxt = o.phone;
          drawPhone(o.phone, 0);
        }
        const ringing = !o.phone.includes(":");
        const on = ringing && Math.sin(c.t * 5.2) > 0.1;
        phoneG.position.x = 1.42 + (on ? Math.sin(c.t * 90) * 0.006 : 0);
        phoneG.position.z = 0.6 + (on ? Math.cos(c.t * 83) * 0.006 : 0);
        phoneG.rotation.y = 0.5 + (on ? Math.sin(c.t * 70) * 0.02 : 0);
        phoneLight.intensity = ringing ? (on ? 5 : 2.2) : 2 + c.talk.MOM * 2;
      }
      // car
      const cp = o.car;
      car.visible = !!cp;
      if (cp) {
        const p = cp[0];
        car.position.set(THREE.MathUtils.lerp(80, 0.9, Math.pow(p, 1.0)), 0, 0.15);
        for (const s of beamL) s.intensity = 260 * Math.min(1, p * 6);
      } else for (const s of beamL) s.intensity = 0;
    },
  };
}

/* ------------------------------------------------------------------ VOID */
function buildVoid(): Env {
  const g = new THREE.Group();
  const r = rnd(5);
  // sky dome
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(120, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uTime: furTime },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: `varying vec3 vP; uniform float uTime;
        void main(){ float h = vP.y*0.5+0.5;
          vec3 hor = vec3(1.0,0.93,0.82); vec3 top = vec3(1.0,0.78,0.88); vec3 bot = vec3(1.0,0.86,0.6);
          vec3 c = mix(bot, hor, smoothstep(0.0,0.5,h)); c = mix(c, top, smoothstep(0.5,1.0,h));
          c += 0.04*sin(vP.x*14.0+uTime*0.5)*sin(vP.z*12.0-uTime*0.4);
          gl_FragColor = vec4(c*0.9,1.0); }`,
    })
  );
  g.add(sky);
  const floorTex = canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = "#f3d78d";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      const x = r() * w, y = r() * h, rad = 20 + r() * 90;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const c = r() > 0.55 ? "255,246,200" : r() > 0.5 ? "214,150,60" : "190,70,40";
      gr.addColorStop(0, `rgba(${c},${0.35 + r() * 0.3})`);
      gr.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    ctx.strokeStyle = "rgba(120,60,20,0.25)";
    ctx.lineWidth = 3;
    for (let i = 1; i < 9; i++) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, i * 60, 0, 7);
      ctx.stroke();
    }
  });
  floorTex.repeat.set(5, 5);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(90, 64),
    new THREE.MeshPhysicalMaterial({ map: floorTex, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);
  // giant bulb
  const bulbG = new THREE.Group();
  bulbG.position.set(-5, 5.5, -9);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(2.2, 40, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  bulb.scale.y = 1.12;
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(2.45, 40, 32),
    new THREE.MeshPhysicalMaterial({ color: 0xfff6e0, transparent: true, opacity: 0.25, roughness: 0, clearcoat: 1 })
  );
  glass.scale.y = 1.12;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 24), std({ color: 0xa8a8a8, metalness: 0.9, roughness: 0.3 }));
  base.position.y = 2.9;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 80, 8), std({ color: 0x111111 }));
  cord.position.y = 43;
  const halo = glowSprite(0xfff0c8, 20, 0.6);
  bulbG.add(bulb, glass, base, cord, halo);
  g.add(bulbG);
  const bulbLight = new THREE.PointLight(0xfff0d0, 50, 60);
  bulbLight.position.copy(bulbG.position);
  g.add(bulbLight);
  // pepperoni planets
  const pep = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#b53a2a";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? "230,110,60" : "110,25,15"},${0.25 + r() * 0.4})`;
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 3 + r() * 14, 0, 7);
      ctx.fill();
    }
  });
  const pepMat = new THREE.MeshPhysicalMaterial({ map: pep, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.25 });
  const peps: { m: THREE.Mesh; s: number; y0: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const rad = 0.8 + r() * 2.2;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, rad * 0.14, 36), pepMat);
    const a = r() * Math.PI * 2;
    const d = 8 + r() * 28;
    m.position.set(Math.cos(a) * d * 0.9, 2 + r() * 14, -Math.abs(Math.sin(a)) * d - 4);
    m.rotation.set(r() * 3, r() * 3, 0);
    g.add(m);
    peps.push({ m, s: 0.1 + r() * 0.3, y0: m.position.y });
  }
  // cheese domes
  const holes = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#f6cf54";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = "rgba(190,130,20,0.8)";
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 6 + r() * 20, 0, 7);
      ctx.fill();
    }
  });
  for (let i = 0; i < 7; i++) {
    const rad = 7 + r() * 9;
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(rad, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: holes, roughness: 0.4 })
    );
    m.position.set(-45 + i * 15 + r() * 5, 0, -38 - r() * 12);
    g.add(m);
  }
  // dust motes
  const dn = 400;
  const dp = new Float32Array(dn * 3);
  for (let i = 0; i < dn; i++) dp.set([(r() - 0.5) * 24, r() * 10, -6 + r() * 14], i * 3);
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.05, color: 0xfff4d8, transparent: true, opacity: 0.7, depthWrite: false }));
  g.add(dust);

  return {
    group: g,
    update(c) {
      peps.forEach((p, i) => {
        p.m.rotation.x += c.dt * p.s;
        p.m.rotation.y += c.dt * p.s * 0.7;
        p.m.position.y = p.y0 + Math.sin(c.t * 0.3 + i) * 0.5;
      });
      bulbLight.intensity = 50 * (1 + Math.sin(c.t * 1.3) * 0.04);
      dust.rotation.y = c.t * 0.01;
      const pa = dg.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < dn; i++) {
        const y = pa.getY(i) + c.dt * 0.12;
        pa.setY(i, y > 10 ? 0 : y);
      }
      pa.needsUpdate = true;
    },
  };
}

/* ------------------------------------------------------------------ OFFICE */
function drawPossum(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dead: boolean, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.fillStyle = "#b9b4a6";
  ctx.beginPath();
  ctx.ellipse(0, 0, 38, 22, 0, 0, 7);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(30, -8);
  ctx.lineTo(70, 6);
  ctx.lineTo(30, 14);
  ctx.fill();
  ctx.fillStyle = "#e0a79d";
  ctx.beginPath();
  ctx.arc(70, 6, 4, 0, 7);
  ctx.fill();
  ctx.strokeStyle = "#d9a8a0";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-36, 0);
  ctx.quadraticCurveTo(-70, -20, -90, 10);
  ctx.stroke();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  if (dead) {
    ctx.beginPath();
    ctx.moveTo(38, -4);
    ctx.lineTo(48, 6);
    ctx.moveTo(48, -4);
    ctx.lineTo(38, 6);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(44, 0, 3, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

function drawSlide(ctx: CanvasRenderingContext2D, w: number, h: number, idx: number, tt: number) {
  const bgs = ["#1c2230", "#f4c6d4", "#2b2433", "#f2b1c9", "#10131a", "#2a1f1a"];
  ctx.fillStyle = bgs[idx];
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = "center";
  ctx.font = "bold 44px monospace";
  if (idx === 0) {
    ctx.fillStyle = "#9fe3ff";
    ctx.fillText("FILE #4112", w / 2, 220);
    ctx.font = "30px monospace";
    ctx.fillText("SUBJECT: GERALD (OPOSSUM)", w / 2, 280);
    ctx.fillText("STATUS: DEAD ×4,112 · ALIVE ×0", w / 2, 330);
  } else if (idx === 1) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(w / 2 - 160, 330, 320, 120);
    ctx.fillStyle = "#e0709c";
    ctx.fillRect(w / 2 - 160, 330, 320, 36);
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = "#ffd84d";
      ctx.fillRect(w / 2 + i * 60 - 4, 270, 8, 56);
      ctx.beginPath();
      ctx.arc(w / 2 + i * 60, 262, 10, 0, 7);
      ctx.fillStyle = "#ff8a2a";
      ctx.fill();
    }
    drawPossum(ctx, 190, 440, 1.2, true);
    ctx.fillStyle = "#6a2a4a";
    ctx.font = "bold 34px monospace";
    ctx.fillText("BIRTHDAY · FAINTED PRE-CAKE", w / 2, 90);
  } else if (idx === 2) {
    ctx.fillStyle = "#3b3048";
    for (let row = 0; row < 4; row++) for (let i = 0; i < 9; i++) ctx.fillRect(110 + i * 90, 300 + row * 50, 64, 34);
    ctx.fillStyle = "#e8d9b0";
    ctx.fillRect(w / 2 - 80, 160, 160, 90);
    ctx.fillStyle = "#222";
    for (let i = 0; i < 10; i++) ctx.fillRect(w / 2 - 74 + i * 15, 160, 8, 56);
    drawPossum(ctx, 430, 392, 0.8, true);
    ctx.fillStyle = "#ffe";
    ctx.font = "bold 34px monospace";
    ctx.fillText("RECITAL · ROW 3 · HORIZONTAL", w / 2, 90);
  } else if (idx === 3) {
    ctx.fillStyle = "#d1306a";
    ctx.beginPath();
    ctx.moveTo(w / 2, 400);
    ctx.bezierCurveTo(w / 2 - 220, 260, w / 2 - 80, 120, w / 2, 220);
    ctx.bezierCurveTo(w / 2 + 80, 120, w / 2 + 220, 260, w / 2, 400);
    ctx.fill();
    drawPossum(ctx, 250, 480, 0.9, false, -0.1);
    ctx.fillStyle = "#e9e4ee";
    ctx.beginPath();
    ctx.ellipse(680, 470, 40, 24, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(540, 360, 92, 60);
    ctx.fillStyle = "#222";
    ctx.font = "bold 36px monospace";
    ctx.fillText("hi", 586, 402);
    drawPossum(ctx, 380, 480, 0.9, true, 0.2);
    ctx.fillStyle = "#4a1030";
    ctx.fillText("MARGUERITE · FAINTED AT 'HI'", w / 2, 90);
  } else if (idx === 4) {
    for (let i = 0; i < 2000; i++) {
      const v = Math.random() * 255;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 4, 4);
    }
    ctx.fillStyle = "#ff4d4d";
    ctx.font = "bold 70px monospace";
    ctx.fillText(`FAINTED: ${(4000 + Math.floor(tt * 7)) % 4113}`, w / 2, h / 2);
  } else {
    ctx.fillStyle = "#6d4a2e";
    ctx.fillRect(160, 360, 700, 24);
    ctx.fillRect(220, 384, 18, 130);
    ctx.fillRect(780, 384, 18, 130);
    for (const x of [330, 690]) {
      ctx.fillStyle = "#efe9dc";
      ctx.beginPath();
      ctx.ellipse(x, 350, 80, 18, 0, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = "#c0702c";
    ctx.fillRect(470, 310, 90, 50);
    ctx.fillStyle = "#8a4d1d";
    ctx.fillRect(470, 310, 90, 10);
    ctx.fillStyle = "#cfc7b6";
    ctx.fillRect(710, 250, 20, 94);
    ctx.fillStyle = "#3a2c22";
    ctx.fillRect(670, 190, 100, 70);
    ctx.fillStyle = "#ffeecb";
    ctx.font = "bold 30px monospace";
    ctx.fillText("SUNDAY 6:00 PM · 2 PLATES · 1 GUEST", w / 2, 90);
    ctx.font = "22px monospace";
    ctx.fillText("(he did not come)", w / 2, 130);
  }
  // scanlines + vignette
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
  const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.9);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

function buildOffice(): Env {
  const g = new THREE.Group();
  const r = rnd(8);
  const carpet = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#8a8466";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 ? "#7b7557" : "#948d6c";
        ctx.fillRect(x * 64, y * 64, 64, 64);
        ctx.strokeStyle = "rgba(60,50,30,0.3)";
        ctx.strokeRect(x * 64 + 8, y * 64 + 8, 48, 48);
      }
    for (let i = 0; i < 18000; i++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? "255,250,220" : "30,25,10"},${r() * 0.12})`;
      ctx.fillRect(r() * w, r() * h, 1, 2);
    }
  });
  carpet.repeat.set(8, 8);
  const floorMat = new THREE.MeshStandardMaterial({ map: carpet, bumpMap: carpet, bumpScale: 2, roughness: 0.95 });
  floorMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = furTime;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.z += sin(uTime*1.1 + position.x*0.5 + position.y*0.45)*0.07 + sin(uTime*0.7 - position.y*0.9)*0.03;"
      );
  };
  floorMat.customProgramCacheKey = () => "carpet-v1";
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40, 120, 120), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);

  const wallTex = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#d6c9a6";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#b9ab87";
    ctx.fillRect(0, h * 0.55, w, h * 0.45);
    ctx.fillStyle = "#a69774";
    ctx.fillRect(0, h * 0.55 - 6, w, 8);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = `rgba(0,0,0,${r() * 0.05})`;
      ctx.fillRect(r() * w, r() * h, 2, 2);
    }
    for (let x = 0; x < w; x += 128) {
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(x, h * 0.55, 3, h * 0.45);
    }
  });
  wallTex.repeat.set(6, 1);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 7), wallMat);
  back.position.set(0, 3.5, -5);
  back.receiveShadow = true;
  g.add(back);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(30, 7), wallMat);
    side.rotation.y = -s * Math.PI / 2;
    side.position.set(s * 12, 3.5, 3);
    g.add(side);
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), std({ color: 0xc8c0a8, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 6.5;
  g.add(ceil);
  // fluorescent fixtures
  const fixMat = new THREE.MeshBasicMaterial({ color: 0xf4fff0, toneMapped: false });
  const fixtures: THREE.Mesh[] = [];
  for (let x = -6; x <= 6; x += 4)
    for (let z = -4; z <= 6; z += 4) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.5), fixMat);
      f.position.set(x, 6.45, z);
      g.add(f);
      fixtures.push(f);
    }

  // reception desk
  const wood = std({ color: 0x6a4a30, roughness: 0.55 });
  const desk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 0.8), wood);
  desk.position.set(1.7, 0.35, -1.2);
  desk.castShadow = desk.receiveShadow = true;
  g.add(desk);
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.06, 0.9), std({ color: 0x3d2a1b, roughness: 0.3 }));
  deskTop.position.set(1.7, 0.72, -1.2);
  g.add(deskTop);
  const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.06), std({ color: 0x1a1a1a }));
  monitor.position.set(2.4, 1.05, -1.3);
  g.add(monitor);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.42), new THREE.MeshBasicMaterial({ color: 0x4af0a0, toneMapped: false }));
  scr.position.set(2.4, 1.05, -1.265);
  g.add(scr);
  const winSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.3),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(256, 64, (ctx, w, h) => {
        ctx.fillStyle = "#1c2a3a";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 26px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("WINDOW 1 OF 1", w / 2, 42);
      }),
    })
  );
  winSign.position.set(1.0, 0.45, -0.795);
  g.add(winSign);

  // NOW SERVING sign
  const nsTex = canvasTexture(512, 200, () => {});
  const nsc = nsTex.image as HTMLCanvasElement;
  const nsx = nsc.getContext("2d")!;
  let lastNs = -1;
  const drawNs = (n: number) => {
    nsx.fillStyle = "#120808";
    nsx.fillRect(0, 0, 512, 200);
    nsx.fillStyle = "#ff6a4a";
    nsx.textAlign = "center";
    nsx.font = "bold 36px monospace";
    nsx.fillText("NOW SERVING", 256, 56);
    nsx.font = "bold 110px monospace";
    nsx.fillStyle = "#ff3b2a";
    nsx.fillText(String(n), 256, 160);
    nsTex.needsUpdate = true;
  };
  const ns = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.78), new THREE.MeshBasicMaterial({ map: nsTex, toneMapped: false }));
  ns.position.set(-1.8, 2.5, -3.0);
  g.add(ns);
  for (const dx of [-0.8, 0.8]) {
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 4, 4), std({ color: 0x222222 }));
    wire.position.set(-1.8 + dx, 4.5, -3.0);
    g.add(wire);
  }

  // melting clocks
  const clockTex = canvasTexture(512, 640, (ctx, w) => {
    ctx.clearRect(0, 0, w, 640);
    ctx.fillStyle = "#e9e3cf";
    ctx.strokeStyle = "#4a3b22";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(256, 220, 190, 0, Math.PI * 2);
    ctx.fill();
    // drips
    for (let i = 0; i < 7; i++) {
      const x = 100 + i * 52;
      const len = 80 + r() * 260;
      ctx.beginPath();
      ctx.moveTo(x - 24, 330);
      ctx.quadraticCurveTo(x, 330 + len, x + 24, 330);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, 330 + len * 0.55, 20, 0, 7);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(256, 220, 190, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#3a2c16";
    ctx.font = "bold 40px serif";
    ctx.textAlign = "center";
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(String(i), 256 + Math.cos(a) * 150, 235 + Math.sin(a) * 150);
    }
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(256, 220);
    ctx.lineTo(256 + 40, 220 + 100);
    ctx.moveTo(256, 220);
    ctx.lineTo(256 - 110, 220 - 60);
    ctx.stroke();
  });
  const clockMat = new THREE.MeshBasicMaterial({ map: clockTex, transparent: true, side: THREE.DoubleSide });
  clockMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = furTime;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.y += sin(uTime*1.3 + position.x*5.0)*0.06*(1.0-uv.y);\ntransformed.x += sin(uTime*0.9 + position.y*4.0)*0.03;");
  };
  clockMat.customProgramCacheKey = () => "clock-v1";
  const clocks: THREE.Mesh[] = [];
  for (const [x, y, s] of [[-4.2, 3.3, 2.0], [3.6, 3.8, 2.5], [-0.6, 4.6, 1.6], [6.6, 2.4, 1.6]] as [number, number, number][]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.8, s, 24, 24), clockMat);
    m.position.set(x, y, -4.9);
    g.add(m);
    clocks.push(m);
  }
  // chairs
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.7), std({ color: 0x3f6a7a, roughness: 0.6 }));
    seat.position.y = 0.45;
    const bk = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.08), seat.material);
    bk.position.set(0, 0.8, -0.32);
    c.add(seat, bk);
    for (const [lx, lz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 6), std({ color: 0x777777, metalness: 0.8 }));
      l.position.set(lx, 0.22, lz);
      c.add(l);
    }
    c.position.set(-5.2 + i * 0.85, 0, -3.8);
    g.add(c);
  }

  // projector screen
  const scrCanvas = document.createElement("canvas");
  scrCanvas.width = 1024;
  scrCanvas.height = 576;
  const scx = scrCanvas.getContext("2d")!;
  const scrTex = new THREE.CanvasTexture(scrCanvas);
  scrTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.6), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }));
  screen.position.set(0, 1.6, -3.4);
  g.add(screen);
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.8), std({ color: 0x050505 }));
  frame.position.set(0, 1.6, -3.42);
  g.add(frame);
  const screenLight = new THREE.PointLight(0x9fe3ff, 0, 12);
  screenLight.position.set(0, 1.6, -2.6);
  g.add(screenLight);
  let slide = -1;
  const slideCols = [0x9fe3ff, 0xffb0cc, 0x9a80ff, 0xff7aa8, 0xffffff, 0xffb070];

  // contract
  const conTex = canvasTexture(1024, 1536, (ctx, w, h) => {
    ctx.fillStyle = "#f6f0dc";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#1a1a1a";
    ctx.textAlign = "center";
    ctx.font = "bold 58px serif";
    ctx.fillText("TERMS & CONDITIONS", w / 2, 110);
    ctx.font = "bold 36px serif";
    ctx.fillText("OF BEING ALIVE", w / 2, 160);
    ctx.textAlign = "left";
    const words = "the party of the first part hereby waives pain taxes mornings and any reasonable expectation that Marguerite will text back; liability is limited to everything; whereas feelings shall be felt and all refunds denied; clause 14(b) applies".split(" ");
    ctx.font = "20px serif";
    for (let y = 220; y < 1300; y += 28) {
      let line = "";
      while (line.length < 78) line += words[Math.floor(r() * words.length)] + " ";
      ctx.fillStyle = y > 540 && y < 570 ? "#b00" : "#222";
      ctx.fillText(line, 70, y);
    }
    ctx.fillStyle = "#222";
    ctx.font = "bold 44px serif";
    ctx.fillText("SIGN HERE:", 70, 1390);
    ctx.fillRect(360, 1396, 560, 4);
    ctx.font = "italic 24px serif";
    ctx.fillText("(paw prints accepted · ketchup acceptable)", 70, 1450);
  });
  const conMat = new THREE.MeshStandardMaterial({ map: conTex, roughness: 0.8, emissive: 0xffeeb0, emissiveIntensity: 0.18, side: THREE.DoubleSide });
  conMat.emissiveMap = conTex;
  const contract = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.4, 20, 40), conMat);
  contract.position.set(0, 2.8, -2.8);
  conMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = furTime;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.z += sin(uTime*1.6 + position.y*2.4)*0.1 + sin(uTime*0.8 + position.x*3.0)*0.05;");
  };
  conMat.customProgramCacheKey = () => "contract-v1";
  g.add(contract);
  const conCtx = (conTex.image as HTMLCanvasElement).getContext("2d")!;
  let stamped = false;
  // ants crawling
  const an = 320;
  const ap = new Float32Array(an * 3);
  const asp = new Float32Array(an);
  const arow = new Float32Array(an);
  for (let i = 0; i < an; i++) {
    arow[i] = 220 + Math.floor(r() * 38) * 28;
    ap.set([(r() - 0.5) * 3.3, 0, 0], i * 3);
    asp[i] = (r() > 0.5 ? 1 : -1) * (0.15 + r() * 0.5);
  }
  const ag = new THREE.BufferGeometry();
  ag.setAttribute("position", new THREE.BufferAttribute(ap, 3));
  const ants = new THREE.Points(ag, new THREE.PointsMaterial({ size: 0.045, color: 0x120a05, sizeAttenuation: true }));
  ants.frustumCulled = false;
  g.add(ants);

  // desk lamp (scene 8)
  const lampG = new THREE.Group();
  const tbl = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.9), wood);
  tbl.position.set(-1.35, 0.7, -0.7);
  const tleg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), wood);
  tleg.position.set(-1.35, 0.35, -0.7);
  const lpole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8), std({ color: 0x222222, metalness: 0.8, roughness: 0.3 }));
  lpole.position.set(-1.35, 1.0, -0.7);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.3, 20, 1, true), std({ color: 0x2f5a3a, side: THREE.DoubleSide, roughness: 0.6 }));
  shade.position.set(-1.35, 1.33, -0.7);
  const lbulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false }));
  lbulb.position.set(-1.35, 1.25, -0.7);
  const lhalo = glowSprite(0xffb870, 1.9, 0.9);
  lhalo.position.copy(lbulb.position);
  const lampLight = new THREE.PointLight(0xffb36b, 16, 9);
  lampLight.position.set(-1.35, 1.2, -0.5);
  lampG.add(tbl, tleg, lpole, shade, lbulb, lhalo, lampLight);
  g.add(lampG);

  return {
    group: g,
    update(c) {
      const o = c.opts;
      const dim = c.mood === "office" ? 1 : c.mood === "officeDim" ? 0.05 : 0.04;
      fixMat.color.setScalar(dim * (0.95 + 0.05 * Math.sin(c.t * 60) * Math.sin(c.t * 3.3)));
      fixtures.forEach((f) => (f.visible = true));
      for (const m of clocks) m.visible = true;
      // sign
      const n = c.st > 27.5 && c.mood === "office" ? 4112 : 4107 + Math.floor(c.t / 3) % 5;
      if (n !== lastNs) {
        lastNs = n;
        drawNs(n);
      }
      // projector
      screen.visible = frame.visible = o.screen === "memories";
      ns.visible = !screen.visible;
      screenLight.intensity = 0;
      if (screen.visible) {
        const s = c.st;
        const idx = s < 2.9 ? 0 : s < 6.2 ? 1 : s < 9.4 ? 2 : s < 12.8 ? 3 : s < 16.4 ? 4 : 5;
        if (idx === 4 || idx !== slide) {
          slide = idx;
          drawSlide(scx, 1024, 576, idx, c.t);
          scrTex.needsUpdate = true;
        }
        screenLight.color.setHex(slideCols[idx]);
        screenLight.intensity = 14 * (0.9 + Math.random() * 0.2);
      }
      // contract
      const ci = o.contract ?? 0;
      contract.visible = ci > 0;
      ants.visible = ci > 0;
      if (ci > 0) {
        const un = Math.min(1, c.st / 2.4);
        const e = 1 - Math.pow(1 - un, 3);
        contract.scale.y = 0.15 + 0.85 * e;
        contract.position.y = 6.3 - 3.5 * e;
        const pa = ag.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < an; i++) {
          let x = pa.getX(i) + asp[i] * c.dt;
          if (x > 1.7) x = -1.7;
          if (x < -1.7) x = 1.7;
          const yy = (contract.position.y + 2.7 * contract.scale.y) - ((arow[i] - 160) / 1536) * 5.4 * contract.scale.y;
          pa.setXYZ(i, x, yy + Math.sin(c.t * 12 + i) * 0.006, contract.position.z + 0.06 + Math.sin(c.t * 1.6 + yy * 2.4) * 0.1);
        }
        pa.needsUpdate = true;
        if (!stamped && c.st > 29.1) {
          stamped = true;
          conCtx.fillStyle = "#c4140e";
          conCtx.beginPath();
          conCtx.ellipse(640, 1360, 46, 40, 0, 0, 7);
          conCtx.fill();
          for (const [dx, dy] of [[-52, -52], [-18, -74], [22, -74], [56, -52]]) {
            conCtx.beginPath();
            conCtx.ellipse(640 + dx, 1360 + dy, 14, 18, 0, 0, 7);
            conCtx.fill();
          }
          conTex.needsUpdate = true;
        }
        if (c.st < 2) {
          stamped = false;
        }
      }
      lampG.visible = !!o.lamp;
      const flick = o.mothLamp ? 0.85 + 0.15 * Math.sin(c.t * 40) : 1;
      lampLight.intensity = (o.lamp ? 16 : 0) * flick;
    },
  };
}

/* ------------------------------------------------------------------ COURT */
function buildCourt(): Env {
  const g = new THREE.Group();
  const r = rnd(21);
  // stars = bottle caps
  const n = 1800;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const palette = [0xffd84d, 0xff4d8d, 0x7dffc4, 0x6aa0ff, 0xffffff, 0xff9a5c].map((c) => new THREE.Color(c));
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const el = (r() - 0.2) * 1.4;
    const d = 40 + r() * 60;
    pos.set([Math.cos(a) * d, Math.max(0.5, Math.sin(el) * d * 0.7 + 8), Math.sin(a) * d - 10], i * 3);
    const c = palette[Math.floor(r() * palette.length)];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  sg.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const dot = canvasTexture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 14, 0, 7);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(w / 2 + Math.cos(a) * 14, h / 2 + Math.sin(a) * 14);
      ctx.lineTo(w / 2 + Math.cos(a) * 24, h / 2 + Math.sin(a) * 24);
      ctx.stroke();
    }
  });
  const stars = new THREE.Points(
    sg,
    new THREE.PointsMaterial({ size: 1.6, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
  );
  g.add(stars);
  // floor with glowing rings
  const ringTex = canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = "#07040d";
    ctx.fillRect(0, 0, w, h);
    for (let i = 1; i < 12; i++) {
      ctx.strokeStyle = `rgba(125,255,154,${0.6 / i + 0.05})`;
      ctx.lineWidth = 3 + (i % 3) * 2;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, i * 42, 0, 7);
      ctx.stroke();
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ctx.strokeStyle = "rgba(255,77,141,0.18)";
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.lineTo(w / 2 + Math.cos(a) * 520, h / 2 + Math.sin(a) * 520);
      ctx.stroke();
    }
  });
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(40, 64),
    new THREE.MeshPhysicalMaterial({ map: ringTex, emissiveMap: ringTex, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.2, clearcoat: 1, metalness: 0.4 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);

  const dump = makeDumpster();
  dump.group.scale.setScalar(4.2);
  dump.group.position.set(0, 0, -13);
  g.add(dump.group);
  const hl = new THREE.SpotLight(0x7dffa0, 90, 60, 0.7, 0.8, 1.2);
  hl.position.set(0, 9, -6);
  hl.target.position.set(0, 0, -13);
  g.add(hl, hl.target);

  // flying shopping carts
  const carts: THREE.Group[] = [];
  const wire = std({ color: 0xdfe6ee, metalness: 0.9, roughness: 0.3 });
  const feather = new THREE.MeshStandardMaterial({ color: 0xfffdf0, roughness: 0.8, emissive: 0xffffff, emissiveIntensity: 0.3, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Group();
    const basket = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.0, 0.6, 0.6, 4, 2, 2)),
      new THREE.LineBasicMaterial({ color: 0xdfe6ee })
    );
    c.add(basket);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), wire);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(-0.5, 0.35, 0);
    c.add(handle);
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16), feather);
      w.scale.set(1, 0.35, 1);
      w.position.set(0, 0.2, s * 0.9);
      w.rotation.set(Math.PI / 2 * s * -1 + s * 0.3, 0, 0);
      w.name = "wing";
      c.add(w);
    }
    const a = (i / 6) * Math.PI - Math.PI * 0.05;
    c.position.set(Math.cos(a) * 11 - 0, 5 + (i % 3) * 1.8, -8 - Math.sin(a) * 6);
    c.rotation.y = r() * 3;
    g.add(c);
    carts.push(c);
  }
  // big bottle caps drifting
  const capMat = new THREE.MeshStandardMaterial({ color: 0xd9a62c, metalness: 0.9, roughness: 0.3 });
  const caps: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.55, 0.12, 24), capMat);
    m.position.set((r() - 0.5) * 24, 1.5 + r() * 7, -4 - r() * 14);
    m.rotation.set(r() * 3, 0, r() * 3);
    g.add(m);
    caps.push(m);
  }

  return {
    group: g,
    update(c) {
      dump.set(c.opts.eyes ?? 0, c.talk.MANAGEMENT, c.t);
      hl.intensity = 90 * (c.opts.eyes ?? 0.2);
      carts.forEach((cart, i) => {
        cart.position.y += Math.sin(c.t * 0.8 + i) * 0.004;
        cart.rotation.y += c.dt * 0.1;
        cart.children.forEach((ch) => {
          if (ch.name === "wing") ch.rotation.x += Math.sin(c.t * 4 + i) * 0.01 * Math.sign(ch.position.z);
        });
      });
      caps.forEach((m, i) => {
        m.rotation.x += c.dt * (0.2 + i * 0.03);
        m.rotation.z += c.dt * 0.15;
      });
      stars.rotation.y = c.t * 0.005;
    },
  };
}

/* ------------------------------------------------------------------ TUNNEL */
function buildTunnel(): Env {
  const g = new THREE.Group();
  const r = rnd(33);
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.4, 140, 48, 1, true),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      fog: false,
      uniforms: { uTime: furTime },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: `varying vec2 vUv; uniform float uTime;
        vec3 pal(float t){ return 0.5+0.5*cos(6.28318*(t+vec3(0.0,0.33,0.67))); }
        void main(){
          float a = vUv.x*6.28318; float z = vUv.y*140.0;
          float rings = smoothstep(0.82,1.0,sin(z*0.9 + uTime*14.0));
          float spokes = smoothstep(0.9,1.0,sin(a*12.0 + z*0.15 - uTime*1.5));
          float chk = step(0.5, fract(a*4.0/6.28318*3.0)) + step(0.5, fract(z*0.25 + uTime*3.0));
          chk = mod(chk,2.0);
          vec3 c = pal(z*0.02 + uTime*0.2 + a*0.1)*(0.25+0.55*chk);
          c += rings*pal(uTime*0.3+0.2)*0.8 + spokes*pal(uTime*0.5)*0.5;
          gl_FragColor = vec4(c,1.0); }`,
    })
  );
  tube.rotation.x = Math.PI / 2;
  g.add(tube);
  const labels = ["HI", "RENT", "MOM", "FAINTED", "SUNDAY", "TAXES", "MARGUERITE", "BRAD'S MIC", "BIRTHDAY", "CASSEROLE", "ow", "FEELINGS"];
  const frames: THREE.Mesh[] = [];
  labels.forEach((txt, i) => {
    const tex = canvasTexture(256, 160, (ctx, w, h) => {
      ctx.fillStyle = `hsl(${r() * 360},80%,${20 + r() * 20}%)`;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, w - 12, h - 12);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 40px monospace";
      ctx.textAlign = "center";
      ctx.fillText(txt, w / 2, h / 2 + 14);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.94), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide }));
    const a = (i / labels.length) * Math.PI * 2;
    m.userData = { a, z: -r() * 60, s: 8 + r() * 6 };
    m.position.set(Math.cos(a) * 2.5, Math.sin(a) * 2.5, m.userData.z);
    m.rotation.set(0, 0, a + Math.PI / 2);
    g.add(m);
    frames.push(m);
  });
  return {
    group: g,
    update(c) {
      for (const m of frames) {
        const u = m.userData as { a: number; z: number; s: number };
        u.z += u.s * c.dt;
        if (u.z > 8) u.z = -60;
        u.a += c.dt * 0.15;
        m.position.set(Math.cos(u.a) * 2.5, Math.sin(u.a) * 2.5, u.z);
        m.rotation.set(0.3, 0.5, u.a + Math.PI / 2);
      }
    },
  };
}

export function buildEnvs(): Record<EnvId, Env> {
  return { street: buildStreet(), void: buildVoid(), office: buildOffice(), court: buildCourt(), tunnel: buildTunnel() };
}
