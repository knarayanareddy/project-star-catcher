import * as THREE from "three";
import { canvasTexture, loft, rnd } from "./loft";
import { furPart } from "./fur";

function wingTexture(hind: boolean) {
  const r = rnd(hind ? 5 : 9);
  return canvasTexture(512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, "#d3f0b2");
    g.addColorStop(0.7, "#b7e19a");
    g.addColorStop(1, "#98cf86");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // leading edge purple-brown band
    const e = ctx.createLinearGradient(0, h, 0, 0);
    e.addColorStop(0, "rgba(120,60,90,0)");
    e.addColorStop(0.75, "rgba(120,60,90,0)");
    e.addColorStop(1, "rgba(110,50,85,0.95)");
    ctx.fillStyle = e;
    ctx.fillRect(0, 0, w, h);
    // veins
    ctx.strokeStyle = "rgba(90,130,80,0.45)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(0, h * (0.2 + r() * 0.5));
      ctx.quadraticCurveTo(w * 0.5, h * (0.1 + r() * 0.8), w, h * (0.05 + r() * 0.9));
      ctx.stroke();
    }
    // eyespot
    const cx = w * 0.52, cy = h * (hind ? 0.62 : 0.5);
    for (const [rad, col] of [[58, "#6a3a55"], [48, "#f1e27a"], [36, "#4b5fa0"], [24, "#d9f0ff"], [12, "#2a2540"]] as [number, string][]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rad, rad * 1.15, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    // scales / fuzz noise
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = `rgba(255,255,255,${r() * 0.1})`;
      ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
      ctx.fillStyle = `rgba(40,70,40,${r() * 0.06})`;
      ctx.fillRect(r() * w, r() * h, 1, 2);
    }
  });
}

function wingGeo(hind: boolean) {
  const s = new THREE.Shape();
  if (!hind) {
    s.moveTo(0, 0.06);
    s.bezierCurveTo(0.2, 0.55, 0.7, 0.62, 0.9, 0.38);
    s.bezierCurveTo(0.95, 0.2, 0.6, -0.02, 0.12, -0.08);
    s.lineTo(0, 0.0);
  } else {
    s.moveTo(0, 0.0);
    s.bezierCurveTo(0.25, 0.02, 0.6, -0.04, 0.55, -0.25);
    s.bezierCurveTo(0.5, -0.5, 0.3, -0.85, 0.2, -1.12);
    s.bezierCurveTo(0.1, -0.85, 0.12, -0.6, 0.06, -0.35);
    s.lineTo(0, -0.1);
  }
  const g = new THREE.ShapeGeometry(s, 24);
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    uv.setXY(i, (x - bb.min.x) / (bb.max.x - bb.min.x), (y - bb.min.y) / (bb.max.y - bb.min.y));
    // slight cup
    pos.setZ(i, -0.04 * (x * x) + 0.02 * Math.sin(y * 8));
  }
  g.computeVertexNormals();
  return g;
}

export class Moth {
  group = new THREE.Group();
  anchor = new THREE.Object3D();
  private wings: THREE.Group[] = [];
  private glow: THREE.PointLight;
  private body = new THREE.Group();
  private phase = Math.random() * 10;

  constructor() {
    const fore = wingGeo(false);
    const hind = wingGeo(true);
    const mf = new THREE.MeshStandardMaterial({
      map: wingTexture(false), side: THREE.DoubleSide, roughness: 0.85, color: 0xb8b8b8, emissive: 0x88c070, emissiveIntensity: 0.05,
    });
    const mh = new THREE.MeshStandardMaterial({
      map: wingTexture(true), side: THREE.DoubleSide, roughness: 0.85, color: 0xb8b8b8, emissive: 0x88c070, emissiveIntensity: 0.05,
    });
    for (const s of [1, -1]) {
      const w = new THREE.Group();
      w.position.set(s * 0.04, 0.02, 0);
      w.scale.x = s;
      const f = new THREE.Mesh(fore, mf);
      f.position.z = 0.012;
      const h = new THREE.Mesh(hind, mh);
      h.position.z = -0.006;
      f.castShadow = h.castShadow = true;
      w.add(f, h);
      this.body.add(w);
      this.wings.push(w);
    }

    const bodyFur = furPart(
      loft([
        { p: [0, -0.58, 0], rx: 0.012, ry: 0.012 },
        { p: [0, -0.42, 0], rx: 0.06, ry: 0.06 },
        { p: [0, -0.22, 0], rx: 0.085, ry: 0.085 },
        { p: [0, -0.02, 0], rx: 0.115, ry: 0.115 },
        { p: [0, 0.12, 0], rx: 0.1, ry: 0.1 },
        { p: [0, 0.2, 0], rx: 0.06, ry: 0.06 },
        { p: [0, 0.25, 0], rx: 0.012, ry: 0.012 },
      ], { radial: 20, segs: 36, up: [0, 0, 1] }),
      { len: 0.05, density: 340, layers: 22, under: 0xcfc6a6, guard: 0xcfc8b0, tip: 0xe0d8c0, guardAmt: 0.6, comb: [0, -0.3, 0], seed: 41, wind: 0.002 }
    );
    this.body.add(bodyFur);

    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x070508, roughness: 0.05, clearcoat: 1, envMapIntensity: 2 });
    for (const s of [1, -1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 20, 14), eyeMat);
      eye.position.set(s * 0.05, 0.19, 0.06);
      this.body.add(eye);
      // glasses
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.055, 0.0042, 8, 32),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.9, roughness: 0.25 })
      );
      ring.position.set(s * 0.055, 0.19, 0.11);
      this.body.add(ring);
      const lens = new THREE.Mesh(
        new THREE.CircleGeometry(0.052, 24),
        new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0, clearcoat: 1 })
      );
      lens.position.set(s * 0.055, 0.19, 0.11);
      this.body.add(lens);
      // antenna with barbs
      const pts = [new THREE.Vector3(s * 0.03, 0.25, 0.05), new THREE.Vector3(s * 0.1, 0.4, 0.1), new THREE.Vector3(s * 0.22, 0.52, 0.06)];
      const curve = new THREE.CatmullRomCurve3(pts);
      const am = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.7 });
      this.body.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.004, 5), am));
      for (let i = 1; i < 18; i++) {
        const t = i / 18;
        const p = curve.getPoint(t);
        const len = 0.05 * (1 - Math.abs(t - 0.45) * 1.2);
        for (const k of [-1, 1]) {
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0005, len, 4), am);
          b.position.copy(p).add(new THREE.Vector3(s * 0.0, 0.0, k * len * 0.4));
          b.rotation.x = k * 1.2;
          b.rotation.z = -s * 0.5;
          this.body.add(b);
        }
      }
    }
    bridgeAdd(this.body);

    // badge on a lanyard
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.17, 0.22),
      new THREE.MeshStandardMaterial({
        roughness: 0.5,
        map: canvasTexture(256, 340, (ctx, w, h) => {
          ctx.fillStyle = "#f4f1e8";
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = "#1d3b5a";
          ctx.fillRect(0, 0, w, 62);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 24px sans-serif";
          ctx.fillText("DEPT. OF FINAL", 16, 28);
          ctx.fillText("OUTCOMES", 16, 54);
          ctx.fillStyle = "#c9c2ad";
          ctx.fillRect(w / 2 - 50, 84, 100, 100);
          ctx.fillStyle = "#222";
          ctx.font = "bold 36px sans-serif";
          ctx.fillText("DOLORES", 28, 232);
          ctx.font = "22px sans-serif";
          ctx.fillText("INTAKE · WINDOW 1/1", 22, 268);
          ctx.fillText("DECEASED: BUG ZAPPER", 18, 304);
        }),
      })
    );
    badge.position.set(0.0, -0.2, 0.14);
    badge.rotation.x = -0.1;
    this.body.add(badge);
    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.2, 4),
      new THREE.MeshStandardMaterial({ color: 0x1d3b5a })
    );
    cord.position.set(0, -0.06, 0.12);
    this.body.add(cord);

    this.glow = new THREE.PointLight(0xc8ffd8, 0.12, 5);
    this.glow.position.set(0, 0, 0.4);
    this.group.add(this.glow);
    this.group.add(this.body);
    this.group.add(this.anchor);
    this.body.rotation.x = 0.12;
  }

  update(t: number, talk: number, frantic = 0) {
    const ph = t + this.phase;
    const rate = 10 + frantic * 12 + talk * 3;
    const s = 0.5 + 0.5 * Math.sin(ph * rate);
    const ang = 0.2 + s * (0.85 - talk * 0.2);
    for (const w of this.wings) w.rotation.y = ang;
    this.body.position.y = Math.sin(ph * rate) * 0.01 + Math.sin(ph * 1.7) * 0.03;
    this.body.rotation.z = Math.sin(ph * 0.9) * 0.06 + talk * Math.sin(ph * 9) * 0.03;
  }
}

function bridgeAdd(parent: THREE.Group) {
  const b = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0035, 0.0035, 0.06, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.9, roughness: 0.3 })
  );
  b.rotation.z = Math.PI / 2;
  b.position.set(0, 0.2, 0.115);
  parent.add(b);
}
