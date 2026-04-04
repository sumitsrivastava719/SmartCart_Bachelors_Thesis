import './CartItem.css';

export default function CartItem({ item, onRemove, onQuantityChange }) {
  const handleDecrease = () => {
    if (item.quantity <= 1) {
      onRemove(item.id);
    } else {
      onQuantityChange(item.id, item.quantity - 1);
    }
  };

  const handleIncrease = () => {
    onQuantityChange(item.id, item.quantity + 1);
  };

  return (
    <div className="cart-item" id={`cart-item-${item.id}`}>
      <div className="cart-item__image-wrap">
        <div className="cart-item__image-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="M2 8h20"/>
            <path d="M6 12h2M6 16h4"/>
          </svg>
        </div>
      </div>

      <div className="cart-item__details">
        <h3 className="cart-item__name">{item.name}</h3>
        <div className="cart-item__meta">
          {item.weight && <span className="cart-item__weight">{item.weight}</span>}
          <span className="cart-item__qty-badge">
            QTY:{item.quantity}
          </span>
        </div>
      </div>

      <div className="cart-item__actions">
        <span className="cart-item__price">₹ {item.price.toFixed(2)}</span>
        <div className="cart-item__qty-controls">
          <button
            className={`cart-item__qty-btn cart-item__qty-btn--minus ${item.quantity <= 1 ? 'cart-item__qty-btn--delete' : ''}`}
            id={`decrease-item-${item.id}`}
            onClick={handleDecrease}
            aria-label={item.quantity <= 1 ? `Remove ${item.name}` : `Decrease ${item.name} quantity`}
          >
            {item.quantity <= 1 ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            )}
          </button>
          <span className="cart-item__qty-value">{item.quantity}</span>
          <button
            className="cart-item__qty-btn cart-item__qty-btn--plus"
            id={`increase-item-${item.id}`}
            onClick={handleIncrease}
            aria-label={`Increase ${item.name} quantity`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
