// The frame-exact renderer from the methodology: seek(t) -> screenshot -> ffmpeg.
export const RENDER_MJS = `// render.mjs   usage: node render.mjs dist/index.html
// npm i -D playwright && npx playwright install chromium   (and ffmpeg on your PATH)
// The page exposes window.seek(t) (every frame is a pure function of time) and window.getScoreWav().
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [file = 'dist/index.html'] = process.argv.slice(2);
const FPS = 24, SECS = 120, N = FPS * SECS, W = 1920, H = 804;
mkdirSync('out', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
await page.evaluate(async () => { await document.fonts.ready; });

const ff = spawn('ffmpeg', [
  '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'out/silent.mp4',
], { stdio: ['pipe', 'inherit', 'inherit'] });

const canvas = await page.$('canvas');
for (let i = 0; i < N; i++) {              // frames 0..N-1 only
  await page.evaluate((t) => window.seek(t), i / FPS);
  const png = await canvas.screenshot({ type: 'png' });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % FPS === 0) console.log('frame', i, 'of', N);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));

// the score, synthesised in the page
const b64 = await page.evaluate(() => window.getScoreWav());
writeFileSync('out/audio.wav', Buffer.from(b64, 'base64'));
await browser.close();

spawn('ffmpeg', ['-y', '-i', 'out/silent.mp4', '-i', 'out/audio.wav', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', 'out/starfall-station.mp4'], { stdio: 'inherit' });
`;
