import * as THREE from "three";

export interface Station {
  p: [number, number, number];
  rx: number; // half-extent along "side" axis
  ry: number; // half-extent along "up" axis
}

export interface LoftOpts {
  radial?: number;
  segs?: number;
  up?: [number, number, number];
}

/**
 * Lofts an elliptical tube along a Catmull-Rom spine. UVs are in world units
 * (u = distance around the surface, v = distance along the spine) so that fur
 * density stays uniform no matter how the part tapers.
 */
export function loft(stations: Station[], opts: LoftOpts = {}): THREE.BufferGeometry {
  const radial = opts.radial ?? 28;
  const segs = opts.segs ?? 44;
  const up = new THREE.Vector3(...(opts.up ?? [0, 1, 0]));
  const pts = stations.map((s) => new THREE.Vector3(...s.p));
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const rcurve = new THREE.CatmullRomCurve3(
    stations.map((s) => new THREE.Vector3(s.rx, s.ry, 0)),
    false,
    "centripetal"
  );

  const rings: {
    p: THREE.Vector3;
    side: THREE.Vector3;
    upv: THREE.Vector3;
    tan: THREE.Vector3;
    rx: number;
    ry: number;
    arc: number;
  }[] = [];
  let arc = 0;
  let prev: THREE.Vector3 | null = null;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t).normalize();
    const r = rcurve.getPoint(t);
    let side = new THREE.Vector3().crossVectors(tan, up);
    if (side.lengthSq() < 1e-5) side = new THREE.Vector3(0, 0, 1);
    side.normalize();
    const upv = new THREE.Vector3().crossVectors(side, tan).normalize();
    if (prev) arc += p.distanceTo(prev);
    prev = p;
    rings.push({
      p,
      side,
      upv,
      tan,
      rx: Math.max(0.002, r.x),
      ry: Math.max(0.002, r.y),
      arc,
    });
  }

  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const tmp = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const R = rings[i];
    const a = rings[Math.max(0, i - 1)];
    const b = rings[Math.min(segs, i + 1)];
    const ds = Math.max(1e-4, b.arc - a.arc);
    const slope = ((b.rx + b.ry) / 2 - (a.rx + a.ry) / 2) / ds;
    const perim = Math.PI * (R.rx + R.ry);
    for (let j = 0; j <= radial; j++) {
      const ang = (j / radial) * Math.PI * 2;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      tmp
        .copy(R.p)
        .addScaledVector(R.side, R.rx * c)
        .addScaledVector(R.upv, R.ry * s);
      pos.push(tmp.x, tmp.y, tmp.z);
      n.set(0, 0, 0)
        .addScaledVector(R.side, c * R.ry)
        .addScaledVector(R.upv, s * R.rx)
        .normalize()
        .addScaledVector(R.tan, -slope)
        .normalize();
      nor.push(n.x, n.y, n.z);
      uv.push((j / radial) * perim, R.arc);
    }
  }
  const row = radial + 1;
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // If winding came out inverted, flip it by checking one normal vs. face normal.
  const pa = new THREE.Vector3().fromArray(pos, idx[0] * 3);
  const pb = new THREE.Vector3().fromArray(pos, idx[1] * 3);
  const pc = new THREE.Vector3().fromArray(pos, idx[2] * 3);
  const face = new THREE.Vector3().subVectors(pb, pa).cross(new THREE.Vector3().subVectors(pc, pa));
  const vn = new THREE.Vector3().fromArray(nor, idx[0] * 3);
  if (face.dot(vn) < 0) {
    const flipped: number[] = [];
    for (let i = 0; i < idx.length; i += 3) flipped.push(idx[i], idx[i + 2], idx[i + 1]);
    g.setIndex(flipped);
  }
  g.computeBoundingSphere();
  return g;
}

export function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  srgb = true
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function rnd(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
