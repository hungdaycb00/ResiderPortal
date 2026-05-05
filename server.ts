import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createServer } from "http";
import net from "net";
import { Readable } from "stream";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Find an available port starting from a given port, skipping port 3000
 */
async function findAvailablePort(startPort: number): Promise<number> {
  let port = startPort;

  while (port < 65535) {
    if (port === 3000) {
      port++;
      continue;
    }
    const available = await checkPort(port);
    if (available) {
      return port;
    }
    port++;
  }

  throw new Error("No available ports found");
}

/**
 * Check if a port is available
 */
function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      resolve(false);
    });
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port, "0.0.0.0");
  });
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);


  // Use PORT from environment variable or find available port (skip port 3000)
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : await findAvailablePort(3002);

  // Global CORS middleware
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Target-Url, X-Device-Id, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // app.use(express.json({ limit: '50mb' })); // Moved below proxy to avoid stream consumption
  // app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Body Parsing (only for non-proxy routes or after proxy check)
  const jsonParser = express.json({ limit: '50mb' });
  const urlencodedParser = express.urlencoded({ limit: '50mb', extended: true });

  // WebSocket Proxy logic (Forward /ws to port 3004, /peerjs to port 3001)
  httpServer.on("upgrade", (req, socket, head) => {
    const url = req.url || "";
    let targetPort = 0;

    if (url.startsWith("/ws") || url.startsWith("/socket.io")) {
      targetPort = 3004; // uWS Server Port
    } else if (url.startsWith("/peerjs")) {
      targetPort = 3001; // Backend Express/PeerJS Port
    }

    if (targetPort > 0) {
      console.log(`[Gateway] Proxying WebSocket upgrade for ${url} to port ${targetPort}`);
      
      const proxy = net.connect(targetPort, "localhost", () => {
        proxy.write(`GET ${url} HTTP/1.1\r\n`);
        // Forward headers
        Object.entries(req.headers).forEach(([key, value]) => {
          proxy.write(`${key}: ${value}\r\n`);
        });
        proxy.write("\r\n");
        proxy.write(head);
        
        socket.pipe(proxy).pipe(socket);
      });
      
      proxy.on("error", (err) => {
        console.error(`[Gateway WebSocket Proxy Error for ${url}]:`, err.message);
        socket.destroy();
      });
    } else {
      socket.destroy();
    }
  });

  // Proxy endpoint to bypass CORS for the external API with fallback to localhost:3000
  const FALLBACK_API_URL = 'http://localhost:3000';
  
  // Silent favicon handler to clean up logs
  app.get("/favicon.ico", (req, res) => res.status(204).end());

  // Note: NO body-parser middleware before these proxy routes to keep 'req' stream alive for file uploads
  app.all("/api/proxy*", async (req, res) => {
    let externalUrl = (req.headers["x-target-url"] as string) || process.env.VITE_EXTERNAL_API_URL || FALLBACK_API_URL;

    if (!externalUrl || externalUrl.trim() === "") {
      return res.status(500).json({
        error: "Chưa cấu hình Server URL",
        details: "Vui lòng nhập Cloudflare Tunnel URL trong phần cài đặt kết nối."
      });
    }

    if (!externalUrl.startsWith("http")) {
      externalUrl = "https://" + externalUrl;
    }

    const baseUrl = externalUrl.endsWith("/") ? externalUrl.slice(0, -1) : externalUrl;
    let endpoint = req.path.substring("/api/proxy".length);
    if (endpoint.startsWith("/")) endpoint = endpoint.slice(1);
    const query = new URLSearchParams(req.query as any).toString();
    const targetUrl = `${baseUrl}/${endpoint}${query ? '?' + query : ''}`;
    
    console.log(`[Proxy] Routing ${req.method} to: ${targetUrl}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const options: RequestInit = {
        method: req.method,
        headers: new Headers(),
        signal: controller.signal,
      };

      const blockedHeaders = ['host', 'connection', 'transfer-encoding', 'x-target-url', 'cookie', 'content-length'];
      Object.entries(req.headers).forEach(([key, value]) => {
        if (!blockedHeaders.includes(key.toLowerCase()) && value) {
          (options.headers as Headers).set(key, String(value));
        }
      });

      if (["POST", "PUT", "PATCH"].includes(req.method)) {
        options.body = req as any;
        (options as any).duplex = 'half';
      }

      const response = await fetch(targetUrl, options);
      clearTimeout(timeoutId);

      response.headers.forEach((value, key) => {
        if (!['content-encoding', 'transfer-encoding', 'connection', 'content-length'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });

      const contentType = response.headers.get("content-type");
      
      if (contentType && contentType.includes("text/event-stream")) {
        // SSE: Không được dùng arrayBuffer/json vì nó sẽ đợi cho đến khi đóng kết nối.
        // Phải pipe stream trực tiếp.
        if (response.body) {
          Readable.fromWeb(response.body as any).pipe(res);
        } else {
          res.status(response.status).end();
        }
        return;
      }

      if (contentType && contentType.includes("application/json")) {
        const data = await response.json().catch(() => ({}));
        return res.status(response.status).json(data);
      } else {
        const arrayBuffer = await response.arrayBuffer();
        return res.status(response.status).send(Buffer.from(arrayBuffer));
      }
    } catch (error: any) {
      console.error("[Proxy Error]:", error.message);
      res.status(502).json({ error: "External Proxy Failed", details: error.message });
    }
  });

  // --- GATEWAY API ROUTING (Forward all other /api/* to localhost:3001) ---
  app.all("/api/*", async (req, res, next) => {
    if (req.path.startsWith("/api/proxy")) return next();

    const backendUrl = process.env.VITE_EXTERNAL_API_URL || "http://localhost:3001";
    const baseUrl = backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;
    const targetUrl = `${baseUrl}${req.originalUrl}`;
    
    console.log(`[Gateway] Routing ${req.method} to Backend: ${targetUrl}`);
    
    try {
      const isStream = req.path.includes("stream") || req.headers["accept"] === "text/event-stream";
      const controller = new AbortController();
      const timeoutId = !isStream ? setTimeout(() => controller.abort(), 60000) : null;

      const options: RequestInit = {
        method: req.method,
        headers: new Headers(),
        signal: controller.signal,
      };

      Object.entries(req.headers).forEach(([key, value]) => {
        if (!['host', 'connection', 'transfer-encoding', 'content-length'].includes(key.toLowerCase()) && value) {
          (options.headers as Headers).set(key, String(value));
        }
      });

      if (["POST", "PUT", "PATCH"].includes(req.method)) {
        options.body = req as any;
        (options as any).duplex = 'half';
      }

      const response = await fetch(targetUrl, options);
      clearTimeout(timeoutId);
      
      response.headers.forEach((value, key) => {
        if (!['content-encoding', 'transfer-encoding', 'connection', 'content-length'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });

      const contentType = response.headers.get("content-type");
      
      if (contentType && contentType.includes("text/event-stream")) {
        // SSE: Pipe trực tiếp
        if (response.body) {
          Readable.fromWeb(response.body as any).pipe(res);
        } else {
          res.status(response.status).end();
        }
        return;
      }

      if (contentType && contentType.includes("application/json")) {
        const data = await response.json().catch(() => ({}));
        return res.status(response.status).json(data);
      } else {
        const arrayBuffer = await response.arrayBuffer();
        return res.status(response.status).send(Buffer.from(arrayBuffer));
      }
    } catch (error: any) {
      console.error("[Gateway Error]:", error.message);
      res.status(502).json({ error: "Backend Unreachable", details: error.message });
    }
  });

  // --- GAMES PROXY (Forward /games/* to localhost:3001) ---
  app.get("/games/*", async (req, res) => {
    const backendUrl = process.env.VITE_EXTERNAL_API_URL || "http://localhost:3001";
    const baseUrl = backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;
    const targetUrl = `${baseUrl}${req.originalUrl}`;
    
    try {
      const response = await fetch(targetUrl, {
        headers: {
          ...req.headers as any,
          host: new URL(baseUrl).host,
        }
      });

      // Forward headers
      response.headers.forEach((value, key) => {
        if (!['content-encoding', 'transfer-encoding', 'connection', 'content-length'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });
      
      if (response.body) {
        Readable.fromWeb(response.body as any).pipe(res);
      } else {
        res.status(response.status).end();
      }
    } catch (error: any) {
      console.error("[Games Proxy Error]:", error.message);
      res.status(502).send("Game file unreachable");
    }
  });

  // --- SAU KHI QUA PROXY, MỚI DÙNG BODY PARSER CHO CÁC ROUTE KHÁC ---
  app.use(jsonParser);
  app.use(urlencodedParser);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        allowedHosts: true 
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const assetsPath = path.join(distPath, "assets");

    app.use("/assets", express.static(assetsPath, {
      immutable: true,
      maxAge: "1y",
      setHeaders: (res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
      },
    }));

    app.use(express.static(distPath, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        }
      },
    }));

    app.get("*", (req, res) => {
      if (req.path.startsWith("/assets/")) {
        return res.status(404).type("text/plain").send("Asset not found.");
      }
      res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
