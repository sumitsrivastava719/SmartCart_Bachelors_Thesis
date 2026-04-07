import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthPage.css';

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});
  const [shake, setShake] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error on type
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!isLogin) {
      if (!formData.customer_name.trim()) {
        newErrors.customer_name = 'Customer name is required';
      } else if (formData.customer_name.trim().length < 3) {
        newErrors.customer_name = 'Customer name must be at least 3 characters';
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!isLogin) {
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\s/g, ''))) {
        newErrors.phone = 'Enter a valid 10-digit phone number';
      }
    }

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (isLogin) {
      // Login: check if user exists in localStorage
      const storedUsers = JSON.parse(localStorage.getItem('smartcart_users') || '[]');
      const user = storedUsers.find((u) => u.email === formData.email.trim());

      if (!user) {
        setErrors({ email: 'No account found with this email. Please register first.' });
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }

      // Save current logged-in user
      localStorage.setItem('smartcart_current_user', JSON.stringify(user));
      navigate('/cart');
    } else {
      // Register: save user data
      const storedUsers = JSON.parse(localStorage.getItem('smartcart_users') || '[]');

      // Check if email already registered
      if (storedUsers.find((u) => u.email === formData.email.trim())) {
        setErrors({ email: 'This email is already registered. Please login.' });
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }

      const newUser = {
        id: Date.now(),
        customer_name: formData.customer_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        createdAt: new Date().toISOString(),
      };

      storedUsers.push(newUser);
      localStorage.setItem('smartcart_users', JSON.stringify(storedUsers));
      localStorage.setItem('smartcart_current_user', JSON.stringify(newUser));
      navigate('/cart');
    }
  };

  const switchMode = () => {
    setIsLogin((prev) => !prev);
    setErrors({});
    if (isLogin) {
      setFormData({ customer_name: '', email: '', phone: '' });
    }
  };

  return (
    <div className="auth">
      {/* Decorative background shapes */}
      <div className="auth__bg-shape auth__bg-shape--1"></div>
      <div className="auth__bg-shape auth__bg-shape--2"></div>

      {/* Logo */}
      <header className="auth__header">
        <div className="auth__logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
          </svg>
        </div>
        <h1 className="auth__logo">
          <span className="auth__logo-smart">Smart</span>
          <span className="auth__logo-cart">Cart</span>
          <span className="auth__logo-inc"> Inc.</span>
        </h1>
        <p className="auth__tagline">Scan. Cart. Pay. Simple.</p>
      </header>

      {/* Toggle Tabs */}
      <div className="auth__tabs" id="auth-tabs">
        <button
          className={`auth__tab ${!isLogin ? 'auth__tab--active' : ''}`}
          id="tab-register"
          onClick={() => { if (isLogin) switchMode(); }}
        >
          Register
        </button>
        <button
          className={`auth__tab ${isLogin ? 'auth__tab--active' : ''}`}
          id="tab-login"
          onClick={() => { if (!isLogin) switchMode(); }}
        >
          Login
        </button>
        <div
          className="auth__tab-indicator"
          style={{ transform: isLogin ? 'translateX(100%)' : 'translateX(0)' }}
        ></div>
      </div>

      {/* Form */}
      <form
        className={`auth__form ${shake ? 'auth__form--shake' : ''}`}
        id="auth-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <h2 className="auth__form-title">
          {isLogin ? 'Welcome back!' : 'Create your account'}
        </h2>

        {/* Customer name - only for register */}
        {!isLogin && (
          <div className={`auth__field ${errors.customer_name ? 'auth__field--error' : ''}`}>
            <label className="auth__label" htmlFor="customer_name">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Customer name
            </label>
            <input
              className="auth__input"
              type="text"
              id="customer_name"
              name="customer_name"
              placeholder="Enter your name"
              value={formData.customer_name}
              onChange={handleChange}
              autoComplete="name"
            />
            {errors.customer_name && <span className="auth__error">{errors.customer_name}</span>}
          </div>
        )}

        {/* Email */}
        <div className={`auth__field ${errors.email ? 'auth__field--error' : ''}`}>
          <label className="auth__label" htmlFor="email">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Email
          </label>
          <input
            className="auth__input"
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
          />
          {errors.email && <span className="auth__error">{errors.email}</span>}
        </div>

        {/* Phone - only for register */}
        {!isLogin && (
          <div className={`auth__field ${errors.phone ? 'auth__field--error' : ''}`}>
            <label className="auth__label" htmlFor="phone">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              Phone Number
            </label>
            <div className="auth__phone-wrap">
              <span className="auth__phone-prefix">+91</span>
              <input
                className="auth__input auth__input--phone"
                type="tel"
                id="phone"
                name="phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={handleChange}
                maxLength={10}
                autoComplete="tel"
              />
            </div>
            {errors.phone && <span className="auth__error">{errors.phone}</span>}
          </div>
        )}

        {/* Submit */}
        <button className="auth__submit" id="auth-submit" type="submit">
          {isLogin ? 'Login' : 'Register'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </button>

        {/* Switch */}
        <p className="auth__switch">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button type="button" className="auth__switch-btn" onClick={switchMode}>
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </form>
    </div>
  );
}
