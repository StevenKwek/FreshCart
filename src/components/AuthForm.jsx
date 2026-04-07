import { useEffect, useState } from 'react';
import AppIcon from './AppIcon';

const initialFields = {
  name: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function AuthForm({ mode, onSwitchMode, onSubmit }) {
  const [form, setForm] = useState(initialFields);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [allowManualEntry, setAllowManualEntry] = useState(false);

  const isRegister = mode === 'register';
  const isForgotPassword = mode === 'forgot';
  const passwordChecks = {
    length: form.password.length >= 8,
    letter: /[A-Za-z]/.test(form.password),
    number: /\d/.test(form.password),
  };

  useEffect(() => {
    setForm(initialFields);
    setFieldErrors({});
    setError('');
    setSuccessMessage('');
    setShowPassword(false);
    setAllowManualEntry(false);
  }, [mode]);

  const validateField = (fieldName, formValue = form) => {
    const value = formValue[fieldName] || '';

    if (fieldName === 'name') {
      if (!isRegister) {
        return '';
      }

      if (!value.trim()) {
        return 'Full name is required.';
      }

      if (value.trim().length < 2) {
        return 'Full name must be at least 2 characters.';
      }
    }

    if (fieldName === 'username') {
      if (isForgotPassword) {
        return '';
      }

      if (!value.trim()) {
        return isRegister
          ? 'Username is required.'
          : 'Enter your username or email.';
      }

      if (
        isRegister &&
        !/^[a-z0-9._]{3,20}$/.test(value.trim().toLowerCase())
      ) {
        return 'Use 3-20 lowercase letters, numbers, dots, or underscores.';
      }
    }

    if (fieldName === 'email') {
      if (!isRegister && !isForgotPassword) {
        return '';
      }

      if (!value.trim()) {
        return 'Email is required.';
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase())) {
        return 'Enter a valid email address.';
      }
    }

    if (fieldName === 'password') {
      if (isForgotPassword) {
        return '';
      }

      if (!value.trim()) {
        return 'Password is required.';
      }

      if (isRegister) {
        if (value.length < 8) {
          return 'Password must be at least 8 characters.';
        }

        if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
          return 'Password must contain at least one letter and one number.';
        }
      }
    }

    if (fieldName === 'confirmPassword') {
      if (!isRegister) {
        return '';
      }

      if (!value.trim()) {
        return 'Please confirm your password.';
      }

      if (value !== formValue.password) {
        return 'Password confirmation does not match.';
      }
    }

    return '';
  };

  const validateForm = () => {
    const nextErrors = {};
    const fieldsToValidate = isForgotPassword
      ? ['email']
      : isRegister
        ? ['name', 'username', 'email', 'password', 'confirmPassword']
        : ['username', 'password'];

    fieldsToValidate.forEach((fieldName) => {
      const fieldError = validateField(fieldName, form);

      if (fieldError) {
        nextErrors[fieldName] = fieldError;
      }
    });

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
    setError('');
    setSuccessMessage('');
  };

  const handleBlur = (event) => {
    const { name } = event.target;
    const nextError = validateField(name, form);

    setFieldErrors((current) => ({
      ...current,
      [name]: nextError,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      setError('Please review the highlighted fields.');
      return;
    }

    let response;

    try {
      response = await onSubmit({
        mode,
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'We could not complete your request.',
      );
      return;
    }

    if (response?.ok === false) {
      setError(response.error || 'We could not complete your request.');
      return;
    }

    setError('');
    setSuccessMessage(response?.successMessage || '');
    setForm(initialFields);
    setFieldErrors({});
  };

  return (
    <section className="auth-shell">
      <div className="auth-highlight">
        <span className="mini-badge">Smart Grocery</span>
        <h1>
          {isForgotPassword
            ? 'Recover access to FreshCart'
            : isRegister
              ? 'Create your FreshCart account'
              : 'Welcome back to FreshCart'}
        </h1>
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
        <input
          className="autofill-decoy"
          type="text"
          name="auth-username"
          autoComplete="username"
          tabIndex="-1"
          aria-hidden="true"
        />
        <input
          className="autofill-decoy"
          type="password"
          name="auth-password"
          autoComplete="current-password"
          tabIndex="-1"
          aria-hidden="true"
        />
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
              ? 'Create a local account to save your cart, wishlist, and checkout progress on this browser.'
              : 'Sign in with your username or email to continue shopping smarter.'}
        </p>

        {isRegister ? (
          <label className="field-group">
            <span>Full Name</span>
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => setAllowManualEntry(true)}
              placeholder="Enter your full name"
              autoComplete="off"
              readOnly={!allowManualEntry}
            />
            {fieldErrors.name ? (
              <span className="field-feedback error">{fieldErrors.name}</span>
            ) : null}
          </label>
        ) : null}

        {!isForgotPassword ? (
          <label className="field-group">
            <span>{isRegister ? 'Username' : 'Username or Email'}</span>
            <input
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => setAllowManualEntry(true)}
              placeholder={
                isRegister ? 'Choose a username' : 'Enter your username or email'
              }
              autoComplete="off"
              readOnly={!allowManualEntry}
            />
            {isRegister ? (
              <span className="field-hint">
                Use 3-20 lowercase letters, numbers, dots, or underscores.
              </span>
            ) : null}
            {fieldErrors.username ? (
              <span className="field-feedback error">{fieldErrors.username}</span>
            ) : null}
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
              onBlur={handleBlur}
              onFocus={() => setAllowManualEntry(true)}
              placeholder="Enter your email"
              autoComplete="off"
              inputMode="email"
              readOnly={!allowManualEntry}
            />
            {fieldErrors.email ? (
              <span className="field-feedback error">{fieldErrors.email}</span>
            ) : null}
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
                onBlur={handleBlur}
                onFocus={() => setAllowManualEntry(true)}
                placeholder="Enter your password"
                autoComplete="new-password"
                readOnly={!allowManualEntry}
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
            {isRegister ? (
              <div className="password-checklist">
                <span className={passwordChecks.length ? 'is-valid' : ''}>
                  At least 8 characters
                </span>
                <span className={passwordChecks.letter ? 'is-valid' : ''}>
                  Contains a letter
                </span>
                <span className={passwordChecks.number ? 'is-valid' : ''}>
                  Contains a number
                </span>
              </div>
            ) : null}
            {fieldErrors.password ? (
              <span className="field-feedback error">{fieldErrors.password}</span>
            ) : null}
          </label>
        ) : null}

        {isRegister ? (
          <label className="field-group">
            <span>Confirm Password</span>
            <input
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={() => setAllowManualEntry(true)}
              placeholder="Repeat your password"
              autoComplete="new-password"
              readOnly={!allowManualEntry}
            />
            {fieldErrors.confirmPassword ? (
              <span className="field-feedback error">
                {fieldErrors.confirmPassword}
              </span>
            ) : null}
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
