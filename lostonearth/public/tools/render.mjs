// render.mjs — frame-exact export (the "render contract").
// usage:  node public/tools/render.mjs http://localhost:4173 300 60 [subframes]
// needs:  npm i -D playwright && npx playwright install chromium   (and ffmpeg on PATH)
// The page exposes window.seek(t) and window.__ready; ?render=1 gives a bare 1920x820 canvas.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const [url = "http://localhost:4173", secs = "300", fps = "60", sub = "2"] = process.argv.slice(2);
const FPS = Number(fps), SUB = Number(sub), N = Math.round(Number(secs) * FPS);
mkdirSync("out", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 820 }, deviceScaleFactor: 1 });
await page.goto(`${url}/?render=1`, { waitUntil: "load" });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });

// SUB subframes per output frame are averaged by ffmpeg → real motion blur (180° shutter)
const vf = `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/${FPS}/TB`;
const ff = spawn(
  "ffmpeg",
  ["-y", "-f", "image2pipe", "-framerate", String(FPS * SUB), "-i", "-", "-vf", vf, "-r", String(FPS),
   "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "out/silent.mp4"],
  { stdio: ["pipe", "inherit", "inherit"] }
);

for (let i = 0; i < N; i++) {
  for (let k = 0; k < SUB; k++) {
    const t = (i + 0.5 * (k / SUB)) / FPS;
    await page.evaluate((tt) => window.seek(tt), t);
    const png = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
  }
  if (i % FPS === 0) console.log(`frame ${i} of ${N}`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log("→ out/silent.mp4   then:  ffmpeg -i out/silent.mp4 -i score.wav -c:v copy -c:a aac -b:a 192k -shortest out/ep1.mp4");
