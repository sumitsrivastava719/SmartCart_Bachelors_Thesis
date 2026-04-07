// Razorpay Payment Integration (Test Mode)
// Replace this with your own test key from https://dashboard.razorpay.com/app/keys
const RAZORPAY_KEY_ID = 'rzp_test_SZOvvhvQap7v80';

/**
 * Opens Razorpay checkout with cart items and user details
 * @param {Object} options
 * @param {Array} options.cartItems - Array of cart items
 * @param {number} options.totalPrice - Total price in INR
 * @param {Object} options.user - User details { customer_name, email, phone }
 * @param {Function} options.onSuccess - Callback on successful payment
 * @param {Function} options.onFailure - Callback on failed/dismissed payment
 */
export function initiatePayment({ cartItems, totalPrice, user, onSuccess, onFailure }) {
  // Razorpay expects amount in paise (1 INR = 100 paise)
  const amountInPaise = Math.round(totalPrice * 100);

  // Build item description for the checkout
  const itemDescriptions = cartItems
    .map((item) => `${item.name} x${item.quantity}`)
    .join(', ');

  // Trim description to 255 chars (Razorpay limit)
  const description = itemDescriptions.length > 255
    ? itemDescriptions.substring(0, 252) + '...'
    : itemDescriptions;

  const options = {
    key: RAZORPAY_KEY_ID,
    amount: amountInPaise,
    currency: 'INR',
    name: 'SmartCart Inc.',
    description: description,
    image: '', // You can add a logo URL here
    prefill: {
      name: user?.customer_name || '',
      email: user?.email || '',
      contact: user?.phone ? `+91${user.phone}` : '',
    },
    notes: {
      items_count: cartItems.length.toString(),
      total_items: cartItems.reduce((sum, item) => sum + item.quantity, 0).toString(),
      order_summary: itemDescriptions,
    },
    theme: {
      color: '#4a7c2e',
      backdrop_color: 'rgba(0, 0, 0, 0.6)',
    },
    modal: {
      ondismiss: () => {
        if (onFailure) onFailure('Payment cancelled by user');
      },
    },
    handler: (response) => {
      // Payment successful
      if (onSuccess) {
        onSuccess({
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
        });
      }
    },
  };

  try {
    const razorpay = new window.Razorpay(options);

    razorpay.on('payment.failed', (response) => {
      if (onFailure) {
        onFailure(response.error?.description || 'Payment failed');
      }
    });

    razorpay.open();
  } catch (error) {
    console.error('Razorpay error:', error);
    if (onFailure) {
      onFailure('Could not open payment gateway. Please try again.');
    }
  }
}

/**
 * Check if Razorpay SDK is loaded
 */
export function isRazorpayReady() {
  return typeof window.Razorpay !== 'undefined';
}
