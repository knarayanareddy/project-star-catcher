import { useEffect, useRef } from "react";
import { C, CAST, setFigureClock, HEIGHTS, clothTape, drawFigure, fillRR, line, poses, txt, mono, circle, lightPool, type Pose } from "../engine/draw";
import { PRINCIPALS, OCCUPANTS } from "../story/characters";

function bgFor(ctx: CanvasRenderingContext2D, w: number, h: number, floor: number, hue = "#2b2038") {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, hue);
  g.addColorStop(1, "#150e1e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  lightPool(ctx, w / 2, 0, w * 0.9, 0.22, "255,236,200");
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(0, floor, w, h - floor);
  line(ctx, 0, floor, w, floor, "rgba(255,255,255,0.16)", 2);
}

function pose(id: string): Pose {
  const p = poses.stand(0);
  if (id === "yusra") {
    p.handB = [-0.03, -0.24];
    p.handF = [0.04, -0.22];
  }
  return p;
}

export function drawPortrait(ctx: CanvasRenderingContext2D, w: number, h: number, castKey: string) {
  const floor = h * 0.92;
  bgFor(ctx, w, h, floor);
  const H0 = h * 0.78;
  const hh = H0 * (HEIGHTS[castKey] ?? 1) * (castKey === "yusra" ? 1.0 : 1);
  const p = pose(castKey);
  const x = w / 2;
  const j = drawFigure(ctx, x, floor, hh, 1, CAST[castKey], p);
  if (castKey === "lenna") clothTape(ctx, j.handF[0] + 2, j.handF[1], j.handF[0] + 70, j.handF[1] + 80, { width: 11, sag: 12, showFirstInch: true });
  if (castKey === "orrin") {
    fillRR(ctx, j.handF[0] - 8, j.handF[1] - 10, 30, 40, 3, "#9c6b3f", C.ink, 1.5);
    fillRR(ctx, j.handF[0] - 4, j.handF[1] - 6, 22, 30, 2, C.creamLt);
  }
  if (castKey === "rill") {
    ctx.save();
    ctx.translate(j.handB[0] - 6, j.handB[1] + 30);
    ctx.rotate(-1.2);
    fillRR(ctx, -50, -7, 100, 14, 6, "#9b7a4a", "rgba(30,22,40,0.8)", 1.5);
    ctx.restore();
  }
  if (castKey === "attendant") {
    fillRR(ctx, j.handF[0] - 6, j.handF[1] - 20, 40, 28, 3, "#d7dade", "rgba(30,22,40,0.8)", 1.2);
    fillRR(ctx, j.handF[0] - 2, j.handF[1] - 16, 32, 20, 2, "#47c07a");
  }
  if (castKey === "yusra") circle(ctx, j.handF[0] + 4, j.handF[1] + 14, 7, "#c9442f", C.ink, 1);
  if (castKey === "anselm") line(ctx, j.handF[0] + 4, j.handF[1] - 10, j.handF[0] + 14, floor - 4, "#5c3b22", 5);
  if (castKey === "josie") fillRR(ctx, j.handB[0] - 32, j.handB[1] + 4, 44, 32, 5, "#5a4a3a", C.ink, 1.2);
  if (castKey === "ruta") fillRR(ctx, j.handF[0] - 2, j.handF[1] - 2, 26, 14, 3, "#c8452f", C.ink, 1);
  if (castKey === "tobias") circle(ctx, j.handB[0] - 2, j.handB[1] + 10, 7, C.gold, C.ink, 1);
}

export function Portrait({ cast, className = "" }: { cast: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    const t0 = performance.now() + Math.random() * 3000;
    const loop = (now: number) => {
      setFigureClock((now - t0) / 1000);
      ctx.clearRect(0, 0, c.width, c.height);
      drawPortrait(ctx, c.width, c.height, cast);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cast]);
  return <canvas ref={ref} width={420} height={560} className={className} />;
}

/** height chart of all twelve people, drawn at true relative scale */
export function Lineup() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const w = c.width;
    const h = c.height;
    bgFor(ctx, w, h, h - 70);
    const all = [...PRINCIPALS, ...OCCUPANTS];
    const maxM = 2.0;
    const px = (h - 70 - 60) / maxM;
    // scale lines
    for (let m = 0; m <= 2.0; m += 0.5) {
      const y = h - 70 - m * px;
      line(ctx, 40, y, w - 20, y, "rgba(255,255,255,0.08)", 1);
      mono(ctx, `${m.toFixed(1)} m`, 8, y + 4, { size: 11, color: "rgba(255,255,255,0.45)" });
    }
    const step = (w - 90) / all.length;
    all.forEach((d, i) => {
      const x = 70 + step * (i + 0.5);
      const hh = d.metres * px;
      drawFigure(ctx, x, h - 70, hh, 1, CAST[d.cast], poses.stand(0), true);
      txt(ctx, d.name.split(" ")[0].replace("Josephine", "Josie").replace("‘Josie’", ""), x, h - 48, { size: 13, color: "#f1e9d6", align: "center", weight: 700 });
      mono(ctx, `${d.age}`, x, h - 30, { size: 11, color: i < 4 ? "#f3c22f" : "#c9bfa8", align: "center" });
      mono(ctx, d.group === "principal" ? "LEAD" : d.room!.split(" ")[0], x, h - 14, { size: 10, color: d.group === "principal" ? "#ff8a7a" : "#b9a2d8", align: "center", spacing: 1 });
    });
  }, []);
  return <canvas ref={ref} width={1200} height={420} className="w-full rounded-xl border border-white/10" />;
}
