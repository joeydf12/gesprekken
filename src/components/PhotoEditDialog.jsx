import { useState } from 'react';
import { useVault } from '../vault/VaultContext.jsx';
import { useToast } from './Toast.jsx';
import { ConfirmButton, Modal, Note } from './ui.jsx';
import { errText } from '../lib/utils.js';

/** Bijschrift, persoon en profielfoto van een foto aanpassen, of hem verwijderen. */
export default function PhotoEditDialog({ fotoId, people, onClose, onDeleted }) {
  const vault = useVault();
  const toast = useToast();
  const foto = vault.data.fotos.find((f) => f.id === fotoId);
  const [caption, setCaption] = useState(foto?.bijschrift || '');
  const [persoon, setPersoon] = useState(foto?.persoon_id || '');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!foto) return null;
  const sorted = [...people].sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));

  const act = async (fn, label, after = onClose) => {
    setBusy(true);
    try { await fn(); toast(label + ' gelukt.'); after(); } catch (err) {
      setBusy(false);
      if (!vault.authFailed(err)) setMsg({ text: `${label} mislukt: ${errText(err)}`, err: true });
    }
  };

  return (
    <Modal title="Foto bewerken" size="narrow" onClose={onClose}
      onSubmit={(e) => { e.preventDefault(); act(() => vault.updatePhoto(foto, { bijschrift: caption.trim(), persoon_id: persoon }), 'Opslaan'); }}
      footer={<>
        <ConfirmButton label="Verwijderen" className="btn danger" disabled={busy} onConfirm={() => act(() => vault.deletePhoto(foto), 'Verwijderen', onDeleted)} />
        <span className="grow" />
        <button type="submit" className="btn primary" disabled={busy}>Opslaan</button>
      </>}>
      <label className="field" htmlFor="pe-cap">Bijschrift
        <input id="pe-cap" type="text" autoComplete="off" value={caption} onChange={(e) => setCaption(e.target.value)} />
      </label>
      <label className="field" htmlFor="pe-person">Hoort bij
        <select id="pe-person" value={persoon} onChange={(e) => setPersoon(e.target.value)}>
          <option value="">Niemand (los in de bibliotheek)</option>
          {sorted.map((p) => <option key={p.id} value={p.id}>{p.naam}</option>)}
        </select>
      </label>
      {foto.persoon_id && !foto.versleuteld && (
        foto.is_profielfoto
          ? <p className="hint">★ Dit is de profielfoto.</p>
          : <button type="button" className="btn" disabled={busy} onClick={() => act(() => vault.setProfilePhoto(foto), 'Profielfoto instellen')}>Maak profielfoto</button>
      )}
      {foto.versleuteld && <p className="hint">Extra privé foto: blijft versleuteld en kan geen profielfoto worden.</p>}
      <Note msg={msg} role="alert" />
    </Modal>
  );
}
