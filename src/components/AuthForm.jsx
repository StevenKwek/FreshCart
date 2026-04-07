import { useEffect, useState } from 'react';
import AppIcon from './AppIcon';

const initialFields = {
  name: '',
  username: '',
  email: '',
  password: '',
};

function AuthForm({ mode, onSwitchMode, onSubmit }) {
  const [form, setForm] = useState(initialFields);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isRegister = mode === 'register';
  const isForgotPassword = mode === 'forgot';

  useEffect(() => {
    setForm(initialFields);
    setError('');
    setSuccessMessage('');
    setShowPassword(false);
  }, [mode]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (isForgotPassword) {
      if (!form.email.trim()) {
        setError('Please enter your email first.');
        return;
      }

      setError('');
      setSuccessMessage(
        'Reset password link has been sent to your email. Please check your inbox.',
      );
      setForm(initialFields);
      return;
    }

    if (
      !form.username.trim() ||
      !form.password.trim() ||
      (isRegister && (!form.name.trim() || !form.email.trim()))
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    setError('');
    onSubmit({
      name: isRegister ? form.name.trim() : form.username.trim(),
      username: form.username.trim(),
      email: isRegister ? form.email.trim() : '',
    });
    setForm(initialFields);
  };

  return (
    <section className="auth-shell">
      <div className="auth-highlight">
        <span className="mini-badge">Smart Grocery</span>
        <h1>{isRegister ? 'Create your FreshCart account' : 'Welcome back to FreshCart'}</h1>
        <p>
          Shop groceries faster with smart recommendations, a simple wishlist, and
          clean checkout flows.
        </p>
        <div className="auth-benefits">
          <div className="benefit-card">
            <strong className="icon-text">
              <AppIcon type="easy" className="content-icon soft" />
              Belanja mudah
            </strong>
            <span>Produk pokok sehari-hari dalam satu tampilan rapi.</span>
          </div>
          <div className="benefit-card">
            <strong className="icon-text">
              <AppIcon type="clock" className="content-icon soft" />
              Hemat waktu
            </strong>
            <span>Cari, filter, simpan favorit, lalu checkout dengan cepat.</span>
          </div>
          <div className="benefit-card">
            <strong className="icon-text">
              <AppIcon type="spark" className="content-icon soft" />
              Rekomendasi pintar
            </strong>
            <span>Temukan bahan sesuai kebutuhan harian kamu.</span>
          </div>
        </div>
      </div>

      <form className="auth-card" onSubmit={handleSubmit} autoComplete="off">
        <p className="section-eyebrow">
          {isForgotPassword ? 'Reset Password' : isRegister ? 'Register' : 'Login'}
        </p>
        <h2>
          {isForgotPassword
            ? 'Reset your password in one step'
            : isRegister
              ? 'Start fresh in minutes'
              : 'Sign in to continue'}
        </h2>
        <p className="section-copy">
          {isForgotPassword
            ? 'Enter your email and we will simulate sending a reset link for your account.'
            : isRegister
            ? 'No backend needed here, just a simple local auth UI.'
            : 'Sign in with your username and password to continue shopping smarter.'}
        </p>

        {isRegister ? (
          <label className="field-group">
            <span>Full Name</span>
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="off"
            />
          </label>
        ) : null}

        {!isForgotPassword ? (
          <label className="field-group">
            <span>Username</span>
            <input
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="Enter your username"
              autoComplete="off"
            />
          </label>
        ) : null}

        {isRegister || isForgotPassword ? (
          <label className="field-group">
            <span>Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="off"
              inputMode="email"
            />
          </label>
        ) : null}

        {!isForgotPassword ? (
          <label className="field-group">
            <span>Password</span>
            <div className="password-input-wrap">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="new-password"
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <AppIcon
                  type={showPassword ? 'eyeOff' : 'eye'}
                  className="password-toggle-icon"
                />
              </button>
            </div>
          </label>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
        {successMessage ? <p className="form-success">{successMessage}</p> : null}

        <button className="primary-button full-width" type="submit">
          {isForgotPassword
            ? 'Send Reset Link'
            : isRegister
              ? 'Create Account'
              : 'Login'}
        </button>

        {!isForgotPassword ? (
          <>
            {!isRegister ? (
              <button
                className="forgot-password-button"
                type="button"
                onClick={() => onSwitchMode('forgot')}
              >
                Forgot Password?
              </button>
            ) : null}

            <button
              className="text-button"
              type="button"
              onClick={() => onSwitchMode(isRegister ? 'login' : 'register')}
            >
              {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
            </button>
          </>
        ) : (
          <button
            className="text-button"
            type="button"
            onClick={() => onSwitchMode('login')}
          >
            Back to Login
          </button>
        )}
      </form>
    </section>
  );
}

export default AuthForm;
