import { useState } from 'react';
import { Lock, User, ArrowRight, Eye, EyeOff, AlertCircle, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react';
import { login } from '../api';
import './LoginPage.css';

export default function LoginPage({ onLoginSuccess, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const data = await login(username.trim(), password);
      onLoginSuccess(data.manager);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page" id="login-page">
      {/* Top Header Logo & Navigation */}
      <div className="login-top-bar">
        {onBack && (
          <button className="login-back-pill" onClick={onBack} aria-label="Go back">
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        )}
        <h2 className="login-brand-logo">
          APIX<span>E</span>R
        </h2>
        <div className="top-spacer" />
      </div>

      {/* Hero Anime Character Image */}
      <div className="login-hero-wrapper">
        <img
          src="/login-hero.png"
          alt="Login Hero"
          className="login-hero-img"
        />
      </div>

      {/* Main Login Sheet Card */}
      <div className="login-sheet-container">
        <div className="login-card-inner">
          <div className="login-heading-section">
            <h1 className="login-main-title">WELCOME BACK</h1>
            <p className="login-sub-description">
              Enter your manager credentials to access the fleet console.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error-alert" id="login-error">
                <AlertCircle size={16} className="error-icon flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="login-input-group">
              <label className="login-field-label">MANAGER USERNAME</label>
              <div className="login-input-box">
                <User size={18} className="input-field-icon" />
                <input
                  type="text"
                  placeholder="e.g. admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="login-text-input"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="login-input-group">
              <label className="login-field-label">PASSWORD / SECURITY PIN</label>
              <div className="login-input-box">
                <Lock size={18} className="input-field-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-text-input"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Dark & White Pill Submit Button */}
            <button
              type="submit"
              className="login-submit-pill-btn"
              disabled={loading}
              id="login-submit-btn"
            >
              {loading ? (
                <>
                  <RefreshCw size={17} className="animate-spin-icon" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span className="submit-btn-text">Sign In to Console</span>
                  <div className="submit-btn-arrow-circle">
                    <ArrowRight size={18} />
                  </div>
                </>
              )}
            </button>
          </form>

          {/* Bottom Security Note */}
          <div className="login-footer-security">
            <ShieldCheck size={14} className="heart-icon" />
            <span>Build with love by Zxtni</span>
          </div>
        </div>
      </div>
    </div>
  );
}
