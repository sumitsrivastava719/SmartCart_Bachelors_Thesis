import { WebSocketServer } from "ws";
import http from "http";
import express from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import cors from "cors";
import os from "os";
import { createInterface } from "readline";

// ── Environment ─────────────────────────────────────
dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;
const __dirname = path.resolve();

// ── HTTP + WebSocket Server ─────────────────────────
const server = http.createServer(app);
const wsServer = new WebSocketServer({ server });

// We keep two groups of WebSocket clients on the SAME server:
//   • the browser (the React app)  → connects on path "/ws"
//   • the ESP32 device(s)          → connect on any other path
const browserClients = new Set();
const esp32Clients = new Set();

function isEsp32Connected() {
  for (const client of esp32Clients) {
    if (client.readyState === client.OPEN) return true;
  }
  return false;
}

// Send a JSON payload to every connected browser.
function sendToBrowsers(payload) {
  const message = JSON.stringify(payload);
  for (const client of browserClients) {
    if (client.readyState === client.OPEN) client.send(message);
  }
}

// Send a JSON payload to every connected ESP32. Returns how
// many devices actually received it.
function sendToEsp32(payload) {
  const message = JSON.stringify(payload);
  let delivered = 0;
  for (const client of esp32Clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
      delivered++;
    }
  }
  return delivered;
}

// Tell every browser whether an ESP32 is currently online.
function broadcastEsp32Status() {
  sendToBrowsers({ type: "esp32:status", connected: isEsp32Connected() });
}

// ── WebSocket Events ────────────────────────────────
wsServer.on("connection", (ws, request) => {
  const url = request?.url || "/";
  const isBrowser = url.startsWith("/ws");

  if (isBrowser) {
    // ── Browser (React app) ──────────────────────────
    browserClients.add(ws);
    console.log(`[Browser] Connected. Total browsers: ${browserClients.size}`);

    // Send the current ESP32 status straight away.
    ws.send(
      JSON.stringify({ type: "esp32:status", connected: isEsp32Connected() }),
    );

    ws.on("message", (data) => {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        console.error("[Browser] Invalid message:", data.toString());
        return;
      }

      // Cart actions from the browser get forwarded to the ESP32.
      if (
        msg.type === "cart:add" ||
        msg.type === "cart:update" ||
        msg.type === "cart:remove"
      ) {
        const payload = { ...msg, timestamp: Date.now() };
        const delivered = sendToEsp32(payload);
        console.log(
          `[Browser → ESP32] ${msg.type} (delivered to ${delivered} device(s))`,
          payload,
        );
      } else if (msg.type === "esp:command") {
        // A command (e.g. "e") sent to the ESP32 as JSON: { "command": "e" }
        const command = String(msg.command ?? "");
        const delivered = sendToEsp32({ command });
        console.log(
          `[Browser → ESP32] command "${command}" (delivered to ${delivered} device(s))`,
        );
      } else {
        console.log("[Browser] →", msg);
      }
    });

    ws.on("close", () => {
      browserClients.delete(ws);
      console.log(
        `[Browser] Disconnected. Total browsers: ${browserClients.size}`,
      );
    });

    ws.on("error", (err) => {
      console.error("[Browser] Socket error:", err.message);
      browserClients.delete(ws);
    });

    return;
  }

  // ── ESP32 device ───────────────────────────────────
  esp32Clients.add(ws);
  console.log(
    `[ESP32] Connected (${request?.socket?.remoteAddress || "unknown"}). Total devices: ${esp32Clients.size}`,
  );
  broadcastEsp32Status();

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      msg = { raw: data.toString() };
    }
    console.log("[ESP32] →", msg);

    // The ESP32 acknowledges each cart action it processed. Relay
    // that ack to the browsers so the UI can confirm (or revert).
    if (msg.type === "ack") {
      sendToBrowsers({
        type: "cart:ack",
        requestId: msg.requestId,
        success: msg.success !== false, // default to true unless explicitly false
        error: msg.error,
      });
      return;
    }

    // Relay anything else the ESP32 reports back to the browsers.
    sendToBrowsers({ type: "esp32:message", data: msg });
  });

  ws.on("close", () => {
    esp32Clients.delete(ws);
    console.log(`[ESP32] Disconnected. Total devices: ${esp32Clients.size}`);
    broadcastEsp32Status();
  });

  ws.on("error", (err) => {
    console.error("[ESP32] Socket error:", err.message);
    esp32Clients.delete(ws);
    broadcastEsp32Status();
  });
});

// ── Middleware ──────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors({ origin: "*" }));

// ── Dev Dashboard ───────────────────────────────────
try {
  const devApi = await import("./.4bnode/dev-api.js");
  app.use("/_dev", devApi.default);
} catch (err) {
  // ignore if file doesn't exist
}

// ── Static Files ────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ── Helpers ─────────────────────────────────────────
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }

  return null;
}

function updateEnvPort(newPort) {
  try {
    if (fs.existsSync(".env")) {
      let content = fs.readFileSync(".env", "utf8");

      if (/^PORT=.*/m.test(content)) {
        content = content.replace(/^PORT=.*/m, `PORT=${newPort}`);
      } else {
        content += `\nPORT=${newPort}`;
      }

      fs.writeFileSync(".env", content, "utf8");
    }
  } catch (err) {
    console.error("Failed to update .env:", err);
  }
}

function askPort(busyPort) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(`\nPort ${busyPort} is already in use.`);

    rl.question(
      `Press Enter to use ${busyPort + 1}, or type a port number: `,
      (answer) => {
        rl.close();

        const customPort = parseInt(answer.trim(), 10);

        if (!isNaN(customPort) && customPort > 0) {
          resolve(customPort);
        } else {
          resolve(busyPort + 1);
        }
      },
    );
  });
}

// ── Routes ──────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("SmartCart backend is running!");
});

// ── Start Server ────────────────────────────────────
async function startServer(tryPort) {
  const listener = server.listen(tryPort);

  listener.on("listening", () => {
    const localIp = getLocalNetworkIp();

    console.log(`App is running on http://localhost:${tryPort}`);
    console.log(`Browser WebSocket endpoint: ws://localhost:${tryPort}/ws`);
    console.log(
      `ESP32 WebSocket endpoint:   ws://localhost:${tryPort}  (root path)`,
    );

    if (localIp) {
      console.log(
        `App is also accessible on your local network at http://${localIp}:${tryPort}`,
      );
      console.log(`ESP32 should connect to: ws://${localIp}:${tryPort}`);
    }

    if (tryPort !== port) {
      updateEnvPort(tryPort);
      console.log(`Updated .env with PORT=${tryPort}`);
    }
  });

  listener.on("error", async (err) => {
    if (err.code === "EADDRINUSE") {
      if (!process.stdin.isTTY) {
        console.error(
          `Port ${tryPort} is already in use and no terminal is available.`,
        );
        process.exit(1);
      }

      const nextPort = await askPort(tryPort);
      startServer(nextPort);
    } else {
      console.error("Server Error:", err);
      process.exit(1);
    }
  });
}

// ── Start Everything ────────────────────────────────
startServer(port);
