import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import './BarcodeScanner.css';

export default function BarcodeScanner({ onScan }) {
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const lastScannedRef = useRef({ code: '', timestamp: 0 });
  const [isScanning, setIsScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState('');

  const startScanner = async () => {
    if (html5QrCodeRef.current || isScanning) return;

    try {
      const html5QrCode = new Html5Qrcode('barcode-reader');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 120 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          const now = Date.now();
          const last = lastScannedRef.current;

          // Block duplicate scans of the same barcode within 10 seconds
          if (decodedText === last.code && now - last.timestamp < 10000) {
            return;
          }

          // Update ref synchronously (no stale closure issue)
          lastScannedRef.current = { code: decodedText, timestamp: now };
          setScanFeedback(`Scanned: ${decodedText}`);
          onScan(decodedText);

          // Clear feedback after 2.5 seconds
          setTimeout(() => {
            setScanFeedback('');
          }, 2500);
        },
        () => {
          // Scan failure - ignore (scanning in progress)
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Scanner error:', err);
      setScanFeedback('Camera access denied. Please allow camera permissions.');
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Stop error:', err);
      }
      html5QrCodeRef.current = null;
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <section className="scanner" id="barcode-scanner">
      <div className="scanner__viewport" ref={scannerRef}>
        <div id="barcode-reader" className="scanner__reader"></div>

        {!isScanning && (
          <div className="scanner__placeholder">
            <div className="scanner__icon-wrapper">
              <svg className="scanner__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 4V2a1 1 0 011-1h3M20 1h3a1 1 0 011 1v3M23 20v3a1 1 0 01-1 1h-3M4 23H1a1 1 0 01-1-1v-3" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="1" y1="12" x2="23" y2="12" strokeDasharray="2 2"/>
              </svg>
            </div>
            <p className="scanner__label">Tap to start scanning</p>
          </div>
        )}

        {/* Scanner corners overlay */}
        {isScanning && (
          <div className="scanner__corners">
            <span className="scanner__corner scanner__corner--tl"></span>
            <span className="scanner__corner scanner__corner--tr"></span>
            <span className="scanner__corner scanner__corner--bl"></span>
            <span className="scanner__corner scanner__corner--br"></span>
            <div className="scanner__laser"></div>
          </div>
        )}
      </div>

      {/* Scan feedback */}
      {scanFeedback && (
        <div className="scanner__feedback" id="scan-feedback">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {scanFeedback}
        </div>
      )}

      {/* Start/Stop button */}
      <button
        className={`scanner__toggle ${isScanning ? 'scanner__toggle--active' : ''}`}
        id="scanner-toggle"
        onClick={isScanning ? stopScanner : startScanner}
      >
        {isScanning ? (
          <>
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
            Stop Scanner
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M1 4V2a1 1 0 011-1h3M20 1h3a1 1 0 011 1v3M23 20v3a1 1 0 01-1 1h-3M4 23H1a1 1 0 01-1-1v-3"/>
              <line x1="1" y1="12" x2="23" y2="12"/>
            </svg>
            Start Scanner
          </>
        )}
      </button>
    </section>
  );
}
