import { useEffect, useRef, useState } from 'react';
import { IconLock } from './Icons.jsx';
import { Modal, Note, PasswordInput } from './ui.jsx';
import { useVault } from '../vault/VaultContext.jsx';
import { useToast } from './Toast.jsx';
import { fetchRecord, getKey, setupVault, unlock } from '../vault.js';
import { errText } from '../lib/utils.js';

const MAX = 10 * 1024 * 1024;

/** Foto's toevoegen. Met "Extra privé" worden ze eerst in deze browser versleuteld, vóór de upload. */
export default function PhotoDialog({ people, initialPerson, onSaved, onClose }) {
  const vault = useVault();
  const toast = useToast();
  const [persoon, setPersoon] = useState(initialPerson || '');
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [bijschrift, setBijschrift] = useState('');
  const [prive, setPrive] = useState(false);
  const [record, setRecord] = useState(undefined); // undefined = laden, null = nog niet ingesteld, 'fout' = niet op te halen
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const sorted = [...people].sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));

  useEffect(() => { fetchRecord().then(setRecord, () => setRecord('fout')); }, []);
  useEffect(() => {
    if (!files[0]) { setPreview(null); return undefined; }
    const u = URL.createObjectURL(files[0]);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [files]);

  const pick = (list) => {
    setMsg(null);
    const arr = Array.from(list || []);
    const bad = arr.find((f) => !f.type.startsWith('image/'));
    if (bad) { setMsg({ text: `"${bad.name}" is geen afbeelding.`, err: true }); return; }
    const big = arr.find((f) => f.size > MAX * 3); // wordt verkleind; heel grote bestanden weigeren
    if (big) { setMsg({ text: `"${big.name}" is te groot.`, err: true }); return; }
    setFiles(arr);
  };

  const needSetup = prive && !getKey() && record === null;
  const needUnlock = prive && !getKey() && !!record && record !== 'fout';
  const cantCheck = prive && !getKey() && (record === 'fout' || record === undefined);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!files.length) { setMsg({ text: 'Kies eerst een foto.', err: true }); return; }
    setBusy(true);
    try {
      if (prive && !getKey()) {
        if (cantCheck) throw new Error('Kon niet controleren of je al een tweede wachtwoord hebt. Probeer het opnieuw.');
        if (needSetup) {
          if (pw.length < 8) throw new Error('Kies minstens 8 tekens.');
          if (pw !== pw2) throw new Error('De twee wachtwoorden zijn niet gelijk.');
          await setupVault(pw, vault.user.id);
        } else if (!(await unlock(pw))) throw new Error('Tweede wachtwoord klopt niet.');
      }
      const r = await vault.uploadPhotos(files, persoon || null, (text) => setMsg({ text }), {
        encryptKey: prive ? getKey() : null, bijschrift: bijschrift.trim() || null
      });
      if (r.failed) {
        setMsg({ text: `${r.made} bewaard, ${r.failed} mislukt (${r.lastErr}).`, err: true });
        setBusy(false);
        return;
      }
      toast(r.made === 1 ? 'Foto bewaard.' : `${r.made} foto's bewaard.`);
      onSaved();
    } catch (x) {
      setBusy(false);
      if (!vault.authFailed(x)) setMsg({ text: errText(x), err: true });
    }
  };

  return (
    <Modal title="Foto toevoegen" onClose={onClose} onSubmit={submit} dismissable={!files.length}
      footer={<>
        <button type="button" className="btn" onClick={onClose}>Annuleren</button>
        <button type="submit" className="btn primary" disabled={busy || !files.length || cantCheck}>
          {busy ? 'Bezig…' : prive ? 'Versleutel en bewaar' : files.length > 1 ? `Bewaar ${files.length} foto's` : 'Bewaar foto'}
        </button>
      </>}>
      <div className="dropzone" onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files); }}>
        {preview ? <img src={preview} alt="Gekozen foto" /> : <span>Klik (of sleep hierheen) om foto's te kiezen</span>}
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => pick(e.target.files)} aria-label="Foto's kiezen" />
      </div>
      {files.length > 1 && <p className="hint">{files.length} foto's gekozen.</p>}
      <div className="two">
        <label className="field" htmlFor="ph-person">Persoon
          <select id="ph-person" value={persoon} onChange={(e) => setPersoon(e.target.value)}>
            <option value="">Los in de bibliotheek</option>
            {sorted.map((p) => <option key={p.id} value={p.id}>{p.naam}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="ph-cap">Bijschrift (optioneel)
          <input id="ph-cap" type="text" value={bijschrift} onChange={(e) => setBijschrift(e.target.value)} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={prive} onChange={(e) => setPrive(e.target.checked)} />
        <span><b><IconLock width={14} height={14} /> Extra privé</b><small>Wordt in deze browser versleuteld met je tweede wachtwoord, voordat er iets wordt geüpload. Zelfs Supabase kan hem dan niet bekijken.</small></span>
      </label>
      {needSetup && (
        <div className="vault-box">
          <p className="hint warn">Eerste keer: kies een tweede wachtwoord (anders dan je inlog). Ben je het kwijt, dan zijn deze foto's voorgoed weg. Niemand kan ze herstellen.</p>
          <div className="two">
            <label className="field" htmlFor="ph-pw">Tweede wachtwoord
              <PasswordInput id="ph-pw" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </label>
            <label className="field" htmlFor="ph-pw2">Herhaal
              <PasswordInput id="ph-pw2" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </label>
          </div>
        </div>
      )}
      {cantCheck && <p className="hint warn">{record === undefined ? 'Even controleren of je al een tweede wachtwoord hebt…' : 'Kon niet controleren of je al een tweede wachtwoord hebt. Controleer je verbinding en open dit venster opnieuw.'}</p>}
      {needUnlock && (
        <div className="vault-box">
          <label className="field" htmlFor="ph-pw">Tweede wachtwoord
            <PasswordInput id="ph-pw" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
        </div>
      )}
      <Note msg={msg} role="alert" />
    </Modal>
  );
}
