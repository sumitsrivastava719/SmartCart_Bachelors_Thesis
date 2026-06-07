import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './components/Header';
import BarcodeScanner from './components/BarcodeScanner';
import CartList from './components/CartList';
import Footer from './components/Footer';
import * as cartApi from './services/cartApi';
import socket from './services/socket';
import './App.css';

// Simple product database for demo - in production this would be an API call
const PRODUCT_DB = {
  '6932169311649': { productId: 'PID-LC7829', name: "Oppo Enco Buds 2", weight: '38g', price: 2000.00, image: '/oppo.jpg' },
  '8904043901015': { productId: 'PID-PS4410', name: 'Tata Salt', weight: '1kg', price: 30.00, image: '/salt.png' },
  '8901928692006': { productId: 'PID-CP1133', name: 'Biskfarm Jeera Wonder', weight: '190g', price: 30.00, image: '/biscuit.png' },
};

// Helper to get per-user cart storage key
function getCartKey() {
  try {
    const user = JSON.parse(localStorage.getItem('smartcart_current_user') || '{}');
    return user.email ? `smartcart_cart_${user.email}` : 'smartcart_cart_guest';
  } catch {
    return 'smartcart_cart_guest';
  }
}

function App() {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(getCartKey());
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [paymentStatus, setPaymentStatus] = useState(null); // null | 'success' | 'failed'
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loadingItems, setLoadingItems] = useState({}); // { [itemId]: true } for items with pending API calls
  const [esp32Connected, setEsp32Connected] = useState(false);
  const [scanLoading, setScanLoading] = useState(false); // waiting for ESP32 to ack a freshly scanned product
  const [apiError, setApiError] = useState(null); // { message: string } for ESP32 error toasts
  const navigate = useNavigate();

  // Always-current snapshot of the cart. The barcode scanner captures
  // handleScan once, so reading cartItems from its closure would be
  // stale — we read from this ref instead to detect existing items.
  const cartItemsRef = useRef(cartItems);

  // Persist cart to localStorage + keep the ref in sync
  useEffect(() => {
    cartItemsRef.current = cartItems;
    localStorage.setItem(getCartKey(), JSON.stringify(cartItems));
  }, [cartItems]);

  // Real-time ESP32 status via Socket.IO
  useEffect(() => {
    const onStatus = ({ connected }) => setEsp32Connected(connected);

    socket.on('esp32:status', onStatus);
    return () => socket.off('esp32:status', onStatus);
  }, []);

  // Auto-dismiss API error toast after 4 seconds
  useEffect(() => {
    if (apiError) {
      const timer = setTimeout(() => setApiError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [apiError]);

  const handleScan = useCallback(async (rawBarcode) => {
    const barcode = String(rawBarcode || '').trim();
    const product = PRODUCT_DB[barcode];

    // Only the known/hardcoded products are accepted. Anything else
    // is rejected with a toast and never sent to the backend.
    if (!product) {
      setApiError({ message: 'Product not recognized. Please scan again.' });
      return;
    }

    // Build the new item
    const newItem = {
      id: Date.now(),
      barcode,
      productId: product.productId || 'N/A',
      name: product.name,
      weight: product.weight,
      price: product.price,
      image: product.image || '',
      quantity: 1,
    };

    // Check existing items against the always-current cart snapshot.
    const existingItem = cartItemsRef.current.find((item) => item.barcode === barcode);

    if (existingItem) {
      // Product already in cart → increase quantity
      const newQty = existingItem.quantity + 1;
      setLoadingItems((prev) => ({ ...prev, [existingItem.id]: true }));

      // Optimistically update
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === existingItem.id ? { ...item, quantity: newQty } : item
        )
      );

      // Call backend
      const result = await cartApi.updateQuantity({
        productId: existingItem.productId,
        barcode: existingItem.barcode,
        quantity: newQty,
        action: 'increase',
      });

      setLoadingItems((prev) => {
        const next = { ...prev };
        delete next[existingItem.id];
        return next;
      });

      if (!result.success) {
        // Revert the optimistic update
        setCartItems((prev) =>
          prev.map((item) =>
            item.id === existingItem.id ? { ...item, quantity: newQty - 1 } : item
          )
        );
        setApiError({ message: result.error || 'Failed to update item on ESP32.' });
      }

      return;
    }

    // New product → wait for the ESP32 to acknowledge, then add it.
    // Show a loader spinner while we wait (no item row yet).
    setScanLoading(true);

    const result = await cartApi.scanProduct({
      productId: newItem.productId || 'N/A',
      barcode: newItem.barcode,
      name: newItem.name,
      price: newItem.price,
      quantity: 1,
    });

    setScanLoading(false);

    if (result.success) {
      // ESP32 confirmed → add the item to the cart (guard against a
      // race where the same product was added while we were waiting).
      setCartItems((prev) =>
        prev.some((item) => item.barcode === newItem.barcode)
          ? prev.map((item) =>
              item.barcode === newItem.barcode
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          : [...prev, newItem]
      );
    } else {
      setApiError({ message: result.error || 'Failed to add item. ESP32 rejected.' });
    }
  }, []);

  const handleRemoveItem = useCallback(async (itemId) => {
    const item = cartItems.find((i) => i.id === itemId);
    if (!item) return;

    // Optimistically remove
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
    setLoadingItems((prev) => ({ ...prev, [itemId]: true }));

    // Call backend
    const result = await cartApi.removeProduct({
      productId: item.productId || 'N/A',
      barcode: item.barcode,
    });

    setLoadingItems((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    if (!result.success) {
      // Re-add the item since ESP32 rejected removal
      setCartItems((prev) => [...prev, item]);
      setApiError({ message: result.error || 'Failed to remove item. ESP32 rejected.' });
    }
  }, [cartItems]);

  const handleQuantityChange = useCallback(async (itemId, newQty) => {
    const item = cartItems.find((i) => i.id === itemId);
    if (!item) return;

    if (newQty < 1) {
      // Remove item
      handleRemoveItem(itemId);
      return;
    }

    const oldQty = item.quantity;
    const action = newQty > oldQty ? 'increase' : 'decrease';

    // Optimistically update
    setCartItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i))
    );
    setLoadingItems((prev) => ({ ...prev, [itemId]: true }));

    // Call backend
    const result = await cartApi.updateQuantity({
      productId: item.productId || 'N/A',
      barcode: item.barcode,
      quantity: newQty,
      action,
    });

    setLoadingItems((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    if (!result.success) {
      // Revert to old quantity
      setCartItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, quantity: oldQty } : i))
      );
      setApiError({ message: result.error || 'Failed to update quantity. ESP32 rejected.' });
    }
  }, [cartItems, handleRemoveItem]);

  // Clicking the ESP32 indicator sends a quick "e" command to the
  // backend, which forwards it to the ESP32 device.
  const handleEsp32Click = useCallback(() => {
    const ok = cartApi.sendEspCommand('e');
    if (!ok) {
      setApiError({ message: 'Not connected to backend. Cannot reach ESP32.' });
    }
  }, []);

  const handlePay = useCallback(() => {
    if (cartItems.length === 0) return;

    const user = JSON.parse(localStorage.getItem('smartcart_current_user') || '{}');
    const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const options = {
      key: 'rzp_test_SaDemDe10xFOoG',
      amount: Math.round(totalPrice * 100), // Razorpay expects amount in paise
      currency: 'INR',
      name: 'SmartCart Inc.',
      description: `Payment for ${cartItems.length} item(s)`,
      image: '/favicon.svg',
      prefill: {
        name: user.name || '',
        email: user.email || '',
        contact: user.phone || '',
      },
      theme: {
        color: '#4a7c2e',
      },
      handler: function (response) {
        const billData = {
          items: [...cartItems],
          totalPrice,
          paymentId: response.razorpay_payment_id,
          date: new Date().toISOString(),
        };
        localStorage.setItem('smartcart_last_bill', JSON.stringify(billData));

        setPaymentStatus('success');
        setPaymentInfo({ paymentId: response.razorpay_payment_id });
        setCartItems([]);
      },
      modal: {
        ondismiss: function () {
          setPaymentStatus('failed');
          setPaymentInfo({ error: 'Payment was cancelled. Please try again.' });
        },
      },
    };

    const rzp = new window.Razorpay(options);

    rzp.on('payment.failed', function (response) {
      setPaymentStatus('failed');
      setPaymentInfo({
        error: response.error?.description || 'Payment failed. Please try again.',
      });
    });

    rzp.open();
  }, [cartItems]);

  useEffect(() => {
    if (paymentStatus === 'success') {
      const timer = setTimeout(() => {
        setPaymentStatus(null);
        setPaymentInfo(null);
        navigate('/bill');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [paymentStatus, navigate]);

  const dismissPaymentStatus = () => {
    if (paymentStatus === 'success') {
      setPaymentStatus(null);
      setPaymentInfo(null);
      navigate('/bill');
    } else {
      setPaymentStatus(null);
      setPaymentInfo(null);
    }
  };

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="app">
      <Header esp32Connected={esp32Connected} onEsp32Click={handleEsp32Click} />
      <main className="app__main">
        <BarcodeScanner onScan={handleScan} />
        <CartList
          items={cartItems}
          onRemoveItem={handleRemoveItem}
          onQuantityChange={handleQuantityChange}
          loadingItems={loadingItems}
        />
      </main>
      <Footer itemCount={itemCount} totalPrice={totalPrice} onPay={handlePay} />

      {/* Loader spinner while waiting for the ESP32 to confirm a scan */}
      {scanLoading && (
        <div className="scan-loading" id="scan-loading">
          <div className="scan-loading__spinner"></div>
        </div>
      )}

      {/* API Error Toast (ESP32 failures) */}
      {apiError && (
        <div className="api-error-toast" id="api-error-toast">
          <div className="api-error-toast__content">
            <div className="api-error-toast__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <span className="api-error-toast__message">{apiError.message}</span>
            <button className="api-error-toast__close" onClick={() => setApiError(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Payment Success/Failure Toast */}
      {paymentStatus && (
        <div className={`payment-toast payment-toast--${paymentStatus}`} id="payment-toast">
          <div className="payment-toast__content">
            {paymentStatus === 'success' ? (
              <>
                <div className="payment-toast__icon payment-toast__icon--success">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="32" height="32">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="payment-toast__title">Payment Successful!</h3>
                <p className="payment-toast__msg">
                  Payment ID: {paymentInfo?.paymentId || 'N/A'}
                </p>
                <p className="payment-toast__sub">Redirecting to your bill...</p>
              </>
            ) : (
              <>
                <div className="payment-toast__icon payment-toast__icon--failed">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="32" height="32">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <h3 className="payment-toast__title">Payment Failed</h3>
                <p className="payment-toast__msg">{paymentInfo?.error || 'Something went wrong'}</p>
              </>
            )}
            <button className="payment-toast__dismiss" onClick={dismissPaymentStatus}>
              {paymentStatus === 'success' ? 'View Bill' : 'Try Again'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
