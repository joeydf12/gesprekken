import { useCallback, useEffect, useState } from 'react';
import { sb } from '../lib/supabase.js';
import { errText } from '../lib/utils.js';
import { useToast } from './Toast.jsx';
import { ConfirmButton, Note } from './ui.jsx';

/** Tweestapsverificatie (TOTP) aan- of uitzetten voor je account. */
export default function MfaCard() {
  const toast = useToast();
  const [factors, setFactors] = useState(null);   // null = laden
  const [enroll, setEnroll] = useState(null);     // { id, qr, secret }
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await sb.auth.mfa.listFactors();
    if (error) { setMsg({ text: errText(error), err: true }); setFactors([]); return; }
    setFactors((data?.all || []).filter((f) => f.factor_type === 'totp'));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const verified = (factors || []).filter((f) => f.status === 'verified');

  async function start() {
    setBusy(true); setMsg(null);
    try {
      // Half afgemaakte eerdere pogingen opruimen.
      for (const f of (factors || []).filter((x) => x.status !== 'verified')) await sb.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Personenkluis ' + new Date().toISOString().slice(0, 10) });
      if (error) throw error;
      setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (err) { setMsg({ text: 'Starten mislukt: ' + errText(err), err: true }); }
    setBusy(false);
  }

  async function confirm(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.replace(/\s/g, '') });
    setBusy(false);
    if (error) { setMsg({ text: 'Code klopt niet. Wacht op de volgende code en probeer opnieuw.', err: true }); return; }
    setEnroll(null); setCode('');
    toast('Tweestapsverificatie staat aan.');
    refresh();
  }

  async function cancel() {
    if (enroll) { try { await sb.auth.mfa.unenroll({ factorId: enroll.id }); } catch { /* negeren */ } }
    setEnroll(null); setCode(''); setMsg(null);
    refresh();
  }

  async function disable(id) {
    setBusy(true); setMsg(null);
    const { error } = await sb.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    if (error) { setMsg({ text: 'Uitzetten mislukt: ' + errText(error), err: true }); return; }
    toast('Tweestapsverificatie staat uit.');
    refresh();
  }

  return (
    <section className="card c8 stack">
      <h2>Tweestapsverificatie</h2>
      {factors === null ? <p className="muted">Laden…</p> : verified.length ? (
        <>
          <p><span className="ok">Aan.</span> Bij het inloggen vraagt de app na je wachtwoord ook een code uit je authenticator-app.</p>
          <p className="hint">Maak het helemaal dicht: voer <code>supabase-migratie-3-tweestaps.sql</code> uit. Dan weigert de database zélf alles zonder tweede stap, ook als iemand je wachtwoord heeft en de app omzeilt.</p>
          <div className="row-actions">
            {verified.map((f) => (
              <ConfirmButton key={f.id} label="Uitzetten" className="btn" disabled={busy} onConfirm={() => disable(f.id)} />
            ))}
          </div>
          <p className="hint warn">Zet dit niet uit als de database-regel (migratie 3) actief is: dan kom je zelf niet meer bij de kluis tot je die regel terugdraait.</p>
        </>
      ) : enroll ? (
        <form className="mfa-enroll" onSubmit={confirm}>
          <p>1. Scan deze QR-code met een authenticator-app (bijv. Google Authenticator, Microsoft Authenticator, Authy of 1Password).</p>
          <img className="mfa-qr" src={enroll.qr} alt="QR-code voor je authenticator-app" />
          <p className="hint">Lukt scannen niet? Vul deze sleutel handmatig in: <code className="mfa-secret">{enroll.secret}</code></p>
          <label className="field" htmlFor="mfa-new">2. Vul de code van 6 cijfers in
            <input id="mfa-new" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
          </label>
          <div className="row-actions">
            <button type="button" className="btn" onClick={cancel} disabled={busy}>Annuleren</button>
            <button type="submit" className="btn primary" disabled={busy || code.replace(/\s/g, '').length !== 6}>Bevestigen</button>
          </div>
        </form>
      ) : (
        <>
          <p><span className="bad">Uit.</span> Nu is je wachtwoord de enige sleutel. Met tweestapsverificatie heeft iemand ook je telefoon nodig.</p>
          <div><button type="button" className="btn primary" onClick={start} disabled={busy}>Aanzetten</button></div>
        </>
      )}
      <Note msg={msg} role="alert" />
    </section>
  );
}
