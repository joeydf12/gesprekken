import { useState } from 'react';
import { useVault } from '../vault/VaultContext.jsx';
import { Msg, Thumb } from './ui.jsx';

export default function FotosTab({ onOpenPhoto }) {
  const { data, urls, uploadPhotos } = useVault();
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onFiles(e) {
    const files = Array.from(e.target.files);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    const r = await uploadPhotos(files, null, (text) => setMsg({ text }));
    setBusy(false);
    setMsg(r.failed
      ? { text: `${r.made} geüpload, ${r.failed} mislukt (${r.lastErr}).`, err: true }
      : { text: `${r.made} foto's toegevoegd.` });
  }

  const ids = data.fotos.map((f) => f.id);
  return (
    <section>
      <div className="row" style={{ marginBottom: 12 }}>
        <label className="btn primary" htmlFor="libUpload" style={{ textAlign: 'center' }} aria-disabled={busy}>Foto's toevoegen</label>
        <input id="libUpload" type="file" accept="image/*" multiple hidden disabled={busy} onChange={onFiles} />
      </div>
      <Msg msg={msg} />
      <div className="grid">
        {data.fotos.length
          ? data.fotos.map((f) => <Thumb key={f.id} foto={f} url={urls[f.pad]?.url} onOpen={(id) => onOpenPhoto(id, ids)} />)
          : <div className="empty" style={{ gridColumn: '1/-1' }}><b>Je fotobibliotheek is leeg</b>Voeg foto's toe, los of bij een persoon.</div>}
      </div>
    </section>
  );
}
