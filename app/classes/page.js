'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { CURRENCY, fmtDate } from '../../lib/config';

export default function Classes() {
  const [classes, setClasses] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [open, setOpen] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState('single');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [c, s] = await Promise.all([
      supabase.from('classes').select('*').eq('active', true).order('name'),
      supabase.from('session_availability').select('*').gt('starts_at', new Date().toISOString()).order('starts_at'),
    ]);
    setClasses(c.data || []);
    setSessions(s.data || []);
  }
  useEffect(() => { load(); }, []);

  function openForm(s, c) {
    setOpen(s.id); setMsg(null);
    setPlan(c.price_single != null ? 'single' : 'monthly');
  }

  async function book(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('book_session', { p_session: open, p_name: name, p_phone: phone, p_plan: plan });
    setBusy(false);
    if (error) { setMsg({ err: true, t: error.message }); return load(); }
    setMsg({ t: `You're booked, ${name}! See you there.` });
    setOpen(null); setName(''); setPhone(''); load();
  }

  return (
    <main className="wrap">
      <div className="top"><Link href="/">← Back</Link></div>
      <h1 className="page-title">Classes</h1>
      <p className="sub">Pick a class, choose a time, book your spot.</p>
      {msg && !open && <div className={`msg ${msg.err ? 'err' : 'ok'}`}>{msg.t}</div>}
      {classes === null && <p className="muted">Loading classes…</p>}
      {classes && classes.length === 0 && <p className="muted">No classes yet. Check back soon.</p>}
      {classes && classes.map((c) => {
        const list = sessions.filter((s) => s.class_id === c.id);
        return (
          <div className="card" key={c.id}>
            <h3>{c.name}</h3>
            {c.price_single != null && <span className="price">{c.price_single} {CURRENCY} per class</span>}
            {c.price_monthly != null && <span className="price">{c.price_monthly} {CURRENCY} per month</span>}
            {c.description && <p>{c.description}</p>}
            {list.length === 0 && <p className="muted">No upcoming times yet.</p>}
            {list.map((s) => (
              <div key={s.id}>
                <div className="row">
                  <div>
                    <strong>{fmtDate(s.starts_at)}</strong><br />
                    {s.seats_left > 0
                      ? <span className="muted">{s.seats_left} of {s.capacity} spots left</span>
                      : <span className="full">Full</span>}
                  </div>
                  <button className="btn sm" disabled={s.seats_left <= 0} onClick={() => openForm(s, c)}>Book</button>
                </div>
                {open === s.id && (
                  <form className="f" onSubmit={book}>
                    {msg && <div className="msg err">{msg.t}</div>}
                    <label>Your name<input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></label>
                    <label>Phone number<input required type="tel" minLength={6} value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
                    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                      {c.price_single != null && <label className="check"><input type="radio" name="plan" checked={plan === 'single'} onChange={() => setPlan('single')} />Pay per class ({c.price_single} {CURRENCY})</label>}
                      {c.price_monthly != null && <label className="check"><input type="radio" name="plan" checked={plan === 'monthly'} onChange={() => setPlan('monthly')} />Pay monthly ({c.price_monthly} {CURRENCY})</label>}
                    </fieldset>
                    <div><button className="btn" disabled={busy}>Confirm booking</button> <button type="button" className="btn ghost" onClick={() => setOpen(null)}>Cancel</button></div>
                  </form>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </main>
  );
}
