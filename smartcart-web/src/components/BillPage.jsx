import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './BillPage.css';

// Encode bill data to base64 for sharing via QR
function encodeBillData(billData, user) {
  const payload = {
    i: billData.items.map(item => ({
      n: item.name,
      w: item.weight,
      p: item.price,
      q: item.quantity,
    })),
    t: billData.totalPrice,
    pid: billData.paymentId,
    d: billData.date,
    u: { name: user?.username, email: user?.email, phone: user?.phone },
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

// Decode bill data from base64
function decodeBillData(encoded) {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const payload = JSON.parse(json);
    return {
      billData: {
        items: payload.i.map((item, idx) => ({
          id: idx,
          name: item.n,
          weight: item.w,
          price: item.p,
          quantity: item.q,
        })),
        totalPrice: payload.t,
        paymentId: payload.pid,
        date: payload.d,
      },
      user: {
        username: payload.u?.name,
        email: payload.u?.email,
        phone: payload.u?.phone,
      },
    };
  } catch {
    return null;
  }
}

export default function BillPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const billRef = useRef(null);
  const qrCanvasRef = useRef(null);
  const sliderRef = useRef(null);

  const [activeSlide, setActiveSlide] = useState(0); // 0 = bill, 1 = QR
  const [shareUrl, setShareUrl] = useState('');

  // Check for shared bill data in URL
  const sharedData = searchParams.get('data');
  const isSharedView = !!sharedData;

  let billData, user;

  if (isSharedView) {
    const decoded = decodeBillData(sharedData);
    if (decoded) {
      billData = decoded.billData;
      user = decoded.user;
    }
  } else {
    billData = JSON.parse(localStorage.getItem('smartcart_last_bill') || 'null');
    user = JSON.parse(localStorage.getItem('smartcart_current_user') || '{}');
  }

  // Generate share URL
  useEffect(() => {
    if (!billData || isSharedView) return;
    const stored = JSON.parse(localStorage.getItem('smartcart_last_bill') || 'null');
    const storedUser = JSON.parse(localStorage.getItem('smartcart_current_user') || '{}');
    if (!stored) return;

    const encoded = encodeBillData(stored, storedUser);
    const url = `${window.location.origin}/bill?data=${encoded}`;
    setShareUrl(url);
  }, [isSharedView]);

  // Generate QR code
  useEffect(() => {
    if (!shareUrl || !qrCanvasRef.current) return;

    const loadAndRender = async () => {
      // Load QRious library (lightweight QR generator)
      if (!window.QRious) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      new window.QRious({
        element: qrCanvasRef.current,
        value: shareUrl,
        size: 220,
        foreground: '#2d5016',
        background: '#ffffff',
        level: 'M',
        padding: 12,
      });
    };

    loadAndRender().catch(console.error);
  }, [shareUrl]);

  // Handle swipe / scroll snap
  const handleScroll = useCallback(() => {
    const el = sliderRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const width = el.offsetWidth;
    setActiveSlide(scrollLeft > width * 0.4 ? 1 : 0);
  }, []);

  const scrollToSlide = (index) => {
    const el = sliderRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.offsetWidth, behavior: 'smooth' });
  };

  // Empty state
  if (!billData) {
    return (
      <div className="bill-page">
        <div className="bill-empty">
          <div className="bill-empty__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h2>No Bill Found</h2>
          <p>Complete a purchase to view your bill.</p>
          <button className="bill-empty__btn" onClick={() => navigate('/cart')}>
            Go to Cart
          </button>
        </div>
      </div>
    );
  }

  const { items, totalPrice, paymentId, date } = billData;
  const billDate = new Date(date);
  const invoiceNo = `SC-${billDate.getFullYear()}${String(billDate.getMonth() + 1).padStart(2, '0')}${String(billDate.getDate()).padStart(2, '0')}-${paymentId ? paymentId.slice(-6).toUpperCase() : '000000'}`;

  const subtotal = totalPrice;
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const grandTotal = subtotal + cgst + sgst;

  const handleDownload = async () => {
    const el = billRef.current;
    if (!el) return;

    try {
      if (!window.html2canvas) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      const canvas = await window.html2canvas(el, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `SmartCart_Bill_${invoiceNo}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
      alert('Could not download bill. Please try again.');
    }
  };

  return (
    <div className="bill-page">
      {/* Header */}
      <header className="bill-page__header">
        <button className="bill-page__back" id="bill-back" onClick={() => navigate(isSharedView ? '/' : '/cart')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="bill-page__heading">Your Bill</h1>
        <div className="bill-page__header-spacer"></div>
      </header>

      {/* Slide indicator dots */}
      {!isSharedView && (
        <div className="bill-page__dots">
          <button
            className={`bill-page__dot ${activeSlide === 0 ? 'bill-page__dot--active' : ''}`}
            onClick={() => scrollToSlide(0)}
            aria-label="View bill"
          />
          <button
            className={`bill-page__dot ${activeSlide === 1 ? 'bill-page__dot--active' : ''}`}
            onClick={() => scrollToSlide(1)}
            aria-label="View QR code"
          />
        </div>
      )}

      {/* Swipeable slider container */}
      <div
        className="bill-slider"
        ref={sliderRef}
        onScroll={handleScroll}
        style={isSharedView ? { overflow: 'hidden' } : undefined}
      >
        {/* Slide 1: The Bill */}
        <div className="bill-slider__slide">
          <div className="bill-receipt-wrapper">
            <div className="bill-receipt" ref={billRef} id="bill-receipt">
              {/* Receipt header */}
              <div className="bill-receipt__header">
                <div className="bill-receipt__logo">
                  <span className="bill-receipt__logo-icon">🛒</span>
                  <div>
                    <h2 className="bill-receipt__store-name">
                      <span style={{ color: '#4a7c2e' }}>Smart</span>
                      <span style={{ color: '#3a6322' }}>Cart</span>
                      <span style={{ color: '#888', fontWeight: 500, fontSize: '0.7em' }}> Inc.</span>
                    </h2>
                    <p className="bill-receipt__tagline">Smart Shopping, Simple Living</p>
                  </div>
                </div>
                <div className="bill-receipt__meta">
                  <div className="bill-receipt__meta-row">
                    <span>Invoice</span>
                    <span className="bill-receipt__meta-val">{invoiceNo}</span>
                  </div>
                  <div className="bill-receipt__meta-row">
                    <span>Date</span>
                    <span className="bill-receipt__meta-val">
                      {billDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="bill-receipt__meta-row">
                    <span>Time</span>
                    <span className="bill-receipt__meta-val">
                      {billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bill-receipt__divider bill-receipt__divider--dashed"></div>

              {/* Customer info */}
              <div className="bill-receipt__customer">
                <h4 className="bill-receipt__section-title">Customer Details</h4>
                <div className="bill-receipt__customer-grid">
                  <div className="bill-receipt__customer-row">
                    <span className="bill-receipt__label">Name</span>
                    <span className="bill-receipt__value">{user?.username || 'Guest'}</span>
                  </div>
                  <div className="bill-receipt__customer-row">
                    <span className="bill-receipt__label">Email</span>
                    <span className="bill-receipt__value">{user?.email || '—'}</span>
                  </div>
                  <div className="bill-receipt__customer-row">
                    <span className="bill-receipt__label">Phone</span>
                    <span className="bill-receipt__value">{user?.phone ? `+91 ${user.phone}` : '—'}</span>
                  </div>
                </div>
              </div>

              <div className="bill-receipt__divider bill-receipt__divider--dashed"></div>

              {/* Items table */}
              <div className="bill-receipt__items">
                <h4 className="bill-receipt__section-title">Items Purchased</h4>
                <table className="bill-receipt__table">
                  <thead>
                    <tr>
                      <th className="bill-receipt__th bill-receipt__th--item">#</th>
                      <th className="bill-receipt__th bill-receipt__th--name">Item</th>
                      <th className="bill-receipt__th bill-receipt__th--qty">Qty</th>
                      <th className="bill-receipt__th bill-receipt__th--price">Price</th>
                      <th className="bill-receipt__th bill-receipt__th--total">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id || index} className="bill-receipt__tr">
                        <td className="bill-receipt__td bill-receipt__td--item">{index + 1}</td>
                        <td className="bill-receipt__td bill-receipt__td--name">
                          <div className="bill-receipt__item-name">{item.name}</div>
                          {item.weight && <div className="bill-receipt__item-weight">{item.weight}</div>}
                        </td>
                        <td className="bill-receipt__td bill-receipt__td--qty">{item.quantity}</td>
                        <td className="bill-receipt__td bill-receipt__td--price">₹{item.price.toFixed(2)}</td>
                        <td className="bill-receipt__td bill-receipt__td--total">₹{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bill-receipt__divider"></div>

              {/* Totals */}
              <div className="bill-receipt__totals">
                <div className="bill-receipt__total-row">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="bill-receipt__total-row bill-receipt__total-row--tax">
                  <span>CGST (9%)</span>
                  <span>₹{cgst.toFixed(2)}</span>
                </div>
                <div className="bill-receipt__total-row bill-receipt__total-row--tax">
                  <span>SGST (9%)</span>
                  <span>₹{sgst.toFixed(2)}</span>
                </div>
                <div className="bill-receipt__divider"></div>
                <div className="bill-receipt__total-row bill-receipt__total-row--grand">
                  <span>Grand Total</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="bill-receipt__divider bill-receipt__divider--dashed"></div>

              {/* Payment info */}
              <div className="bill-receipt__payment-info">
                <div className="bill-receipt__payment-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  PAID
                </div>
                <div className="bill-receipt__payment-details">
                  <div className="bill-receipt__meta-row">
                    <span>Payment ID</span>
                    <span className="bill-receipt__meta-val bill-receipt__meta-val--mono">{paymentId || 'N/A'}</span>
                  </div>
                  <div className="bill-receipt__meta-row">
                    <span>Method</span>
                    <span className="bill-receipt__meta-val">Razorpay</span>
                  </div>
                </div>
              </div>

              <div className="bill-receipt__divider bill-receipt__divider--dashed"></div>

              {/* Footer */}
              <div className="bill-receipt__footer">
                <p className="bill-receipt__thankyou">Thank you for shopping with us! 🎉</p>
                <p className="bill-receipt__powered">Powered by SmartCart Inc.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 2: QR Code */}
        {!isSharedView && (
          <div className="bill-slider__slide">
            <div className="bill-qr-wrapper">
              <div className="bill-qr-card">
                <div className="bill-qr-card__badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="3" height="3" />
                    <line x1="21" y1="14" x2="21" y2="21" />
                    <line x1="14" y1="21" x2="21" y2="21" />
                  </svg>
                  <span>Scan to View Bill</span>
                </div>

                <div className="bill-qr-card__canvas-wrapper">
                  <canvas ref={qrCanvasRef} className="bill-qr-card__canvas"></canvas>
                </div>

                <div className="bill-qr-card__info">
                  <p className="bill-qr-card__invoice">{invoiceNo}</p>
                  <p className="bill-qr-card__amount">₹{grandTotal.toFixed(2)}</p>
                </div>

                <p className="bill-qr-card__hint">
                  Anyone who scans this QR code can view this bill
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Swipe hint */}
      {!isSharedView && activeSlide === 0 && (
        <div className="bill-page__swipe-hint" onClick={() => scrollToSlide(1)}>
          <span>Swipe for QR</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      )}

      {/* Download button */}
      <div className="bill-actions">
        <button className="bill-actions__btn" id="download-bill" onClick={handleDownload}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download Bill
        </button>
      </div>

      {/* Continue shopping */}
      {!isSharedView && (
        <button className="bill-page__continue" id="continue-shopping" onClick={() => navigate('/cart')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
          </svg>
          Continue Shopping
        </button>
      )}
    </div>
  );
}
