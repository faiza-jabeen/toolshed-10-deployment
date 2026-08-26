import { useState } from 'react';
import { useSessionStore, selectUser, selectSessionStatus } from '../stores/sessionStore.js';
import { LineSkeleton } from './Skeletons.jsx';
import { toast } from '../stores/toastStore.js';

/**
 * Reads the session straight from the store. In task 04 this component's data
 * arrived as props from App, which got it from a context provider. Now App
 * passes it nothing at all.
 */
export function SessionBar() {
  const user = useSessionStore(selectUser);
  const status = useSessionStore(selectSessionStatus);
  const login = useSessionStore((s) => s.login);
  const logout = useSessionStore((s) => s.logout);

  const [creds, setCreds] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try { await login(creds); setCreds({ email: '', password: '' }); }
    catch (err) { toast.fail(err.message); }
    finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    try { await logout(); } finally { setBusy(false); }
  }

  if (status === 'booting') {
    return <div className="session"><LineSkeleton width="9rem" /></div>;
  }

  if (status === 'authenticated') {
    return (
      <div className="session">
        <span className="session__who">
          {user.name} <span className={`badge badge--${user.role}`}>{user.role}</span>
        </span>
        <button className="btn btn--ghost btn--sm btn--on-dark" onClick={signOut} disabled={busy}>
          {busy && <span className="spinner" />}{busy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    );
  }

  return (
    <form className="session session__form" onSubmit={submit}>
      <input className="input input--sm" type="email" placeholder="email" required autoComplete="email"
             value={creds.email} onChange={(e) => setCreds({ ...creds, email: e.target.value })} disabled={busy} />
      <input className="input input--sm" type="password" placeholder="password" required autoComplete="current-password"
             value={creds.password} onChange={(e) => setCreds({ ...creds, password: e.target.value })} disabled={busy} />
      <button className="btn btn--tape btn--sm" type="submit" disabled={busy}>
        {busy && <span className="spinner" />}{busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
