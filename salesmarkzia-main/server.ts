import "./server/env";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import { createApiRouter } from "./server/routes";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

  app.set("trust proxy", 1);
  app.use(express.json({ limit: "50mb" }));
  app.use(cookieParser(process.env.SESSION_SECRET));

  // ─── API ──────────────────────────────────────────────────────────
  app.use("/api", createApiRouter());
  // Unmatched /api/* paths return JSON (never the SPA HTML shell).
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  // ─── Frontend (SPA) ───────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
