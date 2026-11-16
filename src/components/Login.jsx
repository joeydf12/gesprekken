import { useState } from 'react';
import { IconLock } from './Icons.jsx';
import { PasswordInput } from './ui.jsx';

export default function Login({ message, onSubmit }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <main className="login">
      <form
        className="login-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await onSubmit(email.trim(), pw);
          setPw('');
          setBusy(false);
        }}
      >
        <div className="login-icon" aria-hidden="true"><IconLock /></div>
        <h1>Personenkluis</h1>
        <p className="login-sub">Alleen voor jou. Log in om verder te gaan.</p>
        <label htmlFor="login-email">
          E-mail
          <input id="login-email" type="email" autoComplete="username" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label htmlFor="login-pw">
          Wachtwoord
          <PasswordInput id="login-pw" required value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        <p className="login-err" role="alert">{message}</p>
        <button type="submit" className="login-btn" disabled={busy}>{busy ? 'Bezig…' : 'Inloggen'}</button>
      </form>
    </main>
  );
}

