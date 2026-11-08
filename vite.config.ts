import path from "path";
import fs from "fs";
import os from "os";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function mp4ExportPlugin(): Plugin {
  return {
    name: "mp4-export-server",
    configureServer(server) {
      // POST endpoint to transcode recorded webm/mp4 directly to a pristine MP4 in Downloads
      server.middlewares.use("/api/export-mp4", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }

        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        const episode = url.searchParams.get("episode") || "I";
        const filename = `Star_Catcher_Episode_${episode}.mp4`;
        const tempRaw = path.resolve(os.tmpdir(), `star_catcher_raw_${Date.now()}.bin`);
        const tempOut = path.resolve(os.tmpdir(), `star_catcher_out_${Date.now()}.mp4`);
        const targetMp4 = path.resolve(os.homedir(), "Downloads", filename);

        const fileStream = fs.createWriteStream(tempRaw);
        req.pipe(fileStream);

        fileStream.on("finish", () => {
          const ffmpeg = "/Users/brightech/.gemini/antigravity/bin/ffmpeg";
          const args = [
            "-y",
            "-i", tempRaw,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "17",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "256k",
            "-movflags", "+faststart",
            tempOut
          ];

          const proc = spawn(ffmpeg, args);
          let errLog = "";
          proc.stderr.on("data", (d) => { errLog += d.toString(); });

          proc.on("close", (code) => {
            fs.unlink(tempRaw, () => {});
            if (code === 0) {
              try {
                fs.copyFileSync(tempOut, targetMp4);
                fs.unlinkSync(tempOut);
              } catch (copyErr) {
                console.error("Copy error:", copyErr);
              }
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: true, filename, path: targetMp4 }));
            } else {
              fs.unlink(tempOut, () => {});
              console.error("FFmpeg error:", errLog);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: false, error: "ffmpeg transcoding failed" }));
            }
          });
        });
      });

      // GET endpoint to download the transcoded MP4 directly
      server.middlewares.use("/api/download-mp4", (req, res) => {
        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        const episode = url.searchParams.get("episode") || "I";
        const filename = `Star_Catcher_Episode_${episode}.mp4`;
        const targetMp4 = path.resolve(os.homedir(), "Downloads", filename);

        if (fs.existsSync(targetMp4)) {
          const stat = fs.statSync(targetMp4);
          res.setHeader("Content-Type", "video/mp4");
          res.setHeader("Content-Length", stat.size);
          res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
          fs.createReadStream(targetMp4).pipe(res);
        } else {
          res.statusCode = 404;
          res.end("File not found. Please record the episode first.");
        }
      });

      // POST endpoint to stream video chunks directly to disk
      server.middlewares.use("/api/save-chunk", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        const ep = url.searchParams.get("ep") || "ep1";
        const reset = url.searchParams.get("reset") === "1";
        const filePath = path.resolve(os.tmpdir(), `render_${ep}.h264`);

        if (reset && fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch {}
        }

        const outStream = fs.createWriteStream(filePath, { flags: reset ? "w" : "a" });
        req.pipe(outStream);
        outStream.on("finish", () => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true }));
        });
      });

      // POST endpoint to finalize an episode: mux H.264 stream with Suno Master Audio
      server.middlewares.use("/api/finalize-episode", (req, res) => {
        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        const ep = url.searchParams.get("ep") || "ep1";
        const roman = url.searchParams.get("roman") || "I";
        const num = ep.replace("ep", "");
        const h264Path = path.resolve(os.tmpdir(), `render_${ep}.h264`);
        const audioPath = path.resolve(__dirname, `public/audio/${ep}/suno_episode${num}_master.mp3`);
        const targetMp4 = path.resolve(os.homedir(), "Downloads", `Star_Catcher_Episode_${roman}.mp4`);
        const tempOut = path.resolve(os.tmpdir(), `final_${ep}_${Date.now()}.mp4`);
        const ffmpeg = "/Users/brightech/.gemini/antigravity/bin/ffmpeg";

        const args = [
          "-y",
          "-r", "30",
          "-i", h264Path,
          "-i", audioPath,
          "-c:v", "copy",
          "-c:a", "aac",
          "-b:a", "256k",
          "-shortest",
          "-movflags", "+faststart",
          tempOut
        ];

        const proc = spawn(ffmpeg, args);
        let errLog = "";
        proc.stderr.on("data", (d) => { errLog += d.toString(); });
        proc.on("close", (code) => {
          if (code === 0) {
            try {
              fs.copyFileSync(tempOut, targetMp4);
              fs.unlinkSync(tempOut);
              fs.unlinkSync(h264Path);
            } catch (e) {
              console.error("Finalize file move error:", e);
            }
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, filename: `Star_Catcher_Episode_${roman}.mp4`, path: targetMp4 }));
          } else {
            console.error("FFmpeg finalize error:", errLog);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: errLog }));
          }
        });
      });

      // POST endpoint to stitch all 4 episodes together
      server.middlewares.use("/api/stitch-all", (req, res) => {
        const downloads = path.resolve(os.homedir(), "Downloads");
        const listFile = path.resolve(os.tmpdir(), "stitch_list.txt");
        const outComplete = path.resolve(downloads, "Star_Catcher_The_Complete_Series.mp4");
        const tempComplete = path.resolve(os.tmpdir(), `complete_${Date.now()}.mp4`);
        const episodes = ["I", "II", "III", "IV"];

        const listContent = episodes
          .map((r) => `file '${path.resolve(downloads, `Star_Catcher_Episode_${r}.mp4`)}'`)
          .join("\n");
        fs.writeFileSync(listFile, listContent);

        const ffmpeg = "/Users/brightech/.gemini/antigravity/bin/ffmpeg";
        const args = [
          "-y",
          "-f", "concat",
          "-safe", "0",
          "-i", listFile,
          "-c", "copy",
          "-movflags", "+faststart",
          tempComplete
        ];

        const proc = spawn(ffmpeg, args);
        let errLog = "";
        proc.stderr.on("data", (d) => { errLog += d.toString(); });
        proc.on("close", (code) => {
          fs.unlink(listFile, () => {});
          if (code === 0) {
            try {
              fs.copyFileSync(tempComplete, outComplete);
              fs.unlinkSync(tempComplete);
            } catch (e) {
              console.error("Stitch move error:", e);
            }
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, filename: "Star_Catcher_The_Complete_Series.mp4", path: outComplete }));
          } else {
            console.error("Stitch error:", errLog);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: errLog }));
          }
        });
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), mp4ExportPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
