import { useCallback, useEffect, useMemo, useState } from 'react';
import { CHATS, FOTOS, PERSONEN } from './data.js';
import { parseChat } from './lib.js';
import Dashboard from './components/Dashboard.jsx';
import ChatsView from './components/ChatsView.jsx';
import PersonenView from './components/PersonenView.jsx';
import FotosView from './components/FotosView.jsx';
import ProfilePanel from './components/ProfilePanel.jsx';
import PasteDialog from './components/PasteDialog.jsx';
import Lightbox from './components/Lightbox.jsx';
import Login from './components/Login.jsx';
import PhotoDialog from './components/PhotoDialog.jsx';
import VaultDialog from './components/VaultDialog.jsx';
import { decryptToBlob } from './crypto.js';
import { clearVault, useVaultKey } from './vault.js';
import { useAuth, useIdleLock } from './auth.js';
import { IconChat, IconHome, IconImage, IconLock, IconUsers } from './components/Icons.jsx';

const NAV = [
  ['overzicht', 'Overzicht', IconHome],
  ['chats', 'Chats', IconChat],
  ['personen', 'Personen', IconUsers],
  ['fotos', "Foto's", IconImage],
];

// Alleen voor de demo: zelf geplakte chats blijven bewaard in deze browser.
function useStored(key, init) {
  const [v, setV] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : init;
    } catch {
      return init;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* opslag niet beschikbaar, de demo werkt ook zonder */
    }
  }, [key, v]);
  return [v, setV];
}

// Plaatshouder voor een vergrendelde foto
const LOCKED_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="#1d2a33"/><g fill="none" stroke="#8fa6b4" stroke-width="9" stroke-linecap="round"><rect x="80" y="112" width="80" height="62" rx="10"/><path d="M96 112V92a24 24 0 0 1 48 0v20"/></g></svg>'
  );

const wide = () => typeof window !== 'undefined' && window.innerWidth >= 1200;

function Shell({ onLogout, mine, setMine }) {
  const [view, setView] = useState('overzicht');
  const [selectedId, setSelectedId] = useState(() => (wide() ? 'p1' : null));
  const [profileOpen, setProfileOpen] = useState(false);
  const [pane, setPane] = useState('list'); // alleen telefoon: lijst of gesprek
  const [paste, setPaste] = useState(null); // null of { persoon }
  const [lightbox, setLightbox] = useState(null); // { ids, index }
  const [extra, setExtra] = useStored('personenkluis-demo-chats', []);
  const [photoDlg, setPhotoDlg] = useState(null); // null of { persoon }
  const [vaultDlg, setVaultDlg] = useState(false);
  const key = useVaultKey();
  const [opened, setOpened] = useState({}); // id -> ontsleutelde blob-URL

  useEffect(() => {
    if (!key) {
      setOpened({});
      return undefined;
    }
    let alive = true;
    const urls = [];
    (async () => {
      const out = {};
      for (const m of mine) {
        if (!m.versleuteld) continue;
        try {
          const b = await decryptToBlob(key, new Uint8Array(await m.blob.arrayBuffer()));
          const u = URL.createObjectURL(b);
          urls.push(u);
          out[m.id] = u;
        } catch {
          /* niet te ontsleutelen met deze sleutel */
        }
      }
      if (alive) setOpened(out);
    })();
    return () => {
      alive = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [key, mine]);

  const allFotos = useMemo(
    () => [
      ...FOTOS,
      ...mine.map((m) => {
        const open = m.versleuteld ? opened[m.id] : m.url;
        return { ...m, src: open || LOCKED_SRC, vergrendeld: !open };
      }),
    ],
    [mine, opened]
  );

  const chats = useMemo(
    () => [...CHATS, ...extra].map((c) => ({ ...c, messages: parseChat(c.tekst, c.datum) })),
    [extra]
  );
  const people = useMemo(
    () =>
      PERSONEN.map((p) => {
        const cs = chats.filter((c) => c.persoon_id === p.id);
        const last = cs.reduce((m, c) => (c.datum > m ? c.datum : m), '');
        const own = allFotos.filter((f) => f.persoon_id === p.id && !f.versleuteld);
        const prof = own.find((f) => f.profiel) || own[0];
        return {
          ...p,
          chatCount: cs.length,
          messageCount: cs.reduce((s, c) => s + c.messages.length, 0),
          lastChat: last || null,
          avatar: prof ? prof.src : null,
        };
      }),
    [chats, allFotos]
  );
  const selected = people.find((p) => p.id === selectedId) || null;

  const goChats = useCallback((id) => {
    setSelectedId(id);
    setView('chats');
    setPane('conv');
    setProfileOpen(wide());
  }, []);
  const openProfile = (id) => {
    setSelectedId(id);
    setProfileOpen(true);
  };
  const closeProfile = () => setProfileOpen(false);
  const photoOf = (id) => people.find((p) => p.id === id) || null;

  const saveChat = (c) => {
    setExtra((x) => [...x, c]);
    setPaste(null);
    goChats(c.persoon_id);
  };

  const profile = (
    <ProfilePanel
      person={selected}
      chats={chats}
      fotos={allFotos}
      onAddPhoto={(id) => setPhotoDlg({ persoon: id })}
      onClose={closeProfile}
      onOpenChats={goChats}
      onOpenPhoto={(ids, index) => setLightbox({ ids, index })}
    />
  );

  return (
    <div className="app">
      <nav className="rail" aria-label="Hoofdmenu">
        <div className="brand" aria-hidden="true">K</div>
        {NAV.map(([id, label, Icon]) => (
          <button
            type="button"
            key={id}
            className="nav-btn"
            aria-current={view === id ? 'page' : undefined}
            onClick={() => {
              setView(id);
              setPane('list');
              setProfileOpen(id === 'chats' && wide() && !!selectedId);
            }}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
        <button type="button" className="nav-btn nav-out" onClick={() => onLogout()}>
          <IconLock />
          <span>Uitloggen</span>
        </button>
      </nav>

      <main className="main">
        {view === 'overzicht' && <Dashboard people={people} chats={chats} fotos={allFotos} onOpenPerson={openProfile} onOpenChats={goChats} />}
        {view === 'chats' && (
          <ChatsView
            people={people}
            chats={chats}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              if (!wide()) setProfileOpen(false);
            }}
            onPaste={(id) => setPaste({ persoon: id })}
            profile={profileOpen && selected ? profile : null}
            profileOpen={profileOpen && !!selected}
            onToggleProfile={() => setProfileOpen((o) => !o)}
            pane={pane}
            onPane={setPane}
          />
        )}
        {view === 'personen' && <PersonenView people={people} onOpen={openProfile} />}
        {view === 'fotos' && <FotosView
            people={people}
            fotos={allFotos}
            onOpen={(ids, index) => setLightbox({ ids, index })}
            onAdd={(id) => setPhotoDlg({ persoon: id })}
            unlocked={!!key}
            onUnlock={() => setVaultDlg(true)}
            onLockNow={clearVault}
          />}
      </main>

      {view !== 'chats' && profileOpen && selected && profile}

      {paste && <PasteDialog people={people} initialPerson={paste.persoon || selectedId} onSave={saveChat} onClose={() => setPaste(null)} />}

      {photoDlg && (
        <PhotoDialog
          people={people}
          initialPerson={photoDlg.persoon}
          onSave={(m) => {
            setMine((x) => [...x, m]);
            setPhotoDlg(null);
            if (view !== 'fotos') setView('fotos');
          }}
          onClose={() => setPhotoDlg(null)}
        />
      )}
      {vaultDlg && <VaultDialog onClose={() => setVaultDlg(false)} />}

      {lightbox && (
        <Lightbox
          items={lightbox.ids.map((id) => allFotos.find((f) => f.id === id)).filter(Boolean)}
          onUnlock={() => setVaultDlg(true)}
          index={lightbox.index}
          personOf={photoOf}
          onClose={() => setLightbox(null)}
          onIndex={(i) => setLightbox((l) => ({ ...l, index: i }))}
          onOpenProfile={(id) => {
            setLightbox(null);
            openProfile(id);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  const { status, error, busy, signIn, signOut } = useAuth();
  const [mine, setMine] = useState([]); // demo: eigen foto's, alleen in het geheugen van dit tabblad (overleven uitloggen, niet herladen)
  const lock = useCallback(() => signOut('Automatisch vergrendeld na 15 minuten.'), [signOut]);
  useIdleLock(status === 'in', lock);
  if (status === 'checking') return <div className="login" aria-busy="true" />;
  if (status !== 'in') return <Login error={error} busy={busy} onSubmit={signIn} />;
  return <Shell onLogout={() => signOut()} mine={mine} setMine={setMine} />;
}
