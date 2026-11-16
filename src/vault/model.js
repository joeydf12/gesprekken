import { useMemo } from 'react';
import { useVault } from './VaultContext.jsx';
import { parseChat } from '../lib.js';
import { contactDue } from '../lib/utils.js';

// Plaatshouder voor een vergrendelde (extra privé) foto
export const LOCKED_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="#1d2a33"/><g fill="none" stroke="#8fa6b4" stroke-width="9" stroke-linecap="round"><rect x="80" y="112" width="80" height="62" rx="10"/><path d="M96 112V92a24 24 0 0 1 48 0v20"/></g></svg>'
  );
// Plaatshouder terwijl een gewone foto nog laadt
const LOADING_SRC = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="#8fa6b4" opacity=".25"/></svg>');

const group = (list) => {
  const m = {};
  for (const x of list) (m[x.persoon_id] ||= []).push(x);
  return m;
};
const maxDate = (...ds) => ds.filter(Boolean).reduce((m, d) => (d > m ? d : m), '') || null;

/**
 * Kluisdata in de vorm die de schermen gebruiken:
 * - chats   met `messages` (uit de geplakte tekst)
 * - fotos   met `src` en `vergrendeld`
 * - people  met accounts, avatar, lastChat (laatste contact), tellers en open onderwerpen
 */
export function useModel() {
  const vault = useVault();
  const { data, srcOf } = vault;

  const chats = useMemo(
    () => data.chats.map((c) => ({ ...c, messages: parseChat(c.tekst, c.datum) })),
    [data.chats]
  );

  const fotos = useMemo(
    () => data.fotos.map((f) => {
      const src = srcOf(f);
      return { ...f, profiel: f.is_profielfoto, src: src || (f.versleuteld ? LOCKED_SRC : LOADING_SRC), vergrendeld: !!f.versleuteld && !src };
    }),
    [data.fotos, srcOf]
  );

  const people = useMemo(() => {
    const accBy = group(data.accounts), chatBy = group(chats), fotoBy = group(fotos);
    const logBy = group(data.gesprekken), topicBy = group(data.onderwerpen.filter((t) => !t.gedaan));
    return data.personen.map((p) => {
      const cs = chatBy[p.id] || [];
      const own = (fotoBy[p.id] || []).filter((f) => !f.vergrendeld && !f.src.startsWith('data:'));
      const prof = own.find((f) => f.is_profielfoto) || own[own.length - 1];
      const logs = logBy[p.id] || [];
      return {
        ...p,
        accounts: (accBy[p.id] || []).map((a) => ({ ...a, notitie: a.chat_notitie })),
        chatCount: cs.length,
        messageCount: cs.reduce((s, c) => s + c.messages.length, 0),
        lastChat: maxDate(p.laatst_contact, ...cs.map((c) => c.datum), ...logs.map((g) => g.datum)),
        lastLog: logs[0] || null,
        openTopics: (topicBy[p.id] || []).length,
        due: contactDue(p),
        avatar: prof ? prof.src : null
      };
    });
  }, [data.personen, data.accounts, data.gesprekken, data.onderwerpen, chats, fotos]);

  return { ...vault, chats, fotos, people };
}
