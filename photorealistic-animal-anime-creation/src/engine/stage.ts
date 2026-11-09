import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Opossum, type PoseId } from "./opossum";
import { Moth } from "./moth";
import { buildEnvs, type Env } from "./envs";
import { furTime } from "./fur";
import { SCENES, sceneAt, type EnvId, type EnvOpts, type MoodId, type Shot, type Speaker, type V3 } from "../story/script";
import { activeLine } from "../story/timeline";

interface Mood {
  bg: number;
  fog: number;
  fogD: number;
  exposure: number;
  envI: number;
  key: number; keyI: number; keyP: V3;
  rim: number; rimI: number; rimP: V3;
  fill: number; fillI: number; fillP: V3;
  hemiS: number; hemiG: number; hemiI: number;
  bloom: number;
  warp: number;
  grain: number;
  tint: V3;
  sat: number;
}

const M = (o: Partial<Mood> & Pick<Mood, "bg" | "key" | "rim" | "fill">): Mood => ({
  fog: o.bg, fogD: 0.03, exposure: 1, envI: 0.3,
  keyI: 2, keyP: [2, 3, 3.5], rimI: 2, rimP: [-2.5, 2.2, -3], fillI: 0.5, fillP: [-3, 1, 3],
  hemiS: 0x445577, hemiG: 0x110d0a, hemiI: 0.3, bloom: 0.5, warp: 0, grain: 0.05, tint: [1, 1, 1], sat: 1,
  ...o,
});

const MOODS: Record<MoodId, Mood> = {
  alley: M({ bg: 0x0b0f18, fogD: 0.05, key: 0xffc58a, keyI: 1.8, rim: 0x6fb8ff, rimI: 1.6, fill: 0xff7fb0, fillI: 0.35, envI: 0.25 }),
  alleyRain: M({ bg: 0x070b14, fog: 0x0a1220, fogD: 0.065, exposure: 1.1, key: 0xffa65c, keyI: 2.4, keyP: [1.5, 3.2, 3.2], rim: 0x35c8ff, rimI: 3.2, fill: 0xff3d9a, fillI: 0.8, envI: 0.3, bloom: 0.5, tint: [0.96, 1, 1.05] }),
  alleyDawn: M({ bg: 0xf0b88a, fog: 0xf3c79a, fogD: 0.03, exposure: 1.1, key: 0xffd9a0, keyI: 4.2, keyP: [4, 1.6, 2.6], rim: 0xffb36b, rimI: 3.5, rimP: [-3, 2, -2], fill: 0x9ec8ff, fillI: 0.9, envI: 0.55, hemiS: 0xffd8b0, hemiG: 0x4a3a30, hemiI: 0.7, bloom: 0.8, tint: [1.05, 1, 0.94] }),
  void: M({ bg: 0xf3d9b8, fog: 0xeccaa0, fogD: 0.005, exposure: 0.62, key: 0xfff0dd, keyI: 2.2, keyP: [2, 3.5, 3], rim: 0xffb8e0, rimI: 1.8, fill: 0xc8d8ff, fillI: 0.6, envI: 0.45, hemiS: 0xffe6d0, hemiG: 0xd8a870, hemiI: 0.4, bloom: 0.3, warp: 0.35, tint: [1.02, 1, 0.98] }),
  white: M({ bg: 0xffffff, fog: 0xffffff, fogD: 0.02, exposure: 1.9, key: 0xffffff, keyI: 6, rim: 0xffffff, rimI: 4, fill: 0xffffff, fillI: 3, envI: 1.4, hemiS: 0xffffff, hemiG: 0xffffff, hemiI: 2, bloom: 1.2, warp: 0.5 }),
  office: M({ bg: 0xbfb394, fog: 0xb8ab88, fogD: 0.012, exposure: 1, key: 0xfff4d6, keyI: 2.6, keyP: [1.5, 4, 3], rim: 0xcfe6ff, rimI: 1.6, fill: 0xe6d8b5, fillI: 0.9, envI: 0.7, hemiS: 0xf0e6c8, hemiG: 0x6b6048, hemiI: 0.9, bloom: 0.35, warp: 0.1, tint: [1, 1.02, 0.96], sat: 0.9 }),
  officeDim: M({ bg: 0x07060a, fogD: 0.05, key: 0xffe2b0, keyI: 0.7, keyP: [2, 3, 3], rim: 0x7a9bff, rimI: 1.6, rimP: [-1, 2.2, -3.2], fill: 0x403048, fillI: 0.35, envI: 0.12, hemiI: 0.12, bloom: 0.6 }),
  officeLamp: M({ bg: 0x0b0709, fogD: 0.05, key: 0xffb870, keyI: 2.2, keyP: [-3, 2.5, 1.5], rim: 0x4a6cff, rimI: 1.1, fill: 0x2a2030, fillI: 0.3, envI: 0.12, hemiI: 0.15, bloom: 0.7 }),
  court: M({ bg: 0x07030f, fog: 0x0a0418, fogD: 0.014, key: 0x7dff9a, keyI: 2.6, keyP: [1, 1.5, 4], rim: 0xff3d8f, rimI: 3.5, fill: 0x6a4dff, fillI: 1, envI: 0.2, hemiS: 0x4a2a8a, hemiG: 0x0a0414, hemiI: 0.4, bloom: 0.45, exposure: 0.9, warp: 0.1 }),
  tunnel: M({ bg: 0x100020, fogD: 0.0, key: 0xff8de8, keyI: 2.6, rim: 0x5df2ff, rimI: 3.4, fill: 0xfff25d, fillI: 1.1, envI: 0.4, hemiI: 0.5, bloom: 0.5, exposure: 0.8, warp: 0.6, sat: 1.25 }),
};

interface RShot extends Shot {
  env: EnvId;
  pose: PoseId;
  mood: MoodId;
  opts: EnvOpts;
  dof: number;
  fov: number;
  roll: number;
  animalPos: V3;
  animalTo?: V3;
  yaw: number;
  mothS?: { pos: V3; to?: V3; mode: "hover" | "orbit" } | null;
  abs0: number;
  abs1: number;
}

function resolveShots(): RShot[][] {
  return SCENES.map((s) => {
    const out: RShot[] = [];
    let prev: RShot | null = null;
    s.shots.forEach((sh, i) => {
      const end = s.shots[i + 1]?.at ?? s.dur;
      const env = sh.env ?? prev?.env ?? s.env;
      const animalPos: V3 = sh.animal?.pos ?? (prev ? prev.animalTo ?? prev.animalPos : [0, 0, 0]);
      const r: RShot = {
        ...sh,
        env,
        pose: sh.pose ?? prev?.pose ?? "stand",
        mood: sh.mood ?? prev?.mood ?? "alley",
        opts: sh.opts ?? prev?.opts ?? {},
        dof: sh.dof ?? prev?.dof ?? 0.5,
        fov: sh.fov ?? prev?.fov ?? 32,
        roll: sh.roll ?? 0,
        animalPos,
        animalTo: sh.animal ? sh.animal.to : undefined,
        yaw: sh.animal?.yaw ?? prev?.yaw ?? 0,
        mothS: sh.moth
          ? { pos: sh.moth.pos, to: sh.moth.to, mode: sh.moth.mode ?? "hover" }
          : prev?.mothS
          ? { pos: prev.mothS.to ?? prev.mothS.pos, mode: prev.mothS.mode }
          : null,
        abs0: s.start + sh.at,
        abs1: s.start + end,
      };
      out.push(r);
      prev = r;
    });
    return out;
  });
}

const GRADE = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uGrain: { value: 0.05 },
    uVig: { value: 0.55 },
    uAber: { value: 0.0012 },
    uTint: { value: new THREE.Vector3(1, 1, 1) },
    uSat: { value: 1 },
    uContrast: { value: 1.06 },
    uWarp: { value: 0 },
    uGlitch: { value: 0 },
    uInvert: { value: 0 },
    uHue: { value: 0 },
    uFlash: { value: 0 },
    uBlack: { value: 0 },
    uSpeed: { value: 0 },
    uAspect: { value: 1.78 },
  },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVig, uAber, uSat, uContrast, uWarp, uGlitch, uInvert, uHue, uFlash, uBlack, uSpeed, uAspect;
    uniform vec3 uTint; varying vec2 vUv;
    float h11(float p){ p = fract(p*0.1031); p *= p+33.33; p *= p+p; return fract(p); }
    float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
    vec3 hueRot(vec3 c, float a){ const vec3 k = vec3(0.57735); float ca = cos(a), sa = sin(a);
      return c*ca + cross(k,c)*sa + k*dot(k,c)*(1.0-ca); }
    void main(){
      vec2 uv = vUv; vec2 p = uv - 0.5;
      if (uWarp > 0.001) {
        float r = length(p*vec2(uAspect,1.0));
        float ang = uWarp*0.6*sin(uTime*0.6)*smoothstep(0.9,0.0,r);
        float cs = cos(ang), sn = sin(ang);
        p = mat2(cs,-sn,sn,cs)*p;
        p += uWarp*0.012*vec2(sin(p.y*16.0+uTime*1.7), cos(p.x*13.0+uTime*1.3));
        p *= 1.0 - uWarp*0.06*sin(uTime*0.9+r*6.0);
        uv = p + 0.5;
      }
      if (uGlitch > 0.001) {
        float band = floor(uv.y*28.0); float tt = floor(uTime*24.0);
        float rr = h21(vec2(band, tt));
        if (rr > 0.72) uv.x += (rr-0.72)*0.35*uGlitch*(h21(vec2(tt,band))-0.5)*2.0;
        float blk = step(0.93, h21(floor(uv*vec2(8.0,14.0))+tt));
        uv += blk*0.03*uGlitch;
      }
      float ab = uAber*(1.0+uGlitch*8.0);
      vec2 d = (uv-0.5)*ab*(1.0+length(uv-0.5)*3.0);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + d).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - d).b;
      col = hueRot(col, uHue);
      float l = dot(col, vec3(0.299,0.587,0.114));
      col = mix(vec3(l), col, uSat);
      col = (col-0.5)*uContrast+0.5;
      col *= uTint;
      col = mix(col, 1.0-col, uInvert);
      // speed lines
      if (uSpeed > 0.001) {
        vec2 q = (vUv-0.5)*vec2(uAspect,1.0);
        float a = atan(q.y,q.x); float rr = length(q);
        float n = h11(floor(a*70.0) + floor(uTime*18.0)*3.7);
        float streak = smoothstep(0.62,1.0,n)*smoothstep(0.32,0.85,rr);
        col = mix(col, vec3(1.0), streak*uSpeed*0.85);
      }
      // vignette
      float v = smoothstep(0.85, 0.2, length((vUv-0.5)*vec2(1.0,0.95)));
      col *= mix(1.0, v, uVig);
      // grain
      float gr = h21(vUv*vec2(1920.0,1080.0) + fract(uTime)*100.0) - 0.5;
      col += gr*uGrain*(1.0 - 0.5*l);
      col += uFlash;
      col = mix(col, vec3(0.0), uBlack);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

const ease = (p: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, p)));
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export class Stage {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.03, 300);
  composer: EffectComposer;
  bokeh: BokehPass;
  bloom: UnrealBloomPass;
  grade: ShaderPass;
  animal = new Opossum();
  moth = new Moth();
  envs: Record<EnvId, Env>;
  shots = resolveShots();
  key = new THREE.DirectionalLight(0xffffff, 1);
  rim = new THREE.DirectionalLight(0xffffff, 1);
  fill = new THREE.DirectionalLight(0xffffff, 1);
  hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.3);
  curEnv: EnvId | null = null;
  curShot: RShot | null = null;
  moodNow: Mood;
  talk: Record<Speaker, number> = { NARRATOR: 0, GERALD: 0, DOLORES: 0, MANAGEMENT: 0, MOM: 0 };
  mothPos = new THREE.Vector3(0, -50, 0);
  private noDepth: THREE.Object3D[] = [];
  private lastReal = 0;
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private shake = 0;
  perf = 0;
  noDof = false;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block";

    const pm = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;

    this.envs = buildEnvs();
    for (const k of Object.keys(this.envs) as EnvId[]) {
      this.envs[k].group.visible = false;
      this.scene.add(this.envs[k].group);
    }
    this.scene.add(this.animal.root);
    this.scene.add(this.moth.group);
    this.moth.group.visible = false;
    this.moth.group.scale.setScalar(0.4);

    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    const sc = this.key.shadow.camera;
    sc.left = -3; sc.right = 3; sc.top = 3; sc.bottom = -3; sc.near = 0.5; sc.far = 14;
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    this.key.shadow.radius = 5;
    this.scene.add(this.key, this.key.target, this.rim, this.rim.target, this.fill, this.fill.target, this.hemi);

    this.moodNow = JSON.parse(JSON.stringify(MOODS.alley));
    this.scene.fog = new THREE.FogExp2(0x000000, 0.03);
    this.scene.background = new THREE.Color(0x000000);

    const w = container.clientWidth || 1280;
    const h = container.clientHeight || 720;
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bokeh = new BokehPass(this.scene, this.camera, { focus: 1, aperture: 0.0002, maxblur: 0.01 });
    this.composer.addPass(this.bokeh);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.5, 0.7, 0.85);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GRADE);
    this.composer.addPass(this.grade);

    // Sprites / points / lines must not write into the DOF depth pass
    this.scene.traverse((o) => {
      if ((o as THREE.Sprite).isSprite || (o as THREE.Points).isPoints || (o as THREE.Line).isLine) this.noDepth.push(o);
    });
    const origRender = this.bokeh.render.bind(this.bokeh);
    this.bokeh.render = (...args: Parameters<BokehPass["render"]>) => {
      const vis = this.noDepth.map((o) => o.visible);
      this.noDepth.forEach((o) => (o.visible = false));
      origRender(...args);
      this.noDepth.forEach((o, i) => (o.visible = vis[i]));
    };

    this.resize();
    (window as unknown as { __stage: Stage }).__stage = this;
  }

  resize() {
    const w = this.container.clientWidth || 1280;
    const h = this.container.clientHeight || 720;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.grade.uniforms.uAspect.value = w / h;
  }

  /** Step down quality on slow GPUs. */
  degrade() {
    if (this.perf === 0) {
      this.renderer.setPixelRatio(1);
      this.composer.setPixelRatio(1);
      this.resize();
    } else if (this.perf === 1) this.noDof = true;
    this.perf++;
  }

  dispose() {
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private findShot(t: number): RShot {
    const sc = sceneAt(t);
    const list = this.shots[sc.n - 1];
    let s = list[0];
    for (const x of list) if (t >= x.abs0) s = x;
    return s;
  }

  private anchorPos(a: Shot["target"], out: THREE.Vector3) {
    if (a === "moth") return out.copy(this.mothPos);
    if (a === "world") return out.set(0, 0, 0);
    const o = this.animal.anchors[a];
    return o.getWorldPosition(out);
  }

  /** Renders the frame for story-time `t`. `dt` is wall-clock delta (for ambient motion). */
  render(t: number, dt: number) {
    dt = Math.min(dt, 0.1);
    furTime.value += dt;
    const sc = sceneAt(t);
    const st = t - sc.start;
    const shot = this.findShot(t);
    const p = (t - shot.abs0) / Math.max(0.01, shot.abs1 - shot.abs0);
    const e = ease(p);

    // ---- environment swap
    if (shot.env !== this.curEnv) {
      (Object.keys(this.envs) as EnvId[]).forEach((k) => (this.envs[k].group.visible = k === shot.env));
      this.curEnv = shot.env;
    }
    // ---- pose
    if (this.curShot?.pose !== shot.pose || this.curShot?.abs0 !== shot.abs0) this.animal.setPose(shot.pose);
    this.curShot = shot;

    // ---- speech / talk
    const al = activeLine(t, 0);
    (Object.keys(this.talk) as Speaker[]).forEach((k) => {
      const target = al && al.line.speaker === k ? 1 : 0;
      this.talk[k] += (target - this.talk[k]) * Math.min(1, dt * 14);
    });
    this.animal.talk = this.talk.GERALD;

    // ---- animal transform
    const ap = shot.animalTo ? lerp3(shot.animalPos, shot.animalTo, p) : shot.animalPos;
    this.animal.root.position.set(ap[0], ap[1], ap[2]);
    this.animal.root.rotation.y += (shot.yaw - this.animal.root.rotation.y) * Math.min(1, dt * 3);
    const floating = shot.pose === "float";
    this.animal.root.rotation.z = floating ? Math.sin(furTime.value * 0.7) * 0.35 : 0;
    this.animal.root.position.y += floating ? Math.sin(furTime.value * 0.9) * 0.1 : 0;
    this.animal.root.visible = !(shot.animal && "hide" in shot.animal && shot.animal.hide);
    this.animal.update(dt, furTime.value);
    this.animal.root.updateMatrixWorld(true);

    // ---- moth
    const ms = shot.mothS;
    this.moth.group.visible = !!ms;
    if (ms) {
      const tgt = ms.to ? lerp3(ms.pos, ms.to, e) : ms.pos;
      const target = this.tmp2.set(tgt[0], tgt[1], tgt[2]);
      if (ms.mode === "orbit") {
        const w = furTime.value * 1.3;
        target.add(new THREE.Vector3(Math.cos(w) * 2.6, Math.sin(w * 1.7) * 0.7, Math.sin(w) * 2.6));
      }
      if (this.mothPos.y < -40) this.mothPos.copy(target);
      this.mothPos.lerp(target, 1 - Math.exp(-dt * (ms.mode === "orbit" ? 6 : 2.4)));
      this.moth.group.position.copy(this.mothPos);
      this.moth.group.position.y += Math.sin(furTime.value * 1.8) * 0.04;
      const cam = this.camera.position;
      this.moth.group.rotation.y = Math.atan2(cam.x - this.mothPos.x, cam.z - this.mothPos.z) * 0.85;
      this.moth.update(furTime.value, this.talk.DOLORES, ms.mode === "orbit" ? 1 : 0);
    } else this.mothPos.set(0, -50, 0);
    this.moth.group.updateMatrixWorld(true);

    // ---- mood
    const target = MOODS[shot.mood];
    const k = 1 - Math.exp(-dt * (this.lastMood === shot.mood ? 6 : 6));
    this.lastMood = shot.mood;
    this.blendMood(target, k);
    const m = this.moodNow;
    (this.scene.background as THREE.Color).setHex(m.bg);
    const fog = this.scene.fog as THREE.FogExp2;
    fog.color.setHex(m.fog);
    fog.density = m.fogD;
    this.renderer.toneMappingExposure = m.exposure;
    this.scene.environmentIntensity = m.envI;
    const ctr = this.tmp.set(ap[0], ap[1] + 0.25, ap[2]);
    this.key.color.setHex(m.key);
    this.key.intensity = m.keyI;
    this.key.position.set(ap[0] + m.keyP[0], ap[1] + m.keyP[1], ap[2] + m.keyP[2]);
    this.key.target.position.copy(ctr);
    this.rim.color.setHex(m.rim);
    this.rim.intensity = m.rimI;
    this.rim.position.set(ap[0] + m.rimP[0], ap[1] + m.rimP[1], ap[2] + m.rimP[2]);
    this.rim.target.position.copy(ctr);
    this.fill.color.setHex(m.fill);
    this.fill.intensity = m.fillI;
    this.fill.position.set(ap[0] + m.fillP[0], ap[1] + m.fillP[1], ap[2] + m.fillP[2]);
    this.fill.target.position.copy(ctr);
    this.hemi.color.setHex(m.hemiS);
    this.hemi.groundColor.setHex(m.hemiG);
    this.hemi.intensity = m.hemiI;
    this.bloom.strength = m.bloom;

    // ---- env update
    this.envs[shot.env].update({ t: furTime.value, dt, st, opts: shot.opts, mood: shot.mood, talk: this.talk });

    // ---- fx
    let flash = 0, glitch = 0, shake = 0, invert = 0, speed = 0, black = 0, warp = m.warp, hue = 0;
    for (const f of sc.fx) {
      if (st < f.at || st > f.at + f.dur) continue;
      const q = (st - f.at) / f.dur;
      switch (f.type) {
        case "flash": flash = Math.max(flash, Math.pow(1 - q, 2.2)); break;
        case "glitch": glitch = Math.max(glitch, 1); break;
        case "shake": shake = Math.max(shake, 1 - q); break;
        case "invert": invert = Math.sin(furTime.value * 40) > -0.2 ? 1 : 0; break;
        case "speed": speed = Math.max(speed, Math.min(1, Math.min(q * 6, (1 - q) * 6))); break;
        case "blackout": black = f.at < 1 ? 1 - q : q; break;
        case "warp": warp = Math.max(warp, Math.sin(Math.min(1, q * 3) * Math.PI * 0.5) * 0.8); break;
        case "hue": hue = Math.sin(st * 0.35) * 0.9 + st * 0.05; break;
      }
    }
    // global edges
    if (t < 0.4) black = Math.max(black, 1 - t / 0.4);
    if (t > 359.4) black = 1;
    const gu = this.grade.uniforms;
    gu.uTime.value = furTime.value;
    gu.uGrain.value = m.grain;
    gu.uTint.value.set(...m.tint);
    gu.uSat.value = m.sat;
    gu.uWarp.value = warp;
    gu.uGlitch.value = glitch;
    gu.uInvert.value = invert;
    gu.uHue.value = hue;
    gu.uFlash.value = flash;
    gu.uSpeed.value = speed;
    gu.uBlack.value = black;
    this.shake += (shake - this.shake) * Math.min(1, dt * 30);

    // ---- camera
    const fromV = lerp3(shot.from, shot.to, e);
    const look = new THREE.Vector3();
    const camPos = new THREE.Vector3();
    if (shot.target === "world") {
      look.set(...(shot.tOff ?? [0, 0, 0]));
      camPos.set(...fromV);
    } else {
      this.anchorPos(shot.target, look);
      camPos.copy(look).add(new THREE.Vector3(...fromV).multiplyScalar(shot.target === "head" ? 1.45 : shot.target === "moth" ? 1.9 : 1));
      if (shot.tOff) look.add(new THREE.Vector3(...shot.tOff));
    }
    const dist = camPos.distanceTo(look);
    const ft = furTime.value;
    const hh = dist * 0.0035;
    camPos.x += Math.sin(ft * 1.1) * hh + Math.sin(ft * 2.3) * hh * 0.4;
    camPos.y += Math.sin(ft * 0.9 + 1) * hh;
    camPos.z += Math.sin(ft * 1.3 + 2) * hh * 0.5;
    if (this.shake > 0.01) {
      const a = this.shake * dist * 0.03;
      camPos.add(new THREE.Vector3((Math.random() - 0.5) * a, (Math.random() - 0.5) * a, (Math.random() - 0.5) * a));
    }
    this.camera.position.copy(camPos);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(look);
    const roll = (shot.roll * Math.PI) / 180 + (shot.roll ? Math.sin(ft * 0.8) * 0.02 : 0);
    if (roll) this.camera.rotateZ(roll);
    if (Math.abs(this.camera.fov - shot.fov) > 0.01) {
      this.camera.fov = shot.fov;
      this.camera.updateProjectionMatrix();
    }
    // DOF
    this.bokeh.enabled = !this.noDof && shot.dof > 0.02;
    const u = this.bokeh.uniforms as unknown as Record<string, { value: number }>;
    u.focus.value = dist;
    u.aperture.value = (0.03 * shot.dof) / Math.max(0.5, dist * 0.6);
    u.maxblur.value = 0.004 + 0.012 * shot.dof;

    this.composer.render(dt);
    this.lastReal += dt;
  }

  private lastMood: MoodId | null = null;

  private blendMood(t: Mood, k: number) {
    const c = this.moodNow as unknown as Record<string, number | V3>;
    const tt = t as unknown as Record<string, number | V3>;
    const col = new THREE.Color();
    const col2 = new THREE.Color();
    for (const key of Object.keys(tt)) {
      const a = c[key];
      const b = tt[key];
      if (Array.isArray(b)) {
        const arr = a as V3;
        for (let i = 0; i < 3; i++) arr[i] += (b[i] - arr[i]) * k;
      } else if (["bg", "fog", "key", "rim", "fill", "hemiS", "hemiG"].includes(key)) {
        col.setHex(a as number);
        col2.setHex(b as number);
        col.lerp(col2, k);
        c[key] = col.getHex();
      } else {
        c[key] = (a as number) + ((b as number) - (a as number)) * k;
      }
    }
  }

  /** Utility for debugging / screenshots. */
  still(t: number, n = 10) {
    for (let i = 0; i < n; i++) this.render(t, 0.1);
  }
}
