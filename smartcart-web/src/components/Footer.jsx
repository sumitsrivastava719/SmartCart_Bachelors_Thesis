import './Footer.css';

export default function Footer({ itemCount, totalPrice, onPay }) {
  return (
    <footer className="footer" id="app-footer">
      <div className="footer__summary">
        <div className="footer__info">
          <span className="footer__count">{itemCount} ITEM{itemCount !== 1 ? 'S' : ''}</span>
          <span className="footer__total">TOTAL : ₹{totalPrice.toFixed(0)}</span>
        </div>
        <button
          className="footer__pay-btn"
          id="proceed-to-pay"
          disabled={itemCount === 0}
          onClick={onPay}
        >
          PROCEED TO PAY
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <path d="M5 12h14M13 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </footer>
  );
}
