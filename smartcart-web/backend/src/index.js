import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const ESP32_ACK_TIMEOUT = parseInt(process.env.ESP32_ACK_TIMEOUT, 10) || 5000;

// ─── Middleware ──────────────────────────────────────────────────────
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// ─── Socket.IO Setup ────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  allowEIO3: true,        // accept both EIO=3 and EIO=4 clients (ESP32 library)
  pingTimeout: 60000,     // 60s — gives slow WiFi devices time to respond
  pingInterval: 25000,    // 25s between server pings
});

// Track connected ESP32 device and in-flight requests
let esp32Socket = null;
const pendingRequests = new Map(); // reqId → { resolve, timeout }

// ─── Single namespace for both frontend and ESP32 ───────────────────
// The SocketIOclient Arduino library cannot join custom namespaces via
// begin() — it always connects to "/". ESP32 identifies itself by
// emitting "esp32:identify" right after connecting.
io.on('connection', (socket) => {
  // Optimistically treat every new connection as a frontend client and
  // send the current ESP32 status so the UI is immediately up-to-date.
  socket.emit('esp32:status', { connected: esp32Socket !== null });

  // ── ESP32 identification ────────────────────────────────────────────
  socket.on('esp32:identify', () => {
    console.log(`✅ ESP32 connected: ${socket.id}`);
    esp32Socket = socket;
    io.emit('esp32:status', { connected: true });

    // ESP32 responds to requests via "esp32:response" events (the
    // SocketIOclient library strips ack IDs, so we use a _reqId field).
    socket.on('esp32:response', ({ success, error, _reqId }) => {
      const pending = pendingRequests.get(_reqId);
      if (!pending) return;
      clearTimeout(pending.timeout);
      pendingRequests.delete(_reqId);
      pending.resolve({ success, error });
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ ESP32 disconnected: ${reason}`);
      if (esp32Socket?.id !== socket.id) return;
      esp32Socket = null;
      // Fail any in-flight requests immediately
      for (const [reqId, { resolve, timeout }] of pendingRequests) {
        clearTimeout(timeout);
        resolve({ success: false, error: 'ESP32 disconnected.' });
        pendingRequests.delete(reqId);
      }
      io.emit('esp32:status', { connected: false });
    });
  });

  // ── Frontend disconnect log ─────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    if (esp32Socket?.id !== socket.id) {
      console.log(`🌐 Frontend disconnected: ${socket.id} — ${reason}`);
    }
  });

  console.log(`🔌 Client connected: ${socket.id}`);
});

// ─── Helper: Send event to ESP32 and wait for response ──────────────
function sendToEsp32(event, data) {
  return new Promise((resolve) => {
    if (!esp32Socket) {
      resolve({
        success: false,
        error: 'ESP32 is not connected. Please check the device.',
      });
      return;
    }

    // Unique ID so we can match the ESP32's "esp32:response" back to
    // this specific request (the Arduino library can't send ack packets).
    const reqId = Date.now().toString(36) + Math.random().toString(36).slice(2);

    const timeout = setTimeout(() => {
      pendingRequests.delete(reqId);
      resolve({
        success: false,
        error: 'ESP32 did not respond in time. Please try again.',
      });
    }, ESP32_ACK_TIMEOUT);

    pendingRequests.set(reqId, { resolve, timeout });
    esp32Socket.emit(event, { ...data, _reqId: reqId });
  });
}

// ─── REST API Routes ────────────────────────────────────────────────

/**
 * POST /api/cart/scan
 * Called when user scans a new product barcode.
 * Body: { productId, barcode, name, price, quantity }
 */
app.post('/api/cart/scan', async (req, res) => {
  const { productId, barcode, name, price, quantity } = req.body;

  if (!barcode) {
    return res.status(400).json({ success: false, error: 'Barcode is required.' });
  }

  console.log(`📦 Scan request: ${name} (${barcode}) - ProductID: ${productId}`);

  const result = await sendToEsp32('cart:add', {
    productId,
    barcode,
    name,
    price,
    quantity: quantity || 1,
  });

  const statusCode = result.success ? 200 : 502;
  res.status(statusCode).json(result);
});

/**
 * PUT /api/cart/update
 * Called when user changes product quantity.
 * Body: { productId, barcode, quantity, action: 'increase' | 'decrease' }
 */
app.put('/api/cart/update', async (req, res) => {
  const { productId, barcode, quantity, action } = req.body;

  if (!barcode || quantity == null) {
    return res.status(400).json({ success: false, error: 'Barcode and quantity are required.' });
  }

  console.log(`🔄 Update request: ${barcode} → qty ${quantity} (${action})`);

  const result = await sendToEsp32('cart:update', {
    productId,
    barcode,
    quantity,
    action,
  });

  const statusCode = result.success ? 200 : 502;
  res.status(statusCode).json(result);
});

/**
 * DELETE /api/cart/remove
 * Called when user removes a product from cart.
 * Body: { productId, barcode }
 */
app.delete('/api/cart/remove', async (req, res) => {
  const { productId, barcode } = req.body;

  if (!barcode) {
    return res.status(400).json({ success: false, error: 'Barcode is required.' });
  }

  console.log(`🗑️ Remove request: ${barcode} (ProductID: ${productId})`);

  const result = await sendToEsp32('cart:remove', {
    productId,
    barcode,
  });

  const statusCode = result.success ? 200 : 502;
  res.status(statusCode).json(result);
});

/**
 * GET /api/esp32/status
 * Returns whether an ESP32 device is currently connected.
 */
app.get('/api/esp32/status', (req, res) => {
  res.json({
    connected: esp32Socket !== null,
    socketId: esp32Socket?.id || null,
  });
});

// ─── Start Server ───────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🚀 SmartCart Backend running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready — ESP32 connects to default namespace and sends esp32:identify`);
  console.log(`🌐 CORS allowed origin: ${FRONTEND_URL}\n`);
});
