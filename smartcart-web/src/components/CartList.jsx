import CartItem from './CartItem';
import './CartList.css';

export default function CartList({ items, onRemoveItem, onQuantityChange }) {
  return (
    <section className="cart-list" id="cart-list">
      <h2 className="cart-list__title">YOUR CART</h2>

      {items.length === 0 ? (
        <div className="cart-list__empty" id="cart-empty">
          <div className="cart-list__empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
            </svg>
          </div>
          <p className="cart-list__empty-text">Your cart is empty</p>
          <p className="cart-list__empty-hint">Scan a barcode to add items</p>
        </div>
      ) : (
        <div className="cart-list__items">
          {items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onRemove={onRemoveItem}
              onQuantityChange={onQuantityChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}
