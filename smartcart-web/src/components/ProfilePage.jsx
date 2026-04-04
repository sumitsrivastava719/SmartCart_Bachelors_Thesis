import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('smartcart_current_user') || '{}');

  return (
    <div className="profile">
      {/* Header */}
      <header className="profile__header">
        <button className="profile__back" id="profile-back" onClick={() => navigate('/cart')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="profile__title">My Profile</h1>
        <div className="profile__header-spacer"></div>
      </header>

      {/* Avatar */}
      <div className="profile__avatar-section">
        <div className="profile__avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2 className="profile__name">{user.username || 'User'}</h2>
        <p className="profile__joined">
          Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'N/A'}
        </p>
      </div>

      {/* Details Card */}
      <div className="profile__card" id="profile-details">
        <h3 className="profile__card-title">Personal Information</h3>

        <div className="profile__field">
          <div className="profile__field-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="profile__field-content">
            <span className="profile__field-label">Full Name</span>
            <span className="profile__field-value">{user.username || '—'}</span>
          </div>
        </div>

        <div className="profile__field">
          <div className="profile__field-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div className="profile__field-content">
            <span className="profile__field-label">Email Address</span>
            <span className="profile__field-value">{user.email || '—'}</span>
          </div>
        </div>

        <div className="profile__field profile__field--last">
          <div className="profile__field-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
          </div>
          <div className="profile__field-content">
            <span className="profile__field-label">Phone Number</span>
            <span className="profile__field-value">+91 {user.phone || '—'}</span>
          </div>
        </div>
      </div>

      {/* Back to Cart button */}
      <button className="profile__cart-btn" onClick={() => navigate('/cart')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
        </svg>
        Back to Cart
      </button>
    </div>
  );
}
