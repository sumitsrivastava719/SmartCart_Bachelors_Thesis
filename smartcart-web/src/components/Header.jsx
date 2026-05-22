import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleProfile = () => {
    setMenuOpen(false);
    navigate('/profile');
  };

  const handleLogout = () => {
    setMenuOpen(false);
    localStorage.removeItem('smartcart_current_user');
    navigate('/');
  };

  return (
    <header className="header" id="app-header">
      <h1 className="header__logo">
        <span className="header__logo-smart">Smart</span>
        <span className="header__logo-cart">Cart</span>
        <span className="header__logo-inc"> Inc.</span>
      </h1>

      <button
        className="header__menu-btn"
        id="menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >
        <span className={`header__hamburger ${menuOpen ? 'header__hamburger--open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      {menuOpen && (
        <div className="header__dropdown" id="menu-dropdown">
          <div className="header__dropdown-overlay" onClick={() => setMenuOpen(false)}></div>
          <nav className="header__dropdown-menu">
            <button
              className="header__menu-item"
              id="menu-profile"
              onClick={handleProfile}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              My Profile
            </button>

            <div className="header__menu-divider"></div>

            <button
              className="header__menu-item header__menu-item--danger"
              id="menu-logout"
              onClick={handleLogout}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
