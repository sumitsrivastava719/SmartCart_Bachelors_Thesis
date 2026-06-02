/**
 * Cart API Service
 * Handles communication between the frontend and the SmartCart backend.
 * The backend forwards these requests to ESP32 via Socket.IO.
 */

const API_BASE = '/api';

/**
 * Notify backend that a product was scanned / added to cart.
 * @param {{ productId: string, barcode: string, name: string, price: number, quantity: number }} data
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function scanProduct(data) {
  try {
    const res = await fetch(`${API_BASE}/cart/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err) {
    console.error('scanProduct API error:', err);
    return { success: false, error: 'Network error. Backend may be offline.' };
  }
}

/**
 * Notify backend that a product quantity was changed.
 * @param {{ productId: string, barcode: string, quantity: number, action: 'increase' | 'decrease' }} data
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function updateQuantity(data) {
  try {
    const res = await fetch(`${API_BASE}/cart/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err) {
    console.error('updateQuantity API error:', err);
    return { success: false, error: 'Network error. Backend may be offline.' };
  }
}

/**
 * Notify backend that a product was removed from cart.
 * @param {{ productId: string, barcode: string }} data
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function removeProduct(data) {
  try {
    const res = await fetch(`${API_BASE}/cart/remove`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err) {
    console.error('removeProduct API error:', err);
    return { success: false, error: 'Network error. Backend may be offline.' };
  }
}

/**
 * Check if the ESP32 is connected to the backend.
 * @returns {Promise<{ connected: boolean, socketId?: string }>}
 */
export async function getEsp32Status() {
  try {
    const res = await fetch(`${API_BASE}/esp32/status`);
    return await res.json();
  } catch (err) {
    console.error('getEsp32Status API error:', err);
    return { connected: false };
  }
}
