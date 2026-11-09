import * as THREE from "three";
import { loft, canvasTexture, rnd } from "./loft";
import { furPart, furTime } from "./fur";

export type PoseId =
  | "stand"
  | "dead"
  | "sit"
  | "hiss"
  | "walk"
  | "sniff"
  | "slump"
  | "proud"
  | "float"
  | "cower";

export interface Pose {
  rootY: number;
  rx: number; // roll (lie on side)
  rz: number; // pitch about hips
  hx: number;
  hy: number;
  hz: number; // head
  jaw: number;
  tongue: number;
  flS: number; flK: number;
  frS: number; frK: number;
  hlS: number; hlK: number;
  hrS: number; hrK: number;
  tx: number; ty: number; tz: number;
  ears: number;
  tremble: number;
}

const base: Pose = {
  rootY: 0.33, rx: 0, rz: 0, hx: 0, hy: 0, hz: -0.1, jaw: 0, tongue: 0,
  flS: -0.2, flK: 0.55, frS: -0.2, frK: 0.55,
  hlS: 0.5, hlK: -0.8, hrS: 0.5, hrK: -0.8,
  tx: 0, ty: 0, tz: 0, ears: 0, tremble: 0,
};
const P = (o: Partial<Pose>): Pose => ({ ...base, ...o });

export const POSES: Record<PoseId, Pose> = {
  stand: P({}),
  walk: P({ hz: -0.05 }),
  sniff: P({ hz: -0.55, hy: 0.25, flS: 0.1, flK: 0.5 }),
  proud: P({ rz: 0.22, hz: 0.12, flS: -0.1, flK: 0.3, hlS: 0.4, hlK: -0.6, ears: 0.2 }),
  slump: P({ rootY: 0.28, hz: -0.6, hy: -0.15, flS: -0.3, flK: 0.8, hlS: 0.7, hlK: -1.1, hrS: 0.7, hrK: -1.1, ears: -0.4 }),
  cower: P({ rootY: 0.27, rz: -0.12, hz: -0.5, flS: 0.2, flK: 1.2, frS: 0.2, frK: 1.2, hlS: 0.9, hlK: -1.2, hrS: 0.9, hrK: -1.2, ears: -0.6, tremble: 1 }),
  hiss: P({ rootY: 0.31, rz: -0.08, hz: 0.05, jaw: -0.7, flS: 0.2, flK: 0.3, frS: -0.3, frK: 0.7, ears: 0.5, tremble: 0.5, hlS: 0.35, hlK: -0.55, hrS: 0.35, hrK: -0.55 }),
  sit: P({
    rootY: 0.31, rz: 1.12, hz: -0.55, hy: 0, jaw: 0,
    flS: -0.9, flK: 1.2, frS: -0.9, frK: 1.2,
    hlS: 1.4, hlK: -0.4, hrS: 1.4, hrK: -0.4,
    tx: 0, tz: -0.2, ears: 0.1,
  }),
  dead: P({
    rootY: 0.32, rx: -Math.PI / 2, rz: 0, hx: 1.35, hy: 0.1, hz: -0.05, jaw: -0.5, tongue: 1,
    flS: 1.35, flK: 0.5, frS: 1.1, frK: 0.7,
    hlS: 1.2, hlK: -0.2, hrS: 0.9, hrK: 0.3,
    tx: 0, ty: 0, tz: 0, ears: 0,
  }),
  float: P({
    rootY: 0.9, rx: -Math.PI / 2, rz: 0.3, hx: 1.2, hz: -0.1, jaw: -0.2, tongue: 0.3,
    flS: 0.8, flK: 0.8, frS: 0.7, frK: 0.9, hlS: 0.5, hlK: -0.6, hrS: 0.6, hrK: -0.5, ears: 0.3,
  }),
};

const KEYS = Object.keys(base) as (keyof Pose)[];

function skinMat(color: number, rough = 0.55) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: rough,
    sheen: 0.6,
    sheenColor: new THREE.Color(0xffc9c0),
    sheenRoughness: 0.5,
    clearcoat: 0.15,
  });
}

function scaleTexture() {
  const r = rnd(7);
  const tex = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#8d6259";
    ctx.fillRect(0, 0, w, h);
    const n = 8;
    const cw = w / n;
    for (let y = -1; y < n + 1; y++) {
      for (let x = -1; x < n + 1; x++) {
        const cx = x * cw + (y % 2 ? cw / 2 : 0);
        const cy = y * cw * 0.85;
        const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, cw * 0.62);
        const tone = 0.85 + r() * 0.15;
        g.addColorStop(0, `rgb(${232 * tone | 0},${186 * tone | 0},${176 * tone | 0})`);
        g.addColorStop(0.8, `rgb(${205 * tone | 0},${150 * tone | 0},${142 * tone | 0})`);
        g.addColorStop(1, "rgb(120,80,74)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(cx, cy, cw * 0.58, cw * 0.52, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  tex.repeat.set(4, 4);
  return tex;
}

function earTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    g.addColorStop(0, "#3a2a2a");
    g.addColorStop(0.55, "#1c1717");
    g.addColorStop(0.86, "#2a2121");
    g.addColorStop(0.96, "#c4a395");
    g.addColorStop(1, "#d9bfb2");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const r = rnd(3);
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(255,255,255,${r() * 0.05})`;
      ctx.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
  });
}

export class Opossum {
  root = new THREE.Group();
  anchors: Record<string, THREE.Object3D> = {};
  pose: Pose = { ...POSES.stand };
  target: Pose = { ...POSES.stand };
  talk = 0;
  walking = false;
  private phase = 0;
  private rollG = new THREE.Group();
  private pitchG = new THREE.Group();
  private bodyG = new THREE.Group();
  private torso!: THREE.Group;
  private headG = new THREE.Group();
  private jawG = new THREE.Group();
  private tongueG = new THREE.Group();
  private tailG = new THREE.Group();
  private earL = new THREE.Group();
  private earR = new THREE.Group();
  private nose!: THREE.Mesh;
  private whiskers: THREE.Group[] = [];
  private legs: Record<"fl" | "fr" | "hl" | "hr", { up: THREE.Group; lo: THREE.Group; paw: THREE.Group }> =
    {} as never;

  constructor() {
    const rump = new THREE.Vector3(-0.5, 0.1, 0);
    this.root.add(this.rollG);
    const inner = new THREE.Group();
    inner.position.y = -0.3;
    this.rollG.add(inner);
    this.pitchG.position.copy(rump);
    inner.add(this.pitchG);
    this.bodyG.position.copy(rump).multiplyScalar(-1);
    this.pitchG.add(this.bodyG);

    // ------------------------------------------------------------ torso
    this.torso = furPart(
      loft([
        { p: [-0.74, 0.25, 0], rx: 0.015, ry: 0.015 },
        { p: [-0.69, 0.26, 0], rx: 0.07, ry: 0.08 },
        { p: [-0.52, 0.3, 0], rx: 0.2, ry: 0.21 },
        { p: [-0.2, 0.34, 0], rx: 0.29, ry: 0.27 },
        { p: [0.12, 0.34, 0], rx: 0.3, ry: 0.27 },
        { p: [0.38, 0.33, 0], rx: 0.25, ry: 0.23 },
        { p: [0.58, 0.32, 0], rx: 0.16, ry: 0.16 },
        { p: [0.66, 0.32, 0], rx: 0.1, ry: 0.1 },
      ]),
      {
        len: 0.12, density: 420, layers: 34, under: 0x403b36, guard: 0xd6d0c0, tip: 0x38332e,
        guardAmt: 0.5, comb: [-0.5, -0.35, 0], wind: 0.006, seed: 1,
      }
    );
    this.bodyG.add(this.torso);

    // ------------------------------------------------------------ head
    this.headG.position.set(0.58, 0.33, 0);
    this.bodyG.add(this.headG);
    const skull = furPart(
      loft([
        { p: [-0.04, 0, 0], rx: 0.15, ry: 0.145 },
        { p: [0.1, 0, 0], rx: 0.145, ry: 0.14 },
        { p: [0.22, -0.025, 0], rx: 0.115, ry: 0.1 },
        { p: [0.36, -0.055, 0], rx: 0.072, ry: 0.065 },
        { p: [0.48, -0.08, 0], rx: 0.045, ry: 0.04 },
        { p: [0.575, -0.092, 0], rx: 0.026, ry: 0.025 },
        { p: [0.61, -0.095, 0], rx: 0.01, ry: 0.01 },
      ], { radial: 32, segs: 50 }),
      {
        len: 0.05, density: 1300, layers: 28, under: 0xb9b2a4, guard: 0xf6f1e4, tip: 0xcfc6b2,
        guardAmt: 0.55, comb: [0.4, -0.2, 0], wind: 0.002, seed: 4,
      }
    );
    this.headG.add(skull);

    // jaw
    this.jawG.position.set(0.08, -0.115, 0);
    this.headG.add(this.jawG);
    const jaw = furPart(
      loft([
        { p: [0, -0.02, 0], rx: 0.08, ry: 0.032 },
        { p: [0.12, -0.022, 0], rx: 0.06, ry: 0.028 },
        { p: [0.28, -0.026, 0], rx: 0.036, ry: 0.022 },
        { p: [0.42, -0.03, 0], rx: 0.016, ry: 0.016 },
        { p: [0.47, -0.032, 0], rx: 0.007, ry: 0.007 },
      ], { radial: 20, segs: 24 }),
      { len: 0.03, density: 1400, layers: 14, under: 0xcfc8b8, guard: 0xf6f1e4, guardAmt: 0.5, seed: 9 }
    );
    this.jawG.add(jaw);

    const pink = skinMat(0xd98f87, 0.4);
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0xb85c62, roughness: 0.35 });
    // palate
    const palate = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), mouthMat);
    palate.scale.set(0.27, 0.012, 0.045);
    palate.position.set(0.36, -0.118, 0);
    this.headG.add(palate);
    // inner mouth floor
    const floor = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), mouthMat);
    floor.scale.set(0.22, 0.01, 0.04);
    floor.position.set(0.22, 0.012, 0);
    this.jawG.add(floor);
    // teeth
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xf3eadb, roughness: 0.3 });
    const tooth = new THREE.ConeGeometry(0.0085, 0.032, 6);
    for (let i = 0; i < 12; i++) {
      const x = 0.27 + (i / 11) * 0.29;
      const zs = 0.045 * (1 - (i / 11) * 0.75);
      for (const s of [-1, 1]) {
        const tu = new THREE.Mesh(tooth, toothMat);
        tu.position.set(x, -0.125, s * zs);
        tu.rotation.x = Math.PI;
        tu.scale.setScalar(i > 9 ? 1.4 : 1);
        this.headG.add(tu);
      }
    }
    for (let i = 0; i < 9; i++) {
      const x = 0.2 + (i / 8) * 0.22;
      const zs = 0.04 * (1 - (i / 8) * 0.75);
      for (const s of [-1, 1]) {
        const tu = new THREE.Mesh(tooth, toothMat);
        tu.position.set(x, 0.018, s * zs);
        tu.scale.setScalar(0.85);
        this.jawG.add(tu);
      }
    }
    // tongue
    this.tongueG.position.set(0.12, 0.012, 0);
    this.jawG.add(this.tongueG);
    const tongue = new THREE.Mesh(
      loft([
        { p: [0, 0, 0], rx: 0.03, ry: 0.012 },
        { p: [0.12, -0.004, 0], rx: 0.028, ry: 0.011 },
        { p: [0.25, -0.03, 0], rx: 0.022, ry: 0.009 },
        { p: [0.3, -0.06, 0], rx: 0.012, ry: 0.006 },
      ], { radial: 12, segs: 20 }),
      new THREE.MeshPhysicalMaterial({ color: 0xd8707c, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 })
    );
    this.tongueG.add(tongue);

    // nose
    this.nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 24, 16), pink);
    this.nose.material = new THREE.MeshPhysicalMaterial({
      color: 0xe0948c, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.2, sheen: 0.5, sheenColor: new THREE.Color(0xffd5ce),
    });
    this.nose.scale.set(1.05, 0.85, 1.15);
    this.nose.position.set(0.612, -0.093, 0);
    this.nose.castShadow = true;
    this.headG.add(this.nose);
    for (const s of [-1, 1]) {
      const nostril = new THREE.Mesh(
        new THREE.SphereGeometry(0.007, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x2a1514, roughness: 0.4 })
      );
      nostril.position.set(0.635, -0.088, s * 0.014);
      this.headG.add(nostril);
    }

    // eyes
    const eyeMat = new THREE.MeshPhysicalMaterial({
      color: 0x050404, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02,
      envMapIntensity: 2.2, ior: 1.5, specularIntensity: 1,
    });
    const patchGeo = new THREE.SphereGeometry(0.036, 20, 16);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 32, 24), eyeMat);
      eye.position.set(0.31, 0.012, s * 0.082);
      this.headG.add(eye);
      if (s === 1) this.anchors.eye = eye;
      // dark skin ring around eye
      const patch = furPart(patchGeo, {
        len: 0.014, density: 900, layers: 8, under: 0x201b18, guard: 0x3a322d, guardAmt: 0.3, seed: 12 + s,
      });
      patch.position.set(0.31, 0.012, s * 0.07);
      patch.scale.set(0.9, 0.85, 0.4);
      this.headG.add(patch);
    }

    // ears
    const earTex = earTexture();
    const earGeo = new THREE.CircleGeometry(1, 48);
    const ep = earGeo.attributes.position;
    for (let i = 0; i < ep.count; i++) {
      const x = ep.getX(i), y = ep.getY(i);
      ep.setZ(i, 0.55 * (1 - (x * x + y * y)) * 0.6);
    }
    earGeo.computeVertexNormals();
    const earMat = new THREE.MeshPhysicalMaterial({
      map: earTex, roughness: 0.6, side: THREE.DoubleSide, sheen: 0.8, sheenColor: new THREE.Color(0xd9a89a),
      emissive: new THREE.Color(0x2a0d0c), emissiveIntensity: 0.6,
    });
    for (const [grp, s] of [[this.earL, 1], [this.earR, -1]] as [THREE.Group, number][]) {
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.scale.set(0.07, 0.085, 0.07);
      ear.position.y = 0.075;
      ear.castShadow = true;
      grp.add(ear);
      grp.position.set(0.0, 0.115, s * 0.1);
      grp.rotation.x = s * -0.55;
      grp.rotation.z = -0.15;
      this.headG.add(grp);
    }

    // whiskers
    const wMat = new THREE.MeshStandardMaterial({ color: 0xf1ece0, roughness: 0.4 });
    for (const s of [-1, 1]) {
      const wg = new THREE.Group();
      wg.position.set(0.5, -0.088, s * 0.032);
      for (let i = 0; i < 8; i++) {
        const f = i / 7;
        const L = 0.2 + (i % 3) * 0.04;
        const yaw = s * (0.35 + f * 0.7);
        const pitch = -0.3 + f * 0.65;
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(L * 0.55 * Math.cos(yaw), L * 0.55 * Math.sin(pitch) + 0.01, L * 0.55 * Math.sin(yaw)),
          new THREE.Vector3(L * Math.cos(yaw) * 0.9, L * Math.sin(pitch) - 0.05, L * Math.sin(yaw))
        );
        const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.0012, 4), wMat);
        wg.add(m);
      }
      this.headG.add(wg);
      this.whiskers.push(wg);
    }

    this.anchors.head = new THREE.Object3D();
    this.anchors.head.position.set(0.3, -0.03, 0);
    this.headG.add(this.anchors.head);
    this.anchors.snout = new THREE.Object3D();
    this.anchors.snout.position.set(0.55, -0.09, 0);
    this.headG.add(this.anchors.snout);

    // ------------------------------------------------------------ legs
    const mkLeg = (hind: boolean) => {
      const k = hind ? 1.12 : 1;
      const up = new THREE.Group();
      const lo = new THREE.Group();
      const paw = new THREE.Group();
      const furO = {
        len: 0.04, density: 700, layers: 16, under: 0x1d1a18, guard: 0x4a453f, tip: 0x2a2623,
        guardAmt: 0.45, seed: hind ? 21 : 22, comb: [0, -0.3, 0] as [number, number, number],
      };
      const upper = furPart(
        loft([
          { p: [0, 0.02, 0], rx: 0.085 * k, ry: 0.085 * k },
          { p: [0, -0.05, 0], rx: 0.065 * k, ry: 0.07 * k },
          { p: [0, -0.11, 0], rx: 0.048 * k, ry: 0.05 * k },
        ], { radial: 18, segs: 14, up: [1, 0, 0] }),
        furO
      );
      up.add(upper);
      lo.position.y = -0.11;
      const lower = furPart(
        loft([
          { p: [0, 0.01, 0], rx: 0.047 * k, ry: 0.049 * k },
          { p: [0, -0.05, 0], rx: 0.036 * k, ry: 0.04 * k },
          { p: [0, -0.1, 0], rx: 0.03 * k, ry: 0.034 * k },
        ], { radial: 16, segs: 12, up: [1, 0, 0] }),
        furO
      );
      lo.add(lower);
      up.add(lo);
      paw.position.y = -0.1;
      lo.add(paw);
      const skin = skinMat(0xd4a095, 0.5);
      const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), skin);
      palm.scale.set(0.05 * k, 0.014, 0.046 * k);
      palm.position.set(0.035 * k, -0.008, 0);
      palm.castShadow = true;
      paw.add(palm);
      const finger = new THREE.CapsuleGeometry(0.0095 * k, 0.05 * k, 4, 8);
      const nail = new THREE.ConeGeometry(0.006, 0.014, 6);
      const nailMat = new THREE.MeshStandardMaterial({ color: 0xe9e1d2, roughness: 0.4 });
      for (let i = 0; i < 5; i++) {
        const f = (i - 2) / 2;
        const fg = new THREE.Mesh(finger, skin);
        fg.rotation.z = Math.PI / 2;
        fg.rotation.y = f * -0.45;
        fg.position.set(0.075 * k, -0.012, f * 0.04 * k);
        fg.castShadow = true;
        paw.add(fg);
        const nl = new THREE.Mesh(nail, nailMat);
        nl.rotation.z = -Math.PI / 2;
        nl.position.set(0.075 * k + Math.cos(f * -0.45) * 0.05 * k, -0.012, f * 0.04 * k + Math.sin(f * 0.45) * 0.03);
        paw.add(nl);
      }
      return { up, lo, paw };
    };
    const place = (key: "fl" | "fr" | "hl" | "hr", x: number, z: number, hind: boolean) => {
      const l = mkLeg(hind);
      l.up.position.set(x, 0.2, z);
      this.bodyG.add(l.up);
      this.legs[key] = l;
    };
    place("fl", 0.34, 0.2, false);
    place("fr", 0.34, -0.2, false);
    place("hl", -0.38, 0.22, true);
    place("hr", -0.38, -0.22, true);
    this.anchors.paw = this.legs.fl.paw;

    // ------------------------------------------------------------ tail
    this.tailG.position.set(0, 0, 0);
    this.bodyG.add(this.tailG);
    const tailPts = [
      { p: [-0.62, 0.27, 0] as [number, number, number], r: 0.06 },
      { p: [-0.82, 0.24, 0.02] as [number, number, number], r: 0.05 },
      { p: [-1.05, 0.16, 0.06] as [number, number, number], r: 0.04 },
      { p: [-1.3, 0.09, 0.12] as [number, number, number], r: 0.032 },
      { p: [-1.55, 0.06, 0.1] as [number, number, number], r: 0.025 },
      { p: [-1.75, 0.09, 0.02] as [number, number, number], r: 0.017 },
      { p: [-1.86, 0.15, -0.05] as [number, number, number], r: 0.009 },
    ];
    const tailGeo = loft(tailPts.map((t) => ({ p: t.p, rx: t.r, ry: t.r })), { radial: 18, segs: 70 });
    const st = scaleTexture();
    const tailMat = new THREE.MeshPhysicalMaterial({
      map: st, bumpMap: st, bumpScale: 2.2, roughness: 0.5, color: 0xffffff, sheen: 0.6, sheenColor: new THREE.Color(0xffd0c8),
      clearcoat: 0.2,
    });
    tailMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = furTime;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;")
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nfloat tw = smoothstep(0.55, 1.9, -position.x);\ntransformed.z += sin(uTime*1.4 - position.x*2.4)*0.07*tw;\ntransformed.y += sin(uTime*1.1 - position.x*2.0)*0.03*tw;"
        );
    };
    tailMat.customProgramCacheKey = () => "tail-v1";
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.castShadow = true;
    tail.receiveShadow = true;
    this.tailG.add(tail);
    const tailBase = furPart(
      loft([
        { p: [-0.6, 0.27, 0], rx: 0.07, ry: 0.07 },
        { p: [-0.7, 0.26, 0.01], rx: 0.057, ry: 0.057 },
        { p: [-0.82, 0.24, 0.02], rx: 0.05, ry: 0.05 },
      ], { radial: 14, segs: 12 }),
      { len: 0.03, density: 700, layers: 12, under: 0x25201d, guard: 0x5a544b, guardAmt: 0.4, seed: 30 }
    );
    this.tailG.add(tailBase);
    this.tailG.position.set(-0.62, 0.27, 0);
    this.tailG.children.forEach((c) => { c.position.x += 0.62; c.position.y -= 0.27; });
    this.anchors.tail = new THREE.Object3D();
    this.anchors.tail.position.set(-1.2, 0.1, 0.1);
    this.bodyG.add(this.anchors.tail);

    this.anchors.body = new THREE.Object3D();
    this.anchors.body.position.set(0.05, 0.32, 0);
    this.bodyG.add(this.anchors.body);

    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && !(o as THREE.InstancedMesh).isInstancedMesh) {
        o.castShadow = o.castShadow || true;
      }
    });
    this.apply(0);
  }

  setPose(id: PoseId) {
    this.target = { ...POSES[id] };
    this.walking = id === "walk";
  }

  update(dt: number, time: number, speed = 1) {
    const k = 1 - Math.exp(-dt * 4.5 * speed);
    for (const key of KEYS) this.pose[key] += (this.target[key] - this.pose[key]) * k;
    if (this.walking) this.phase += dt * 6.2;
    this.apply(time);
  }

  private apply(t: number) {
    const p = this.pose;
    const trem = p.tremble * (Math.sin(t * 61) * 0.5 + Math.sin(t * 47)) * 0.006;
    const breathe = Math.sin(t * 2.1) * 0.012 + 1;
    this.rollG.position.y = p.rootY + (this.walking ? Math.abs(Math.sin(this.phase)) * 0.015 : 0);
    this.rollG.position.x = trem;
    this.rollG.rotation.x = p.rx;
    this.pitchG.rotation.z = p.rz;
    this.torso.scale.set(1, breathe, 1 + (breathe - 1) * 0.5);

    const w = this.walking ? 1 : 0;
    const sw = Math.sin(this.phase) * 0.55 * w;
    const sw2 = Math.sin(this.phase + Math.PI) * 0.55 * w;
    const lift = (ph: number) => Math.max(0, Math.cos(ph)) * 0.5 * w;
    const set = (k: "fl" | "fr" | "hl" | "hr", s: number, kn: number) => {
      const l = this.legs[k];
      l.up.rotation.z = s;
      l.lo.rotation.z = kn;
      l.paw.rotation.z = -(s + kn);
    };
    set("fl", p.flS + sw, p.flK + lift(this.phase));
    set("fr", p.frS + sw2, p.frK + lift(this.phase + Math.PI));
    set("hl", p.hlS + sw2, p.hlK - lift(this.phase + Math.PI) * 0.7);
    set("hr", p.hrS + sw, p.hrK - lift(this.phase) * 0.7);

    const sniff = Math.sin(t * 7.3) * 0.5 + 0.5;
    this.headG.rotation.set(
      p.hx,
      p.hy + Math.sin(t * 0.7) * 0.05,
      p.hz + Math.sin(t * 1.1) * 0.02 + sniff * 0.015
    );
    const talkOpen =
      this.talk * (0.18 + 0.32 * Math.abs(Math.sin(t * 13.1) * Math.sin(t * 4.7 + 1)));
    this.jawG.rotation.z = p.jaw - talkOpen;
    const tg = THREE.MathUtils.clamp(p.tongue, 0, 1.2);
    this.tongueG.visible = tg > 0.03;
    this.tongueG.scale.set(0.3 + tg * 1.1, 1, 1);
    this.tongueG.rotation.z = -tg * 0.25;
    this.nose.scale.set(1.05 + sniff * 0.1, 0.85 + sniff * 0.08, 1.15 + sniff * 0.1);
    this.earL.rotation.x = -0.55 - p.ears * 0.5 + Math.sin(t * 3.1) * 0.02;
    this.earR.rotation.x = 0.55 + p.ears * 0.5 - Math.sin(t * 2.7) * 0.02;
    this.earL.rotation.z = -0.15 + p.ears * 0.3;
    this.earR.rotation.z = -0.15 + p.ears * 0.3;
    this.whiskers.forEach((wg, i) => {
      wg.rotation.y = Math.sin(t * 5 + i * 2) * 0.03 * (1 + p.tremble * 3);
      wg.rotation.z = Math.sin(t * 6.3 + i) * 0.02;
    });
    this.tailG.rotation.set(p.tx, p.ty, p.tz);
  }
}
