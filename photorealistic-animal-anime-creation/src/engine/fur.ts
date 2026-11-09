import * as THREE from "three";

/** Shared clock for every fur / skin shader. */
export const furTime = { value: 0 };

export interface FurOpts {
  len: number;
  density: number;
  layers?: number;
  under: THREE.ColorRepresentation;
  guard: THREE.ColorRepresentation;
  tip?: THREE.ColorRepresentation;
  guardAmt?: number;
  comb?: [number, number, number];
  wind?: number;
  skin?: THREE.ColorRepresentation;
  castShadow?: boolean;
  seed?: number;
}

const VERT_DECL = /* glsl */ `
uniform float uFurLen; uniform vec3 uComb; uniform float uTime; uniform float uWind;
attribute float aShell;
varying float vShell; varying vec2 vFurUv;
`;
const VERT_BODY = /* glsl */ `
vShell = aShell; vFurUv = uv;
float shl = aShell;
transformed += objectNormal * uFurLen * shl
  + uComb * uFurLen * shl * shl
  + vec3(sin(uTime*1.3 + position.x*7.0), sin(uTime*1.1 + position.y*6.0), cos(uTime*1.7 + position.z*7.0)) * uWind * shl * shl;
`;
const FRAG_DECL = /* glsl */ `
uniform vec3 uUnder; uniform vec3 uGuard; uniform vec3 uTip;
uniform float uDensity; uniform float uGuardAmt; uniform float uSeed;
varying float vShell; varying vec2 vFurUv;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
`;
const FRAG_BODY = /* glsl */ `
{
  vec2 g = vFurUv * uDensity + uSeed;
  float fw = max(fwidth(g.x), fwidth(g.y));
  float solid = smoothstep(1.1, 1.9, fw);
  vec2 id = floor(g);
  float r1 = h21(id), r2 = h21(id + 17.3), r3 = h21(id + 41.7);
  vec2 f = fract(g) - 0.5 - (vec2(r2, r3) - 0.5) * 0.6;
  bool guardHair = r1 > (1.0 - uGuardAmt);
  float hl = guardHair ? (0.8 + 0.2 * r2) : (0.32 + 0.3 * r3);
  float t = vShell / hl;
  if (solid > 0.5) {
    if (vShell > 0.62) discard;
  } else if (vShell > 0.001) {
    float rad = guardHair ? 0.36 * (1.0 - 0.88 * t) : 0.52 * (1.0 - 0.8 * t);
    if (t > 1.0 || length(f) > rad) discard;
  }
  float macro = 0.78 + 0.44 * vnoise(vFurUv * 14.0 + uSeed);
  float macro2 = 0.85 + 0.3 * vnoise(vFurUv * 55.0);
  vec3 col;
  if (guardHair) {
    col = mix(uGuard * 0.7, uGuard, smoothstep(0.0, 0.5, t));
    col = mix(col, uTip, smoothstep(0.72, 1.0, t));
  } else {
    col = uUnder * (0.8 + 0.4 * r3);
  }
  float ao = mix(0.16, 1.0, pow(clamp(vShell, 0.0, 1.0), 0.65));
  if (solid > 0.5) col = mix(uUnder, uGuard * 0.8, 0.42) * (0.85 + 0.3 * r3);
  diffuseColor.rgb = col * macro * macro2 * ao;
}
`;

export function makeFurMaterial(o: FurOpts) {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.82,
    metalness: 0,
    sheen: 1,
    sheenColor: new THREE.Color(0xffffff),
    sheenRoughness: 0.35,
  });
  const u = {
    uFurLen: { value: o.len },
    uComb: { value: new THREE.Vector3(...(o.comb ?? [0, 0, 0])) },
    uTime: furTime,
    uWind: { value: o.wind ?? 0.004 },
    uUnder: { value: new THREE.Color(o.under) },
    uGuard: { value: new THREE.Color(o.guard) },
    uTip: { value: new THREE.Color(o.tip ?? o.guard).multiplyScalar(0.6) },
    uDensity: { value: o.density },
    uGuardAmt: { value: o.guardAmt ?? 0.4 },
    uSeed: { value: (o.seed ?? 1) * 13.7 },
  };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\n" + VERT_DECL)
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n" + VERT_BODY);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + FRAG_DECL)
      .replace("#include <color_fragment>", "#include <color_fragment>\n" + FRAG_BODY);
  };
  m.customProgramCacheKey = () => "furshell-v1";
  m.userData.fur = u;
  return m;
}

/** Skin base + N instanced hair shells sharing one geometry. */
export function furPart(geo: THREE.BufferGeometry, o: FurOpts): THREE.Group {
  const g = new THREE.Group();
  const layers = o.layers ?? 30;
  const skinCol = new THREE.Color(o.skin ?? o.under).multiplyScalar(0.55);
  const base = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: skinCol, roughness: 0.95 })
  );
  base.castShadow = o.castShadow ?? true;
  base.receiveShadow = true;
  g.add(base);

  const mat = makeFurMaterial(o);
  const inst = new THREE.InstancedMesh(geo, mat, layers);
  const shell = new Float32Array(layers);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < layers; i++) {
    shell[i] = (i + 1) / layers;
    inst.setMatrixAt(i, m4.identity());
  }
  // Instanced attribute must live on a *clone* of geometry attributes list, but
  // geometry is shared with `base`, so attach it to a lightweight copy.
  const g2 = geo.clone();
  g2.setAttribute("aShell", new THREE.InstancedBufferAttribute(shell, 1));
  inst.geometry = g2;
  inst.frustumCulled = false;
  inst.castShadow = false;
  inst.receiveShadow = true;
  g.add(inst);
  return g;
}
