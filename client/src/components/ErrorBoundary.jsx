import { Component } from 'react';

/** Shows what went wrong instead of a blank dark screen, with a way out. */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info?.componentStack);
  }

  resetApp = async () => {
    try {
      const token = localStorage.getItem('nagham.token');
      const server = localStorage.getItem('nagham.server');
      localStorage.clear();
      if (token) localStorage.setItem('nagham.token', token);
      if (server !== null) localStorage.setItem('nagham.server', server);
    } catch {
      /* ignore */
    }
    window.location.href = '/';
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="auth" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 26 }}>Something went wrong</h1>
        <p className="lead">The screen hit an error. Your music and downloads are safe.</p>
        <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 12, fontSize: 12, color: 'var(--danger)', direction: 'ltr' }}>
          {String(this.state.error?.message || this.state.error)}
        </pre>
        <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={() => (window.location.href = '/')}>Reload</button>
        <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={this.resetApp}>Reset player state & reload</button>
      </div>
    );
  }
}
