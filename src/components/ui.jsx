import { useEffect, useId, useRef, useState } from 'react';
import { IconClose } from './Icons.jsx';

/* ---------- Venster (modal) ----------
   Houdt een stapel bij, zodat Escape alleen het bovenste venster sluit. */
const stack = [];
function useTopEscape(onClose) {
  const id = useId();
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    stack.push(id);
    const onKey = (e) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === id) { e.stopPropagation(); ref.current(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const i = stack.lastIndexOf(id);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [id]);
}

/**
 * Venster in de stijl van de app. Met `onSubmit` wordt de inhoud een <form>.
 * Gebruik: <Modal title="…" onClose={…} footer={<knoppen/>}>inhoud</Modal>
 */
export function Modal({ title, onClose, onSubmit, footer, children, size = "", labelId, dismissable = true }) {
  useTopEscape(onClose);
  const autoId = useId();
  const tid = labelId || autoId;
  const Tag = onSubmit ? 'form' : 'div';
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={tid}
      onMouseDown={(e) => dismissable && e.target === e.currentTarget && onClose()}>
      <Tag className={'sheet' + (size ? ' ' + size : '')} onSubmit={onSubmit} noValidate={onSubmit ? true : undefined}>
        <header className="sheet-head">
          <h2 id={tid}>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Sluiten"><IconClose /></button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </Tag>
    </div>
  );
}

/** Statusregel onder een formulier. msg = { text, err } */
export function Note({ msg, role }) {
  return <p className={'hint' + (msg?.err ? ' warn' : '')} role={role}>{msg?.text || ''}</p>;
}

/** Knop die twee keer getikt moet worden ("Zeker weten?"). */
export function ConfirmButton({ label, onConfirm, className = 'btn danger', disabled, ...rest }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button type="button" className={className} disabled={disabled} {...rest}
      onClick={() => { if (!armed) { setArmed(true); return; } setArmed(false); onConfirm(); }}>
      {armed ? 'Zeker weten?' : label}
    </button>
  );
}

const EyeOpen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeClosed = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.6 18.6 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><path d="M2 2l20 20" />
  </svg>
);

/** Wachtwoordveld met oogje om het wachtwoord te tonen of te verbergen. */
export function PasswordInput({ id, value, onChange, autoComplete = 'current-password', ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <span className="pw">
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange}
        autoComplete={autoComplete} autoCapitalize="off" autoCorrect="off" spellCheck={false} {...rest} />
      <button type="button" className="eye" onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'} aria-pressed={show} aria-controls={id}
        title={show ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}>
        {show ? <EyeClosed /> : <EyeOpen />}
      </button>
    </span>
  );
}
