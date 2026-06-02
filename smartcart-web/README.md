# SmartCart – Web Application

A smart shopping cart system with barcode scanning, real-time ESP32 integration, and Razorpay payments.

## Project Structure

```
smartcart-web/
├── frontend/     # React (Vite) frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/      # Express + Socket.IO backend
│   ├── src/
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js v18+
- npm

### 1. Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### 2. Start Development Servers

**Terminal 1 – Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 – Frontend:**
```bash
cd frontend
npm run dev
```

- Frontend runs on: `http://localhost:5173`
- Backend runs on: `http://localhost:3001`
- Frontend proxies `/api/*` calls to the backend automatically.

## Architecture

```
┌──────────────┐    REST API     ┌───────────────┐   Socket.IO    ┌──────────┐
│   Frontend   │ ──────────────▶ │    Backend    │ ─────────────▶ │  ESP32   │
│   (React)    │ ◀────────────── │   (Express)   │ ◀───────────── │  Device  │
└──────────────┘   JSON resp     └───────────────┘    ack/nack    └──────────┘
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cart/scan` | Add scanned product to ESP32 cart |
| PUT | `/api/cart/update` | Update product quantity on ESP32 |
| DELETE | `/api/cart/remove` | Remove product from ESP32 cart |
| GET | `/api/esp32/status` | Check ESP32 connection status |

### ESP32 Socket.IO Events

The ESP32 connects to the backend on the `/esp32` namespace. Events:

| Event | Direction | Payload |
|-------|-----------|---------|
| `cart:add` | Backend → ESP32 | `{ productId, barcode, name, price, quantity }` |
| `cart:update` | Backend → ESP32 | `{ productId, barcode, quantity, action }` |
| `cart:remove` | Backend → ESP32 | `{ productId, barcode }` |

Each event expects an **acknowledgment callback** from the ESP32:
```js
// Success
callback({ success: true })

// Failure
callback({ success: false, error: "reason" })
```

## Environment Variables

### Backend (`backend/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin |
| `ESP32_ACK_TIMEOUT` | `5000` | Timeout (ms) for ESP32 acknowledgment |
