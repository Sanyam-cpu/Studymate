/**
 * Local development server – mimics Vercel's routing for testing.
 * NOT part of the deployment. Run with: node dev-server.js
 * 
 * This serves static files from the project root and routes
 * POST /api/chat to the serverless function in api/chat.js.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import { fileURLToPath } from "node:url";

// Prioritize IPv4 to avoid Windows IPv6 connection timeouts with Google APIs
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

// Load .env file manually for local development
const __dirname = path.dirname(fileURLToPath(import.meta.url));
try {
  const envFile = fs.readFileSync(path.join(__dirname, ".env"), "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        const val = trimmed.substring(eqIndex + 1).trim();
        process.env[key] = val;
      }
    }
  }
} catch { /* no .env file — that's ok */ }

// Import the serverless function
const chatHandler = (await import("./api/chat.js")).default;

// MIME types for static files
const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".md": "text/markdown",
};

const PORT = 3000;

const server = http.createServer(async (req, res) => {
  // Route API requests to the serverless function
  if (req.url === "/api/chat") {
    // Parse JSON body
    let body = "";
    for await (const chunk of req) body += chunk;
    
    try {
      req.body = JSON.parse(body || "{}");
    } catch {
      req.body = {};
    }
    req.method = req.method;

    // Create a mock Vercel response object
    const mockRes = {
      statusCode: 200,
      headers: {},
      status(code) { this.statusCode = code; return this; },
      json(data) {
        res.writeHead(this.statusCode, {
          "Content-Type": "application/json",
          ...this.headers,
        });
        res.end(JSON.stringify(data));
      },
      setHeader(k, v) { this.headers[k] = v; },
    };

    try {
      await chatHandler(req, mockRes);
    } catch (err) {
      console.error("Handler error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
    return;
  }

  // Serve static files
  let filePath = req.url === "/" ? "/index.html" : req.url;
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  const mime = MIME[ext] || "application/octet-stream";

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": mime });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`\n  StudyMate dev server running at http://localhost:${PORT}\n`);
});
