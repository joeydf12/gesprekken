import { useState } from 'react';
import { IconLock } from './Icons.jsx';
import { DEMO_PASSWORD, REAL } from '../auth.js';

export default function Login({ error, busy, onSubmit }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  return (
    <main className="login">
      <form
        className="login-card"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(email.trim(), pw);
        }}
      >
        <div className="login-icon" aria-hidden="true">
          <IconLock />
        </div>
        <h1>Personenkluis</h1>
        <p className="login-sub">Alleen voor jou. Log in om verder te gaan.</p>
        {REAL && (
          <label>
            E-mail
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        )}
        <label>
          Wachtwoord
          <input type="password" autoComplete="current-password" required autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        <p className="login-err" role="alert">{error}</p>
        <button type="submit" className="login-btn" disabled={busy}>
          {busy ? 'Bezig…' : 'Inloggen'}
        </button>
        {!REAL && (
          <p className="login-demo">
            Demo-versie: het wachtwoord is <b>{DEMO_PASSWORD}</b>. Dit slot is alleen om het gevoel te testen; echte beveiliging komt van Supabase.
          </p>
        )}
      </form>
    </main>
  );
}
