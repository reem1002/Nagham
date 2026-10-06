import { useState } from 'react';
import { login, register, continueAsGuest } from '../lib/session.js';
import { getServerUrl, setServerUrl, isNative } from '../api/client.js';
import { IconMusic, IconPhone } from '../components/Icons.jsx';

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [server, setServer] = useState(getServerUrl());
  const [showServer, setShowServer] = useState(isNative && !getServerUrl());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const bind = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      setServerUrl(server);
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.offline ? `Can't reach the server${server ? ` at ${server}` : ''}. Check the address in “Server”.` : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="brand">
        <div className="brand-mark"><IconMusic size={26} /></div>
        <div className="brand-name">
          Nagham
          <small>نغم · your music, offline</small>
        </div>
      </div>
      <h1>{mode === 'login' ? 'Welcome back' : 'Create your library'}</h1>
      <p className="lead">Your songs, on every device. Download once, listen anywhere — even with the screen off.</p>

      <div className="auth-tabs">
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">Sign in</button>
        <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">Sign up</button>
      </div>

      <form onSubmit={submit}>
        {mode === 'register' && (
          <div className="field"><label>Name</label><input className="input" {...bind('name')} required autoComplete="name" dir="auto" /></div>
        )}
        <div className="field"><label>Email</label><input className="input" type="email" {...bind('email')} required autoComplete="email" /></div>
        <div className="field">
          <label>Password</label>
          <input className="input" type="password" {...bind('password')} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </div>
        {showServer ? (
          <div className="field">
            <label>Server address</label>
            <input className="input" value={server} onChange={(e) => setServer(e.target.value)} placeholder="https://your-api.onrender.com or http://192.168.1.5:5000" inputMode="url" />
          </div>
        ) : (
          <button type="button" className="see-all" style={{ marginBottom: 14 }} onClick={() => setShowServer(true)}>
            Server: {server || 'this website'} · change
          </button>
        )}
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>

      <div className="divider">or</div>
      <button className="btn btn-ghost btn-block" onClick={continueAsGuest}>
        <IconPhone size={18} /> Use on this device only
      </button>
      <p className="faint" style={{ fontSize: 12, textAlign: 'center', marginTop: 10 }}>
        No account needed — songs you import stay on this phone. You can sign in later.
      </p>
    </div>
  );
}
