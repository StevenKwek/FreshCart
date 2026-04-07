import { useState } from 'react';
import AppIcon from './AppIcon';

const navItems = [
  { key: 'home', label: 'Home' },
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'cart', label: 'Cart' },
  { key: 'checkout', label: 'Checkout' },
];

function Icon({ type, className = '' }) {
  const icons = {
    brand: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 7h12l-1.2 5.3a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.6L6 5H3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 18.5a.9.9 0 1 1 0 .01M16 18.5a.9.9 0 1 1 0 .01"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.4 4.2c1.9-.2 3.4 1 3.6 2.8-1.8.2-3.1-.2-4-.9-.8-.7-1.2-1.7-1.1-3 0 0 .6 1 1.5 1.1Z"
          fill="currentColor"
          opacity="0.9"
        />
      </svg>
    ),
    home: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    wishlist: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 20.5 4.9 13.7A4.7 4.7 0 0 1 11.6 7l.4.4.4-.4a4.7 4.7 0 0 1 6.7 6.7z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    cart: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M3.5 5.5H6l1.8 8.2a1 1 0 0 0 1 .8h8.1a1 1 0 0 0 1-.8L19.5 8H8.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 19a1 1 0 1 0 0 .01M16.5 19a1 1 0 1 0 0 .01"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    checkout: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 4.5h10A1.5 1.5 0 0 1 18.5 6v12A1.5 1.5 0 0 1 17 19.5H7A1.5 1.5 0 0 1 5.5 18V6A1.5 1.5 0 0 1 7 4.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M8.5 9.5h7M8.5 13h7M8.5 16.5h4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  };

  return <span className={className}>{icons[type]}</span>;
}

function Navbar({
  currentView,
  onNavigate,
  cartCount,
  wishlistCount,
  user,
  theme,
  onToggleTheme,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const username = (user?.username || user?.name || 'guest')
    .toLowerCase()
    .replace(/\s+/g, '');
  const initial = username[0]?.toUpperCase() || 'G';
  const displayName = username;

  const handleNavigate = (view) => {
    setMobileOpen(false);
    onNavigate(view);
  };

  return (
    <header className="navbar">
      <div className="brand-group">
        <div className="brand-row">
          <button className="brand-button" onClick={() => handleNavigate('home')}>
            <span className="brand-mark">
              <Icon type="brand" className="brand-icon" />
            </span>
            <div>
              <p className="brand-title">FreshCart</p>
              <p className="brand-caption">Smart Grocery for busy days</p>
            </div>
          </button>

          <button
            className="mobile-hamburger"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            <AppIcon
              type={mobileOpen ? 'close' : 'menu'}
              className="mobile-menu-icon"
            />
          </button>
        </div>
      </div>

      <nav className="nav-links">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`nav-link ${currentView === item.key ? 'active' : ''}`}
            onClick={() => handleNavigate(item.key)}
          >
            <Icon type={item.key} className="nav-icon" />
            {item.label}
            {item.key === 'wishlist' && wishlistCount > 0 ? (
              <span className="nav-badge">{wishlistCount}</span>
            ) : null}
            {item.key === 'cart' && cartCount > 0 ? (
              <span className="nav-badge">{cartCount}</span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="user-actions">
        <button
          className="theme-toggle navbar-theme-toggle"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        >
          <AppIcon
            type={theme === 'dark' ? 'sun' : 'moon'}
            className="theme-toggle-icon"
          />
        </button>
        <button className="user-pill user-pill-button" onClick={() => handleNavigate('profile')}>
          <span className="user-avatar">{initial}</span>
          <div>
            <p className="user-label">{displayName}</p>
          </div>
        </button>
      </div>

      {mobileOpen ? (
        <div className="mobile-menu">
        <div className="mobile-menu-links">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`mobile-menu-link ${currentView === item.key ? 'active' : ''}`}
              onClick={() => handleNavigate(item.key)}
            >
              <Icon type={item.key} className="nav-icon" />
              <span>{item.label}</span>
              {item.key === 'wishlist' && wishlistCount > 0 ? (
                <span className="nav-badge">{wishlistCount}</span>
              ) : null}
              {item.key === 'cart' && cartCount > 0 ? (
                <span className="nav-badge">{cartCount}</span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="mobile-menu-actions">
          <button
            className="theme-toggle mobile-theme-toggle"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            <AppIcon
              type={theme === 'dark' ? 'sun' : 'moon'}
              className="theme-toggle-icon"
            />
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            className="user-pill user-pill-button mobile-user-pill"
            onClick={() => handleNavigate('profile')}
          >
            <span className="user-avatar">{initial}</span>
            <div>
              <p className="user-label">{displayName}</p>
            </div>
          </button>
        </div>
      </div>
      ) : null}
    </header>
  );
}

export default Navbar;
