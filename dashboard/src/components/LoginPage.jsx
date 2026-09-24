import { useState } from 'react';
import {
  Shield,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { login } from '../api';
import './LoginPage.css';

export default function LoginPage({ onLoginSuccess }) {
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
    <div className="login-page">
      <div className="login-orb login-orb--1" />
      <div className="login-orb login-orb--2" />

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Shield size={28} className="text-cyan" />
          </div>
          <h1 className="login-title">EMM COMMAND CONSOLE</h1>
          <p className="login-subtitle">Enterprise Device Fleet Authentication</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error" id="login-error">
              <AlertCircle size={16} className="text-danger flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="login-username" className="form-label">
              <User size={13} className="text-muted" />
              <span>Manager Username</span>
            </label>
            <input
              id="login-username"
              type="text"
              className="form-input"
              placeholder="e.g. admin or manager"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              <Lock size={13} className="text-muted" />
              <span>Security Key / Password</span>
            </label>
            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(p => !p)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg login-submit-btn"
            disabled={loading || !username.trim() || !password.trim()}
            id="login-btn"
          >
            {loading ? (
              <>
                <RefreshCw size={15} className="spin-icon" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Access Console</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Restricted to authorized fleet operators.</p>
        </div>
      </div>
    </div>
  );
}
