'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { CURRENCY } from '../../lib/config';

export default function Gym() {
  const [plans, setPlans] = useState(null);
  const [pick, setPick] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    supabase.from('gym_plans').select('*').eq('active', true).order('price')
      .then(({ data }) => setPlans(data || []));
  }, []);

  async function join(e) {
    e.preventDefault();
    setMsg(null);
    const { error } = await supabase.from('gym_signups').insert({ plan_id: pick.id, name: name.trim(), phone: phone.trim() });
    if (error) return setMsg({ err: true, t: 'Something went wrong. Please try again.' });
    setMsg({ t: `Thanks ${name}! We got your request for ${pick.name}. We will contact you to confirm.` });
    setPick(null); setName(''); setPhone('');
  }

  return (
    <main className="wrap">
      <div className="top"><Link href="/">← Back</Link></div>
      <h1 className="page-title">Gym</h1>
      <p className="sub">Choose a membership plan.</p>
      {msg && <div className={`msg ${msg.err ? 'err' : 'ok'}`}>{msg.t}</div>}
      {plans === null && <p className="muted">Loading plans…</p>}
      {plans && plans.length === 0 && <p className="muted">No plans available yet. Check back soon.</p>}
      {plans && plans.map((p) => (
        <div className="card" key={p.id}>
          <h3>{p.name}</h3>
          <span className="price">{p.price} {CURRENCY} / {p.period}</span>
          {p.description && <p>{p.description}</p>}
          {pick?.id === p.id ? (
            <form className="f" onSubmit={join}>
              <label>Your name<input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label>Phone number<input required type="tel" minLength={6} value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
              <div><button className="btn">Join {p.name}</button> <button type="button" className="btn ghost" onClick={() => setPick(null)}>Cancel</button></div>
            </form>
          ) : (
            <button className="btn" onClick={() => { setPick(p); setMsg(null); }}>Join this plan</button>
          )}
        </div>
      ))}
    </main>
  );
}
