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
            targetMp4
          ];

          const proc = spawn(ffmpeg, args);
          let errLog = "";
          proc.stderr.on("data", (d) => { errLog += d.toString(); });

          proc.on("close", (code) => {
            fs.unlink(tempRaw, () => {});
            if (code === 0) {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: true, filename, path: targetMp4 }));
            } else {
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
