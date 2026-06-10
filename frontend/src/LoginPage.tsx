import React, { useState } from 'react';
import './LoginPage.scss';
import { authApi, ApiError } from './api';

interface LoginPageProps {
  onAuthenticated: (user: { id: string; email: string }) => void;
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = mode === 'login'
        ? await authApi.login(email, password)
        : await authApi.register(email, password);
      onAuthenticated(user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-title">Live Wallpaper Editor</div>
        <div className="login-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="login-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
          />
        </div>
        {error && <div className="login-error">{error}</div>}
        <button className="login-submit" type="submit" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
        <div className="login-toggle">
          {mode === 'login' ? (
            <>No account? <button type="button" onClick={() => { setMode('register'); setError(''); }}>Register</button></>
          ) : (
            <>Already have an account? <button type="button" onClick={() => { setMode('login'); setError(''); }}>Log in</button></>
          )}
        </div>
      </form>
    </div>
  );
}
