import { useState } from 'react';
import { Modal, Note, PasswordInput } from './ui.jsx';
import { unlock } from '../vault.js';
import { errText } from '../lib/utils.js';

/** Tweede wachtwoord invullen om extra privé foto's te tonen. De sleutel blijft alleen in het geheugen. */
export default function VaultDialog({ onClose }) {
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg({ text: 'Ontgrendelen…' });
    try {
      if (await unlock(pw)) { onClose(); return; }
      setMsg({ text: 'Wachtwoord klopt niet.', err: true });
    } catch (x) {
      setMsg({ text: errText(x), err: true });
    }
    setBusy(false);
  };
  return (
    <Modal title="Extra privé ontgrendelen" size="narrow" onClose={onClose} onSubmit={submit}
      footer={<>
        <button type="button" className="btn" onClick={onClose}>Annuleren</button>
        <button type="submit" className="btn primary" disabled={busy || !pw}>Ontgrendel</button>
      </>}>
      <label className="field" htmlFor="vd-pw">Tweede wachtwoord
        <PasswordInput id="vd-pw" autoFocus autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} />
      </label>
      <p className="hint">Blijft ontgrendeld tot je uitlogt, de pagina herlaadt of op "Nu vergrendelen" tikt.</p>
      <Note msg={msg} role="alert" />
    </Modal>
  );
}
