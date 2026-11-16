import { useCallback, useEffect, useRef, useState } from 'react';
import { sb, CONFIG_OK } from './lib/supabase.js';
import { IDLE_MS } from './lib/constants.js';
import { errText, isAuthErr } from './lib/utils.js';
import { clearVault, useVaultKey } from './vault.js';
import { VaultProvider } from './vault/VaultContext.jsx';
import { useModel } from './vault/model.js';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import ChatsView from './components/ChatsView.jsx';
import PersonenView from './components/PersonenView.jsx';
import FotosView from './components/FotosView.jsx';
import BeheerView from './components/BeheerView.jsx';
import ProfilePanel from './components/ProfilePanel.jsx';
import PasteDialog from './components/PasteDialog.jsx';
import Lightbox from './components/Lightbox.jsx';
import PhotoDialog from './components/PhotoDialog.jsx';
import PhotoEditDialog from './components/PhotoEditDialog.jsx';
import VaultDialog from './components/VaultDialog.jsx';
import PersonDialog from './components/PersonDialog.jsx';
import QuickLogDialog from './components/QuickLogDialog.jsx';
import { IconChat, IconHome, IconImage, IconLock, IconSettings, IconUsers } from './components/Icons.jsx';

const NAV = [
  ['overzicht', 'Overzicht', IconHome],
  ['chats', 'Chats', IconChat],
  ['personen', 'Personen', IconUsers],
  ['fotos', "Foto's", IconImage],
  ['beheer', 'Beheer', IconSettings],
];

const wide = () => typeof window !== 'undefined' && window.innerWidth >= 1200;

export function Shell({ onLogout }) {
  const { people, chats, fotos } = useModel();
  const key = useVaultKey();
  const [view, setView] = useState('overzicht');
  const [selectedId, setSelectedId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pane, setPane] = useState('list');        // alleen telefoon: lijst of gesprek
  const [paste, setPaste] = useState(null);        // { persoon, chatId }
  const [lightbox, setLightbox] = useState(null);  // { ids, index }
  const [photoDlg, setPhotoDlg] = useState(null);  // { persoon }
  const [photoEdit, setPhotoEdit] = useState(null); // foto-id
  const [vaultDlg, setVaultDlg] = useState(false);
  const [personDlg, setPersonDlg] = useState(null); // { id: string|null }
  const [quick, setQuick] = useState(null);         // persoon-id

  const selected = people.find((p) => p.id === selectedId) || null;

  // In de chatweergave op een breed scherm meteen het meest recente gesprek tonen.
  useEffect(() => {
    if (view === 'chats' && !selectedId && wide()) {
      const first = [...people].filter((p) => p.chatCount).sort((a, b) => ((a.lastChat || '') < (b.lastChat || '') ? 1 : -1))[0];
      if (first) setSelectedId(first.id);
    }
  }, [view, selectedId, people]);

  const goChats = useCallback((id) => {
    setSelectedId(id);
    setView('chats');
    setPane('conv');
    setProfileOpen(wide());
  }, []);
  const openProfile = useCallback((id) => { setSelectedId(id); setProfileOpen(true); }, []);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  const openPerson = useCallback((id) => setPersonDlg({ id }), []);
  const openPaste = useCallback((persoon, chatId = null) => setPaste({ persoon, chatId }), []);
  const personOf = (id) => people.find((p) => p.id === id) || null;

  const profile = (
    <ProfilePanel
      person={selected}
      chats={chats}
      fotos={fotos}
      onClose={closeProfile}
      onOpenChats={goChats}
      onOpenPhoto={(ids, index) => setLightbox({ ids, index })}
      onAddPhoto={(id) => setPhotoDlg({ persoon: id })}
      onEdit={openPerson}
      onQuickLog={setQuick}
      onPaste={openPaste}
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
        <button type="button" className="nav-btn nav-out" onClick={() => onLogout('')}>
          <IconLock />
          <span>Uitloggen</span>
        </button>
      </nav>

      <main className="main">
        {view === 'overzicht' && (
          <Dashboard people={people} chats={chats} fotos={fotos} onOpenPerson={openProfile} onOpenChats={goChats}
            onQuickLog={setQuick} onNewPerson={() => openPerson(null)} onPaste={() => openPaste(null)} />
        )}
        {view === 'chats' && (
          <ChatsView
            people={people}
            chats={chats}
            selectedId={selectedId}
            onSelect={(id) => { setSelectedId(id); if (!wide()) setProfileOpen(false); }}
            onPaste={openPaste}
            profile={profileOpen && selected ? profile : null}
            profileOpen={profileOpen && !!selected}
            onToggleProfile={() => setProfileOpen((o) => !o)}
            pane={pane}
            onPane={setPane}
          />
        )}
        {view === 'personen' && <PersonenView people={people} onOpen={openProfile} onNew={() => openPerson(null)} onQuickLog={setQuick} />}
        {view === 'fotos' && (
          <FotosView
            people={people}
            fotos={fotos}
            onOpen={(ids, index) => setLightbox({ ids, index })}
            onAdd={(id) => setPhotoDlg({ persoon: id })}
            unlocked={!!key}
            onUnlock={() => setVaultDlg(true)}
            onLockNow={clearVault}
          />
        )}
        {view === 'beheer' && <BeheerView />}
      </main>

      {view !== 'chats' && profileOpen && selected && profile}

      {personDlg && (
        <PersonDialog key={personDlg.id || 'nieuw'} personId={personDlg.id}
          onClose={() => setPersonDlg(null)}
          onSaved={(id) => { setPersonDlg(null); openProfile(id); }}
          onDeleted={() => { setPersonDlg(null); setProfileOpen(false); setSelectedId(null); }} />
      )}
      {quick && <QuickLogDialog key={quick} personId={quick} onClose={() => setQuick(null)} onOpenPerson={openProfile} />}
      {paste && (
        <PasteDialog key={paste.chatId || 'nieuw'} people={people} chatId={paste.chatId} initialPerson={paste.persoon || selectedId}
          onClose={() => setPaste(null)}
          onSaved={(c) => { setPaste(null); goChats(c.persoon_id); }} />
      )}
      {photoDlg && (
        <PhotoDialog people={people} initialPerson={photoDlg.persoon}
          onClose={() => setPhotoDlg(null)}
          onSaved={() => { setPhotoDlg(null); if (view !== 'fotos' && !profileOpen) setView('fotos'); }} />
      )}
      {vaultDlg && <VaultDialog onClose={() => setVaultDlg(false)} />}

      {lightbox && (
        <Lightbox
          items={lightbox.ids.map((id) => fotos.find((f) => f.id === id)).filter(Boolean)}
          index={lightbox.index}
          personOf={personOf}
          onClose={() => setLightbox(null)}
          onIndex={(i) => setLightbox((l) => ({ ...l, index: i }))}
          onUnlock={() => setVaultDlg(true)}
          onEdit={(id) => setPhotoEdit(id)}
          onOpenProfile={(id) => { setLightbox(null); openProfile(id); }}
        />
      )}
      {photoEdit && (
        <PhotoEditDialog fotoId={photoEdit} people={people}
          onClose={() => setPhotoEdit(null)}
          onDeleted={() => { setPhotoEdit(null); setLightbox(null); }} />
      )}
    </div>
  );
}

/** Automatisch vergrendelen na inactiviteit; werkt ook na slaapstand (tijdstempel i.p.v. alleen een timer). */
function useIdleLock(active, onIdle) {
  useEffect(() => {
    if (!active) return undefined;
    let last = Date.now();
    const bump = () => { last = Date.now(); };
    const check = () => { if (Date.now() - last > IDLE_MS) onIdle(); };
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'input'];
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true, capture: true }));
    const id = setInterval(check, 30 * 1000);
    const vis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', vis);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, bump, { capture: true }));
      clearInterval(id);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [active, onIdle]);
}

export default function App() {
  const [phase, setPhase] = useState('boot');   // boot | login | app
  const [user, setUser] = useState(null);
  const [loginMsg, setLoginMsg] = useState('');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const lock = useCallback(async (msg = '') => {
    clearVault();                    // sleutel van extra privé foto's direct weg
    if (phaseRef.current !== 'app') return;
    phaseRef.current = 'login';      // eerst, zodat de SIGNED_OUT-listener niet nog eens lockt
    setUser(null);
    setLoginMsg(msg);
    setPhase('login');
    try { await sb.auth.signOut({ scope: 'local' }); } catch { /* negeren */ }
  }, []);

  const afterLogin = useCallback(async (session) => {
    const { data, error } = await sb.rpc('kluis_is_owner');
    if (error || data !== true) {
      const msg = error
        ? (isAuthErr(error) ? 'Je sessie is verlopen. Log opnieuw in.' : 'Kan de kluis niet bereiken: ' + errText(error))
        : 'Dit account heeft geen toegang tot de kluis.';
      try { await sb.auth.signOut({ scope: 'local' }); } catch { /* negeren */ }
      setLoginMsg(msg);
      setPhase('login');
      return;
    }
    setLoginMsg('');
    setUser(session.user);
    setPhase('app');
  }, []);

  const signIn = useCallback(async (email, password) => {
    setLoginMsg('');
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      setLoginMsg(error && /fetch|network/i.test(error.message || '')
        ? 'Geen verbinding met de server. Probeer het opnieuw.'
        : 'E-mail of wachtwoord klopt niet.');
      return;
    }
    await afterLogin(data.session);
  }, [afterLogin]);

  useEffect(() => {
    if (!CONFIG_OK) return undefined;
    let alive = true;
    sb.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session) afterLogin(data.session); else setPhase('login');
    });
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      // Geen Supabase-calls direct in deze callback (kan vastlopen); daarom setTimeout.
      if (event === 'SIGNED_OUT' && phaseRef.current === 'app') setTimeout(() => lock('Je bent uitgelogd.'), 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [afterLogin, lock]);

  const onIdle = useCallback(() => lock('Automatisch vergrendeld na 15 minuten zonder activiteit.'), [lock]);
  useIdleLock(phase === 'app', onIdle);

  if (!CONFIG_OK) {
    return (
      <main className="login">
        <div className="login-card">
          <h1>Personenkluis</h1>
          <p className="login-err">De Supabase-instellingen ontbreken. Zet <code>VITE_SUPABASE_URL</code> en <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env</code> en start opnieuw.</p>
        </div>
      </main>
    );
  }
  if (phase === 'boot') return <div className="login" aria-busy="true" />;
  if (phase === 'login' || !user) return <Login message={loginMsg} onSubmit={signIn} />;
  return (
    <VaultProvider key={user.id} user={user} onLock={lock}>
      <Shell onLogout={lock} />
    </VaultProvider>
  );
}
