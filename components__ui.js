'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BRAND, TAGLINE, CONTACT, waLink } from '../lib/config';

/* ---------- toasts ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((text, kind = 'ok') => {
    const id = Math.random();
    setItems((i) => [...i, { id, text, kind }]);
    setTimeout(() => setItems((i) => i.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- small building blocks ---------- */
export function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${on ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

export function Photo({ src, alt = '', className = '', children }) {
  const [ok, setOk] = useState(!!src);
  return (
    <div className={`photo ${className}`}>
      {ok && <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setOk(false)} />}
      {children}
    </div>
  );
}

export const Skeleton = ({ h = 200 }) => <div className="skel" style={{ height: h }} />;

export function Empty({ title, text, action }) {
  return (
    <div className="empty">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="6" y="20" width="6" height="16" rx="2" /><rect x="44" y="20" width="6" height="16" rx="2" /><rect x="12" y="24" width="4" height="8" rx="1" /><rect x="40" y="24" width="4" height="8" rx="1" /><path d="M16 28h24" /></svg>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export const Tick = () => (
  <svg className="tick" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" /><path d="M14 27l8 8 16-17" /></svg>
);

export function Modal({ open, onClose, title, children, wide }) {
  const ref = useRef(null);
  const cb = useRef(onClose);
  cb.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    document.body.style.overflow = 'hidden';
    const k = (e) => { if (e.key === 'Escape') cb.current(); };
    window.addEventListener('keydown', k);
    ref.current?.focus();
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', k); prev?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <button className="x" onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  );
}

/* ---------- site chrome ---------- */
const LINKS = [['/', 'Home'], ['/gym', 'Gym'], ['/classes', 'Classes']];

function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  return (
    <header className="nav">
      <div className="nav-in">
        <Link href="/" className="logo"><i /> {BRAND}</Link>
        <button className="burger" aria-expanded={open} aria-controls="menu" aria-label="Menu" onClick={() => setOpen(!open)}>
          <svg width="20" height="20" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={open ? 'M4 4l12 12M16 4L4 16' : 'M3 6h14M3 10h14M3 14h14'} /></svg>
        </button>
        <nav className={`links ${open ? 'open' : ''}`} id="menu">
          {LINKS.map(([h, l]) => <Link key={h} href={h} className={path === h ? 'on' : ''}>{l}</Link>)}
          <Link href="/classes" className="btn sm cta">Book a class</Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="foot">
      <div className="foot-in">
        <div>
          <div className="logo"><i /> {BRAND}</div>
          <p className="muted">{TAGLINE}</p>
        </div>
        <div className="foot-links">
          {LINKS.map(([h, l]) => <Link key={h} href={h}>{l}</Link>)}
          <Link href="/admin">Staff login</Link>
        </div>
        <div className="muted">
          {CONTACT.whatsapp && (
            <a className="wa" href={waLink(CONTACT.whatsapp, `Hi ${BRAND}, I have a question.`)} target="_blank" rel="noopener noreferrer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" /></svg>
              <span>Customer service<br /><strong>{CONTACT.phone}</strong></span>
            </a>
          )}
          {!CONTACT.whatsapp && CONTACT.phone && <div>{CONTACT.phone}</div>}
          {CONTACT.instagram && <div>{CONTACT.instagram}</div>}
          {CONTACT.address && <div>{CONTACT.address}</div>}
        </div>
      </div>
      <div className="foot-copy">© {new Date().getFullYear()} {BRAND}. All rights reserved.</div>
    </footer>
  );
}

export function Shell({ children }) {
  const path = usePathname();
  const admin = path.startsWith('/admin');
  return (
    <>
      {!admin && <Nav />}
      <div key={path} className="page">{children}</div>
      {!admin && <Footer />}
    </>
  );
}
