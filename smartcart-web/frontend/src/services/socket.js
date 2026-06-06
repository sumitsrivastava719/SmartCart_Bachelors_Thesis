/**
 * Raw WebSocket client for the SmartCart backend.
 *
 * The browser keeps a single WebSocket open to the backend on the
 * "/ws" path. It is used for everything:
 *   • sending cart actions (scan / +/- / remove) to the backend,
 *     which forwards them to the ESP32
 *   • receiving the live "esp32:status" updates
 *   • receiving any messages the ESP32 reports back ("esp32:message")
 *
 * A tiny event-emitter API (on/off) mimics the previous interface so
 * the rest of the app barely changes. Auto-reconnects if the link drops.
 */

const WS_PATH = '/ws';
const RECONNECT_DELAY = 2000;

function buildUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}${WS_PATH}`;
}

const listeners = new Map(); // eventType -> Set<callback>
let ws = null;
let reconnectTimer = null;
let esp32Connected = false;

function emit(type, payload) {
  const set = listeners.get(type);
  if (set) set.forEach((cb) => cb(payload));
}

function connect() {
  try {
    ws = new WebSocket(buildUrl());
  } catch (err) {
    console.error('[WS] Failed to create socket:', err);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    console.log('[WS] Connected to backend');
    emit('connect');
  };

  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      console.warn('[WS] Non-JSON message:', event.data);
      return;
    }

    if (msg.type === 'esp32:status') {
      esp32Connected = !!msg.connected;
    }

    if (msg.type) emit(msg.type, msg);
  };

  ws.onclose = () => {
    console.log('[WS] Disconnected from backend');
    esp32Connected = false;
    // Let the UI know the ESP32 is no longer reachable.
    emit('esp32:status', { type: 'esp32:status', connected: false });
    emit('disconnect');
    scheduleReconnect();
  };

  ws.onerror = () => {
    // The 'close' handler will fire next and trigger the reconnect.
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_DELAY);
}

connect();

const socket = {
  /** Subscribe to a message type, e.g. 'esp32:status'. */
  on(type, cb) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(cb);
  },

  /** Unsubscribe a previously registered callback. */
  off(type, cb) {
    listeners.get(type)?.delete(cb);
  },

  /** Send a JSON object to the backend. Returns true if it went out. */
  send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
      return true;
    }
    return false;
  },

  /** Is the WebSocket to the backend open? */
  isConnected() {
    return !!ws && ws.readyState === WebSocket.OPEN;
  },

  /** Last known ESP32 connection status. */
  isEsp32Connected() {
    return esp32Connected;
  },
};

export default socket;
