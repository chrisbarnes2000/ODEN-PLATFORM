import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Database from "better-sqlite3";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("oden.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT,
    data TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/project/:id", (req, res) => {
    const row = db.prepare("SELECT data FROM projects WHERE id = ?").get(req.params.id) as { data: string } | undefined;
    if (row) {
      res.json(JSON.parse(row.data));
    } else {
      res.status(404).json({ error: "Project not found" });
    }
  });

  app.post("/api/project/:id", (req, res) => {
    const { id } = req.params;
    const data = JSON.stringify(req.body);
    db.prepare("INSERT OR REPLACE INTO projects (id, name, data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)")
      .run(id, req.body.caseName || "Untitled Investigation", data);
    res.json({ status: "saved" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
