import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './components/Header';
import BarcodeScanner from './components/BarcodeScanner';
import CartList from './components/CartList';
import Footer from './components/Footer';
import './App.css';

// Simple product database for demo - in production this would be an API call
const PRODUCT_DB = {
  '8901491366052': { productId: 'PID-LC7829', name: "Kurkure Puffcorn", weight: '58g', price: 20.00, image: '/kurkure.jpg' },
  '8904043901015': { productId: 'PID-PS4410', name: 'Tata Salt', weight: '1kg', price: 28.00, image: '/salt.png' },
  '8901928692006': { productId: 'PID-CP1133', name: 'Biskfarm biscuit', weight: '190g', price: 10.00, image: '/biscuit.png' },
  'NO:YHUFI35021': { productId: 'PID-AV3502', name: 'Asus Vivobook', weight: '1.7kg', price: 45000.00, image: '/asus.png' },
};

function App() {
  const [cartItems, setCartItems] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState(null); // null | 'success' | 'failed'
  const [paymentInfo, setPaymentInfo] = useState(null);
  const navigate = useNavigate();

  const handleScan = useCallback((barcode) => {
    setCartItems((prevItems) => {
      // Check if item already exists in cart
      const existingIndex = prevItems.findIndex((item) => item.barcode === barcode);

      if (existingIndex !== -1) {
        // Increment quantity
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }

      // Look up product in database
      const product = PRODUCT_DB[barcode];

      if (product) {
        return [
          ...prevItems,
          {
            id: Date.now(),
            barcode,
            productId: product.productId || 'N/A',
            name: product.name,
            weight: product.weight,
            price: product.price,
            image: product.image || '',
            quantity: 1,
          },
        ];
      }

      // Unknown product - add with barcode as name
      return [
        ...prevItems,
        {
          id: Date.now(),
          barcode,
          name: `Product (${barcode})`,
          weight: '',
          price: 0.00,
          quantity: 1,
        },
      ];
    });
  }, []);

  const handleRemoveItem = useCallback((itemId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const handleQuantityChange = useCallback((itemId, newQty) => {
    if (newQty < 1) {
      setCartItems((prev) => prev.filter((item) => item.id !== itemId));
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity: newQty } : item
      )
    );
  }, []);

  const handlePay = useCallback(() => {
    if (cartItems.length === 0) return;

    const user = JSON.parse(localStorage.getItem('smartcart_current_user') || '{}');
    const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Razorpay checkout options
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
        // Payment successful
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
          // User closed the Razorpay modal without completing payment
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

  // Auto-redirect to bill page after 2 seconds on payment success
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
      // Immediately go to bill page
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
      <Header />
      <main className="app__main">
        <BarcodeScanner onScan={handleScan} />
        <CartList
          items={cartItems}
          onRemoveItem={handleRemoveItem}
          onQuantityChange={handleQuantityChange}
        />
      </main>
      <Footer itemCount={itemCount} totalPrice={totalPrice} onPay={handlePay} />

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

