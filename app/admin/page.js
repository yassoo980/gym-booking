'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { CURRENCY, fmtDate } from '../../lib/config';

const TABS = ['Classes', 'Schedule', 'Bookings', 'Gym plans', 'Gym sign-ups'];

export default function Admin() {
  const [user, setUser] = useState(undefined);
  const [tab, setTab] = useState(TABS[0]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  if (user === undefined) return <main className="wrap"><p className="muted">Loading…</p></main>;
  if (!user) return <Login />;

  return (
    <main className="wrap" style={{ maxWidth: 980 }}>
      <div className="top">
        <Link href="/">← View site</Link>
        <button className="btn ghost sm" onClick={() => supabase.auth.signOut()}>Log out</button>
      </div>
      <h1 className="page-title">Admin</h1>
      <div className="tabs">
        {TABS.map((t) => <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {tab === 'Classes' && <Crud key="c" table="classes" noun="class" fields={[
        { k: 'name', label: 'Class name', req: true },
        { k: 'description', label: 'Description', type: 'textarea' },
        { k: 'capacity', label: 'Max people per session', type: 'number', req: true, def: 15 },
        { k: 'price_single', label: `Pay per class price (${CURRENCY}). Leave empty to turn off`, type: 'number' },
        { k: 'price_monthly', label: `Monthly price (${CURRENCY}). Leave empty to turn off`, type: 'number' },
        { k: 'active', label: 'Visible to customers', type: 'checkbox', def: true },
      ]} line={(r) => `Max ${r.capacity} · per class: ${r.price_single ?? 'off'} · monthly: ${r.price_monthly ?? 'off'}${r.active ? '' : ' · hidden'}`} />}
      {tab === 'Schedule' && <Schedule />}
      {tab === 'Bookings' && <Bookings />}
      {tab === 'Gym plans' && <Crud key="g" table="gym_plans" noun="plan" fields={[
        { k: 'name', label: 'Plan name', req: true },
        { k: 'price', label: `Price (${CURRENCY})`, type: 'number', req: true },
        { k: 'period', label: 'Period (month, 3 months, day...)', req: true, def: 'month' },
        { k: 'description', label: 'Description', type: 'textarea' },
        { k: 'active', label: 'Visible to customers', type: 'checkbox', def: true },
      ]} line={(r) => `${r.price} ${CURRENCY} / ${r.period}${r.active ? '' : ' · hidden'}`} />}
      {tab === 'Gym sign-ups' && <Signups />}
    </main>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  async function go(e) {
    e.preventDefault(); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) setErr('Wrong email or password.');
  }
  return (
    <main className="wrap" style={{ maxWidth: 420 }}>
      <div className="top"><Link href="/">← Back</Link></div>
      <h1 className="page-title">Staff login</h1>
      <form className="f" onSubmit={go}>
        {err && <div className="msg err">{err}</div>}
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} /></label>
        <button className="btn">Log in</button>
      </form>
    </main>
  );
}

// Generic add / edit / delete list used for classes and gym plans
function Crud({ table, noun, fields, line }) {
  const blank = Object.fromEntries(fields.map((f) => [f.k, f.def ?? '']));
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blank);
  const [id, setId] = useState(null);
  const [err, setErr] = useState('');
  const load = async () => {
    const { data } = await supabase.from(table).select('*').order('created_at');
    setRows(data || []);
  };
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault(); setErr('');
    const row = Object.fromEntries(fields.map((f) => [f.k,
      f.type === 'number' ? (form[f.k] === '' || form[f.k] == null ? null : Number(form[f.k])) : form[f.k]]));
    const { error } = id ? await supabase.from(table).update(row).eq('id', id) : await supabase.from(table).insert(row);
    if (error) return setErr(error.message);
    setForm(blank); setId(null); load();
  }
  async function del(r) {
    const extra = table === 'classes' ? ' Its scheduled sessions and bookings will be deleted too.' : '';
    if (!confirm(`Delete "${r.name}"?${extra}`)) return;
    const { error } = await supabase.from(table).delete().eq('id', r.id);
    if (error) setErr(error.message);
    load();
  }
  function edit(r) {
    setId(r.id);
    setForm(Object.fromEntries(fields.map((f) => [f.k, r[f.k] ?? ''])));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      <div className="card">
        <h3>{id ? `Edit ${noun}` : `Add a ${noun}`}</h3>
        <form className="f" onSubmit={save}>
          {err && <div className="msg err">{err}</div>}
          {fields.map((f) => f.type === 'checkbox' ? (
            <label className="check" key={f.k}><input type="checkbox" checked={!!form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.checked })} />{f.label}</label>
          ) : (
            <label key={f.k}>{f.label}
              {f.type === 'textarea'
                ? <textarea rows={3} value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />
                : <input type={f.type === 'number' ? 'number' : 'text'} min={f.type === 'number' ? 0 : undefined} step="any" required={f.req} value={form[f.k] ?? ''} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />}
            </label>
          ))}
          <div>
            <button className="btn">{id ? 'Save changes' : `Add ${noun}`}</button>{' '}
            {id && <button type="button" className="btn ghost" onClick={() => { setId(null); setForm(blank); }}>Cancel</button>}
          </div>
        </form>
      </div>
      {rows.length === 0 && <p className="muted">Nothing here yet.</p>}
      {rows.map((r) => (
        <div className="card" key={r.id}>
          <div className="row" style={{ border: 0, padding: 0 }}>
            <div><strong>{r.name}</strong><br /><span className="muted">{line(r)}</span></div>
            <div><button className="btn sm ghost" onClick={() => edit(r)}>Edit</button>{' '}<button className="btn sm danger" onClick={() => del(r)}>Delete</button></div>
          </div>
        </div>
      ))}
    </>
  );
}

function Schedule() {
  const [classes, setClasses] = useState([]);
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ class_id: '', when: '', capacity: '' });
  const [err, setErr] = useState('');
  async function load() {
    const [c, s] = await Promise.all([
      supabase.from('classes').select('id,name').order('name'),
      supabase.from('session_availability').select('*').gt('starts_at', new Date().toISOString()).order('starts_at'),
    ]);
    setClasses(c.data || []); setRows(s.data || []);
  }
  useEffect(() => { load(); }, []);
  async function add(e) {
    e.preventDefault(); setErr('');
    const { error } = await supabase.from('sessions').insert({
      class_id: f.class_id, starts_at: new Date(f.when).toISOString(), capacity: f.capacity === '' ? null : Number(f.capacity),
    });
    if (error) return setErr(error.message);
    setF({ ...f, when: '', capacity: '' }); load();
  }
  async function del(s) {
    if (!confirm('Delete this session and its bookings?')) return;
    await supabase.from('sessions').delete().eq('id', s.id); load();
  }
  const nameOf = (id) => classes.find((c) => c.id === id)?.name ?? '';
  return (
    <>
      <div className="card">
        <h3>Add a session</h3>
        <form className="f" onSubmit={add}>
          {err && <div className="msg err">{err}</div>}
          <label>Class
            <select required value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value })}>
              <option value="">Choose…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <div className="grid2">
            <label>Date and time<input type="datetime-local" required value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} /></label>
            <label>Max people (empty = class default)<input type="number" min="1" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></label>
          </div>
          <div><button className="btn">Add session</button></div>
        </form>
      </div>
      {rows.length === 0 && <p className="muted">No upcoming sessions.</p>}
      {rows.map((s) => (
        <div className="card" key={s.id}>
          <div className="row" style={{ border: 0, padding: 0 }}>
            <div><strong>{nameOf(s.class_id)}</strong> · {fmtDate(s.starts_at)}<br /><span className="muted">{s.capacity - s.seats_left} booked of {s.capacity}</span></div>
            <button className="btn sm danger" onClick={() => del(s)}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}

function Bookings() {
  const [rows, setRows] = useState([]);
  const load = async () => {
    const { data } = await supabase.from('bookings').select('*, sessions(starts_at, classes(name))').order('created_at', { ascending: false }).limit(200);
    setRows(data || []);
  };
  useEffect(() => { load(); }, []);
  async function cancel(b) { await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', b.id); load(); }
  async function del(b) { if (confirm('Delete this booking?')) { await supabase.from('bookings').delete().eq('id', b.id); load(); } }
  return (
    <>
      {rows.length === 0 && <p className="muted">No bookings yet.</p>}
      {rows.map((b) => (
        <div className="card" key={b.id}>
          <div className="row" style={{ border: 0, padding: 0 }}>
            <div>
              <strong>{b.name}</strong> · {b.phone}<br />
              <span className="muted">{b.sessions?.classes?.name} · {b.sessions && fmtDate(b.sessions.starts_at)} · {b.plan === 'monthly' ? 'monthly' : 'per class'}{b.status === 'cancelled' ? ' · cancelled' : ''}</span>
            </div>
            <div>
              {b.status === 'confirmed' && <button className="btn sm ghost" onClick={() => cancel(b)}>Cancel</button>}{' '}
              <button className="btn sm danger" onClick={() => del(b)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function Signups() {
  const [rows, setRows] = useState([]);
  const load = async () => {
    const { data } = await supabase.from('gym_signups').select('*, gym_plans(name, price, period)').order('created_at', { ascending: false });
    setRows(data || []);
  };
  useEffect(() => { load(); }, []);
  async function del(r) { if (confirm('Delete this sign-up?')) { await supabase.from('gym_signups').delete().eq('id', r.id); load(); } }
  return (
    <>
      {rows.length === 0 && <p className="muted">No sign-ups yet.</p>}
      {rows.map((r) => (
        <div className="card" key={r.id}>
          <div className="row" style={{ border: 0, padding: 0 }}>
            <div><strong>{r.name}</strong> · {r.phone}<br /><span className="muted">{r.gym_plans ? `${r.gym_plans.name} · ${r.gym_plans.price} ${CURRENCY} / ${r.gym_plans.period}` : 'Plan removed'}</span></div>
            <button className="btn sm danger" onClick={() => del(r)}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}
