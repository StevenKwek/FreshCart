import AppIcon from './AppIcon';

const guestLinks = [
  { key: 'login', label: 'Login' },
  { key: 'register', label: 'Register' },
];

const memberLinks = [
  { key: 'home', label: 'Home' },
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'cart', label: 'Cart' },
  { key: 'profile', label: 'Profile' },
];

function Footer({ user, onNavigate }) {
  const links = user ? memberLinks : guestLinks;

  return (
    <footer className="app-footer">
      <div className="footer-shell">
        <div className="footer-top">
          <div className="footer-brand-block">
            <span className="mini-badge">FreshCart</span>
            <h2>Belanja harian yang terasa lebih cepat, rapi, dan nyaman.</h2>
            <p>
              FreshCart membantu kamu simpan wishlist, atur cart, dan checkout
              dengan alur yang sederhana dari satu tempat.
            </p>
          </div>

          <div className="footer-grid">
            <section className="footer-card">
              <p className="footer-card-title">Navigasi Cepat</p>
              <div className="footer-link-list">
                {links.map((link) => (
                  <button
                    key={link.key}
                    className="footer-link-pill"
                    onClick={() => onNavigate(link.key)}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="footer-card">
              <p className="footer-card-title">Yang Bisa Kamu Lakukan</p>
              <div className="footer-feature-list">
                <div className="footer-feature-row">
                  <AppIcon type="heart" className="content-icon soft" />
                  <span>Simpan produk favorit ke wishlist</span>
                </div>
                <div className="footer-feature-row">
                  <AppIcon type="cart" className="content-icon soft" />
                  <span>Kelola cart dan checkout lebih cepat</span>
                </div>
                <div className="footer-feature-row">
                  <AppIcon type="delivery" className="content-icon soft" />
                  <span>Pantau status order langsung dari profile</span>
                </div>
              </div>
            </section>

            <section className="footer-card footer-note-card">
              <p className="footer-card-title">Info App</p>
              <div className="footer-note-list">
                <span className="footer-note-pill">React + Vite</span>
                <span className="footer-note-pill">Firebase Auth</span>
                <span className="footer-note-pill">Cloud Firestore</span>
                <span className="footer-note-pill">Responsive Layout</span>
              </div>
            </section>
          </div>
        </div>

        <div className="footer-bottom">
          <p>FreshCart</p>
          <span>Smart grocery flow for daily shopping.</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
