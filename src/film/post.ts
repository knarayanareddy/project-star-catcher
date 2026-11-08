export interface PostParams {
  exposure: number;
  flash: number;
  chroma: number;
  bloom: number;
  glitch: number;
  ripple: number;
  horizon: number;
  fold: number;
  foldY: number;
  foldF: number;
  roll: number;
  kaleido: number;
  kRot: number;
  swirl: number;
  zoomBlur: number;
  zoomC: [number, number];
  wobble: number;
  vig: number;
  grain: number;
  sat: number;
  contrast: number;
  invert: number;
  hue: number;
  letter: number;
  tint: [number, number, number];
}

export const defaultPost = (): PostParams => ({
  exposure: 1, flash: 0, chroma: 0.25, bloom: 0.9, glitch: 0, ripple: 0, horizon: 0.58,
  fold: 0, foldY: 0.58, foldF: 0.9, roll: 0, kaleido: 0, kRot: 0, swirl: 0, zoomBlur: 0,
  zoomC: [0.5, 0.5], wobble: 0, vig: 0.8, grain: 0.07, sat: 1.05, contrast: 1.06, invert: 0,
  hue: 0, letter: 0.066, tint: [1, 1, 1],
});

const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }`;

const FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes; uniform float uTime;
uniform float uExposure,uFlash,uChroma,uBloom,uGlitch,uRipple,uHorizon,uFold,uFoldY,uFoldF,uRoll,uKaleido,uKRot,uSwirl,uZoomBlur,uWobble,uVig,uGrain,uSat,uContrast,uInvert,uHue,uLetter;
uniform vec2 uZoomC; uniform vec3 uTint;
out vec4 outc;

float hash(float n){ return fract(sin(n*127.1)*43758.5453); }
float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
vec2 rot(vec2 v, float a){ float c=cos(a), s=sin(a); return vec2(c*v.x - s*v.y, s*v.x + c*v.y); }
vec2 mir(vec2 u){ return abs(mod(u+1.0, 2.0)-1.0); }
vec3 hueRot(vec3 c, float a){
  const mat3 toYIQ = mat3(0.299,0.596,0.211, 0.587,-0.274,-0.523, 0.114,-0.322,0.312);
  const mat3 toRGB = mat3(1.0,1.0,1.0, 0.956,-0.272,-1.106, 0.621,-0.647,1.703);
  vec3 y = toYIQ*c; float h = atan(y.z,y.y)+a; float ch = length(y.yz);
  return toRGB*vec3(y.x, ch*cos(h), ch*sin(h));
}
vec3 samp(vec2 u){
  if(uZoomBlur<0.001) return textureLod(uTex, mir(u), 0.0).rgb;
  vec3 s=vec3(0.0);
  for(int i=0;i<12;i++){ float k=float(i)/11.0; vec2 uu=uZoomC+(u-uZoomC)*(1.0-uZoomBlur*k); s+=textureLod(uTex, mir(uu), 0.0).rgb; }
  return s/12.0;
}
void main(){
  vec2 uv = vec2(gl_FragCoord.x/uRes.x, 1.0-gl_FragCoord.y/uRes.y);
  vec2 asp = vec2(uRes.x/uRes.y, 1.0);
  vec2 q = vec2((uv.x-0.5)*asp.x, 0.5-uv.y);
  float shade = 1.0;
  if(uGlitch>0.001){
    float band = floor(uv.y*26.0) + floor(uTime*16.0)*3.7;
    float h = hash(band);
    if(h < uGlitch*0.55) q.x += (hash(band+1.3)-0.5)*0.4*uGlitch;
    float blk = floor(uv.y*7.0)+floor(uv.x*5.0)*11.0+floor(uTime*10.0)*5.0;
    if(hash(blk) < uGlitch*0.08) q += (vec2(hash(blk+2.0),hash(blk+3.0))-0.5)*0.2;
  }
  if(uKaleido>0.5){
    float r=length(q); float a=atan(q.y,q.x)+uKRot; float seg=6.2831853/uKaleido;
    a=abs(mod(a,seg)-seg*0.5); q=r*vec2(cos(a),sin(a));
  }
  if(abs(uSwirl)>0.001){ float r=length(q); q=rot(q, uSwirl*exp(-r*2.2)); }
  q = rot(q, uRoll);
  if(abs(uFold)>0.001){
    float hy = 0.5-uFoldY;
    float o = q.y-hy; float a=uFold; float f=uFoldF;
    float den = f*cos(a)+o*sin(a);
    float d = (abs(den)>0.0001) ? o*f/den : -1.0;
    bool ok = d>0.0 && d<1.6 && (f-d*sin(a))>0.03;
    if(ok){
      float s = f/(f-d*sin(a));
      q = vec2(q.x/s, hy+d);
      shade = 1.0 - 0.55*sin(clamp(a,0.0,3.1416))*exp(-abs(o)*5.0);
    } else if(o>0.0){
      q = vec2(q.x, hy-o); shade = 0.55;
    }
  }
  q = rot(q, -uRoll);
  vec2 u = vec2(q.x/asp.x+0.5, 0.5-q.y);
  if(uRipple>0.001){
    float dy = u.y-uHorizon;
    if(dy>0.0){
      u.x += sin(u.y*150.0+uTime*1.7+sin(u.x*9.0)*1.3)*0.0016*uRipple*(0.35+dy*6.0);
      u.y += sin(u.x*70.0-uTime*1.1)*0.0011*uRipple*dy*3.0;
    }
  }
  if(uWobble>0.001) u += uWobble*0.004*vec2(sin(u.y*18.0+uTime*1.3), cos(u.x*14.0+uTime*1.1));
  vec2 dir = u-0.5;
  float ch = uChroma*(0.0015+dot(dir,dir)*0.02) + uGlitch*0.006;
  vec3 col;
  col.r = samp(u+dir*ch*8.0).r;
  col.g = samp(u).g;
  col.b = samp(u-dir*ch*8.0).b;
  vec2 um = mir(u);
  vec3 b = textureLod(uTex,um,3.0).rgb*0.3 + textureLod(uTex,um,4.5).rgb*0.3 + textureLod(uTex,um,6.0).rgb*0.25 + textureLod(uTex,um,7.5).rgb*0.2;
  col += clamp(max(b-0.1,0.0)*uBloom, 0.0, 1.2);
  col *= shade;
  col *= uTint;
  col = (col-0.5)*uContrast+0.5;
  float l = dot(col, vec3(0.299,0.587,0.114));
  col = mix(vec3(l), col, uSat);
  if(abs(uHue)>0.001) col = hueRot(col, uHue);
  col = mix(col, 1.0-col, uInvert);
  // soft-knee tone compress high luminance before exposure and flash
  col = col / (vec3(1.0) + max(col - 1.0, vec3(0.0)) * 0.45);
  col = col*uExposure + min(uFlash, 0.85);
  vec2 vv = (uv-0.5)*vec2(1.0,0.82)*1.45;
  col *= mix(1.0, smoothstep(1.0,0.2,length(vv)), uVig);
  col += (hash2(uv*uRes + fract(uTime)*91.0)-0.5)*uGrain;
  if(uv.y<uLetter || uv.y>1.0-uLetter) col=vec3(0.0);
  outc = vec4(clamp(col,0.0,1.0),1.0);
}`;

const NAMES: (keyof PostParams)[] = [
  "exposure", "flash", "chroma", "bloom", "glitch", "ripple", "horizon", "fold", "foldY", "foldF", "roll",
  "kaleido", "kRot", "swirl", "zoomBlur", "wobble", "vig", "grain", "sat", "contrast", "invert", "hue", "letter",
];
const UNI: Record<string, string> = {
  exposure: "uExposure", flash: "uFlash", chroma: "uChroma", bloom: "uBloom", glitch: "uGlitch", ripple: "uRipple",
  horizon: "uHorizon", fold: "uFold", foldY: "uFoldY", foldF: "uFoldF", roll: "uRoll", kaleido: "uKaleido", kRot: "uKRot",
  swirl: "uSwirl", zoomBlur: "uZoomBlur", wobble: "uWobble", vig: "uVig", grain: "uGrain", sat: "uSat",
  contrast: "uContrast", invert: "uInvert", hue: "uHue", letter: "uLetter",
};

export class Post {
  gl: WebGL2RenderingContext | null;
  c2d: CanvasRenderingContext2D | null = null;
  prog: WebGLProgram | null = null;
  tex: WebGLTexture | null = null;
  loc: Record<string, WebGLUniformLocation | null> = {};

  constructor(public out: HTMLCanvasElement, public src: HTMLCanvasElement) {
    this.gl = out.getContext("webgl2", {
      alpha: false,
      premultipliedAlpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    if (this.gl && "drawingBufferColorSpace" in this.gl) {
      try { (this.gl as any).drawingBufferColorSpace = "srgb"; } catch {}
    }
    if (!this.gl) {
      this.c2d = out.getContext("2d");
      return;
    }
    const gl = this.gl;
    const mk = (type: number, s: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, s);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
      return sh;
    };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, mk(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    this.prog = pr;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const pl = gl.getAttribLocation(pr, "p");
    gl.enableVertexAttribArray(pl);
    gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    for (const n of [...Object.values(UNI), "uTex", "uRes", "uTime", "uZoomC", "uTint"]) this.loc[n] = gl.getUniformLocation(pr, n);
  }

  render(p: PostParams, t: number) {
    const gl = this.gl;
    if (!gl) {
      const c = this.c2d!;
      c.fillStyle = "#000";
      c.fillRect(0, 0, this.out.width, this.out.height);
      c.globalAlpha = Math.max(0, Math.min(1, p.exposure));
      c.drawImage(this.src, 0, 0, this.out.width, this.out.height);
      c.globalAlpha = 1;
      return;
    }
    if (this.prog) gl.useProgram(this.prog);
    gl.viewport(0, 0, this.out.width, this.out.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.src);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.uniform1i(this.loc.uTex, 0);
    gl.uniform2f(this.loc.uRes, this.out.width, this.out.height);
    gl.uniform1f(this.loc.uTime, t);
    gl.uniform2f(this.loc.uZoomC, p.zoomC[0], p.zoomC[1]);
    gl.uniform3f(this.loc.uTint, p.tint[0], p.tint[1], p.tint[2]);
    for (const n of NAMES) gl.uniform1f(this.loc[UNI[n]], p[n] as number);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
