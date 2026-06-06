/**
 * Cart actions over WebSocket, with ESP32 acknowledgement.
 *
 * Flow:
 *   1. Browser sends a cart action with a unique `requestId`.
 *   2. Backend forwards it to the ESP32 (raw WebSocket).
 *   3. ESP32 processes it and replies { type:"ack", requestId, success }.
 *   4. Backend relays that to the browser as a "cart:ack" message.
 *   5. The Promise below resolves with { success } once the matching
 *      ack arrives — so App.jsx only keeps the item if the ESP32 said OK.
 *
 * If the socket is down, or no ack arrives in time, we resolve with
 * success:false so the UI reverts and shows an error.
 */

import socket from './socket';

const ACK_TIMEOUT = 8000; // ms to wait for the ESP32 to acknowledge
const pending = new Map(); // requestId -> { resolve, timer }
let counter = 0;

function nextRequestId() {
  counter += 1;
  return `req-${Date.now()}-${counter}`;
}

// Resolve the matching pending request when the ESP32 acknowledges.
socket.on('cart:ack', (msg) => {
  const entry = pending.get(msg.requestId);
  if (!entry) return;
  clearTimeout(entry.timer);
  pending.delete(msg.requestId);
  entry.resolve({
    success: !!msg.success,
    error: msg.success ? undefined : msg.error || 'ESP32 rejected the action.',
  });
});

function sendAction(message) {
  const requestId = nextRequestId();
  const sent = socket.send({ ...message, requestId });

  if (!sent) {
    return Promise.resolve({
      success: false,
      error: 'Not connected to backend. Please wait and try again.',
    });
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      resolve({
        success: false,
        error: 'No response from ESP32 (timed out). Is the device on?',
      });
    }, ACK_TIMEOUT);

    pending.set(requestId, { resolve, timer });
  });
}

/**
 * Notify backend that a product was scanned / added to cart.
 * @param {{ productId: string, barcode: string, name: string, price: number, quantity: number }} data
 */
export function scanProduct(data) {
  return sendAction({
    type: 'cart:add',
    productId: data.productId || 'N/A',
    barcode: data.barcode || '',
    name: data.name || '',
    price: data.price ?? 0,
    quantity: data.quantity ?? 1,
  });
}

/**
 * Notify backend that a product quantity changed (+ / -).
 * @param {{ productId: string, barcode: string, quantity: number, action: 'increase' | 'decrease' }} data
 */
export function updateQuantity(data) {
  return sendAction({
    type: 'cart:update',
    productId: data.productId || 'N/A',
    barcode: data.barcode || '',
    quantity: data.quantity ?? 1,
    action: data.action || 'set',
  });
}

/**
 * Notify backend that a product was removed from cart.
 * @param {{ productId: string, barcode: string }} data
 */
export function removeProduct(data) {
  return sendAction({
    type: 'cart:remove',
    productId: data.productId || 'N/A',
    barcode: data.barcode || '',
  });
}

/**
 * Current ESP32 connection status (from the live WebSocket).
 * @returns {Promise<{ connected: boolean }>}
 */
export function getEsp32Status() {
  return Promise.resolve({ connected: socket.isEsp32Connected() });
}
