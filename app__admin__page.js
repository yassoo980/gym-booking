'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { BRAND, CURRENCY, fmtDate, toWa, waLink } from '../../lib/config';
import { Modal, Skeleton, Empty, useToast } from '../../components/ui';

const TABS = ['Overview', 'Classes', 'Schedule', 'Bookings', 'Gym plans', 'Gym sign-ups'];

export default function Admin() {
  const [user, setUser] = useState(undefined);
  const [tab, setTab] = useState(TABS[0]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  if (user === undefined) return <div className="login"><Skeleton h={120} /></div>;
  if (!user) return <Login />;

  return (
    <div className="adm">
      <aside className="side">
        <div className="logo"><i /> {BRAND}</div>
        {TABS.map((t) => <button key={t} className={`nv ${t === tab ? 'on' : ''}`} aria-current={t === tab} onClick={() => setTab(t)}>{t}</button>)}
        <div className="sp" />
        <Link href="/" className="nv" style={{ padding: '12px 14px', color: 'var(--mu)' }}>View site ↗</Link>
        <button className="nv" onClick={() => supabase.auth.signOut()}>Log out</button>
      </aside>
      <main className="main">
        <h1>{tab}</h1>
        {tab === 'Overview' && <Overview go={setTab} />}
        {tab === 'Classes' && <Crud key="c" table="classes" noun="class" fields={[
          { k: 'name', label: 'Class name', req: true },
          { k: 'description', label: 'Description', type: 'textarea' },
          { k: 'capacity', label: 'Max people per session', type: 'number', req: true, def: 15 },
          { k: 'price_single', label: `Pay per class price (${CURRENCY}). Leave empty to turn off`, type: 'number' },
          { k: 'price_monthly', label: `Monthly price (${CURRENCY}). Leave empty to turn off`, type: 'number' },
          { k: 'active', label: 'Visible to customers', type: 'checkbox', def: true },
        ]} line={(r) => `Max ${r.capacity} · per class: ${r.price_single ?? 'off'} · monthly: ${r.price_monthly ?? 'off'}`} />}
        {tab === 'Schedule' && <Schedule />}
        {tab === 'Bookings' && <Bookings />}
        {tab === 'Gym plans' && <Crud key="g" table="gym_plans" noun="plan" fields={[
          { k: 'name', label: 'Plan name', req: true },
          { k: 'price', label: `Price (${CURRENCY})`, type: 'number', req: true },
          { k: 'period', label: 'Period (month, year, 3 months...)', req: true, def: 'month' },
          { k: 'description', label: 'Features (one per line)', type: 'textarea' },
          { k: 'active', label: 'Visible to customers', type: 'checkbox', def: true },
        ]} line={(r) => `${r.price} ${CURRENCY} / ${r.period}`} />}
        {tab === 'Gym sign-ups' && <Signups />}
      </main>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) setErr('Wrong email or password.');
  }
  return (
    <div className="login">
      <div className="card">
        <h1>Staff login</h1>
        <form className="form" onSubmit={go}>
          {err && <div className="msg err">{err}</div>}
          <label className="fld">Email<input className="in" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="fld">Password<input className="in" type="password" required autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button>
          <Link href="/" className="muted" style={{ textAlign: 'center' }}>← Back to site</Link>
        </form>
      </div>
    </div>
  );
}

/* confirmation dialog hook: const [ask, dialog] = useConfirm(); if (await ask('Delete?')) ... */
function useConfirm() {
  const [s, setS] = useState(null);
  const ask = (msg, label = 'Delete') => new Promise((res) => setS({ msg, label, res }));
  const close = (v) => { s?.res(v); setS(null); };
  const dialog = (
    <Modal open={!!s} onClose={() => close(false)} title="Please confirm">
      <h2 style={{ fontSize: 40 }}>Are you sure?</h2>
      <p className="muted" style={{ margin: '10px 0 22px' }}>{s?.msg}</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn danger" onClick={() => close(true)}>{s?.label}</button>
        <button className="btn ghost" onClick={() => close(false)}>Cancel</button>
      </div>
    </Modal>
  );
  return [ask, dialog];
}

function Overview({ go }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    (async () => {
      const [c, s, b, g] = await Promise.all([
        supabase.from('classes').select('id,name,active'),
        supabase.from('session_availability').select('*').gt('starts_at', new Date().toISOString()).order('starts_at'),
        supabase.from('bookings').select('status, created_at, name, sessions(class_id, starts_at, classes(name))').order('created_at', { ascending: false }).limit(1000),
        supabase.from('gym_signups').select('id'),
      ]);
      setD({ classes: c.data || [], sessions: s.data || [], bookings: b.data || [], signups: g.data || [] });
    })();
  }, []);
  const m = useMemo(() => {
    if (!d) return null;
    const conf = d.bookings.filter((x) => x.status === 'confirmed');
    const cap = d.sessions.reduce((a, s) => a + s.capacity, 0);
    const taken = d.sessions.reduce((a, s) => a + (s.capacity - s.seats_left), 0);
    const per = {};
    conf.forEach((x) => { const n = x.sessions?.classes?.name; if (n) per[n] = (per[n] || 0) + 1; });
    const top = Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { conf: conf.length, fill: cap ? Math.round((taken / cap) * 100) : 0, top, max: top[0]?.[1] || 1 };
  }, [d]);
  const names = useMemo(() => Object.fromEntries((d?.classes || []).map((c) => [c.id, c.name])), [d]);
  if (!d) return <div className="stats"><Skeleton h={120} /><Skeleton h={120} /><Skeleton h={120} /><Skeleton h={120} /></div>;
  return (
    <>
      <div className="stats">
        <div className="card stat"><span className="muted">Active classes</span><b>{d.classes.filter((c) => c.active).length}</b></div>
        <div className="card stat"><span className="muted">Upcoming sessions</span><b>{d.sessions.length}</b></div>
        <div className="card stat"><span className="muted">Confirmed bookings</span><b>{m.conf}</b></div>
        <div className="card stat"><span className="muted">Upcoming fill rate</span><b>{m.fill}%</b></div>
        <div className="card stat"><span className="muted">Gym sign-ups</span><b>{d.signups.length}</b></div>
      </div>
      <div className="two">
        <div className="card">
          <h3 style={{ fontSize: 30, marginBottom: 18 }}>Bookings by class</h3>
          {m.top.length === 0 && <p className="muted">No bookings yet.</p>}
          {m.top.map(([n, v]) => (
            <div className="lrow" key={n}><div><span>{n}</span><strong>{v}</strong></div><div className="bar"><i style={{ width: `${(v / m.max) * 100}%` }} /></div></div>
          ))}
        </div>
        <div className="card">
          <h3 style={{ fontSize: 30, marginBottom: 18 }}>Next sessions</h3>
          {d.sessions.length === 0 && <Empty title="Nothing scheduled" action={<button className="btn sm" onClick={() => go('Schedule')}>Add a session</button>} />}
          {d.sessions.slice(0, 6).map((s) => {
            const booked = s.capacity - s.seats_left;
            return (
              <div className="lrow" key={s.id}>
                <div><span><strong>{names[s.class_id]}</strong> · {fmtDate(s.starts_at)}</span><span className="muted">{booked}/{s.capacity}</span></div>
                <div className={`bar ${s.seats_left <= 0 ? 'hot' : ''}`}><i style={{ width: `${Math.min(100, (booked / s.capacity) * 100)}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// Generic add / edit / delete list used for classes and gym plans
function Crud({ table, noun, fields, line }) {
  const toast = useToast();
  const [ask, dialog] = useConfirm();
  const blank = Object.fromEntries(fields.map((f) => [f.k, f.def ?? '']));
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(blank);
  const [id, setId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const { data } = await supabase.from(table).select('*').order('created_at');
    setRows(data || []);
  }, [table]);
  useEffect(() => { load(); }, [load]);

  async function save(e) {
    e.preventDefault(); setErr('');
    const row = Object.fromEntries(fields.map((f) => [f.k, f.type === 'number' ? (form[f.k] === '' || form[f.k] == null ? null : Number(form[f.k])) : form[f.k]]));
    const { error } = id ? await supabase.from(table).update(row).eq('id', id) : await supabase.from(table).insert(row);
    if (error) return setErr(error.message);
    toast(id ? 'Changes saved' : `${noun[0].toUpperCase() + noun.slice(1)} added`);
    setForm(blank); setId(null); setShowForm(false); load();
  }
  async function del(r) {
    const extra = table === 'classes' ? ' Its scheduled sessions and bookings will be deleted too.' : '';
    if (!(await ask(`Delete "${r.name}"?${extra}`))) return;
    const { error } = await supabase.from(table).delete().eq('id', r.id);
    toast(error ? error.message : 'Deleted', error ? 'err' : 'ok');
    load();
  }
  const edit = (r) => { setId(r.id); setForm(Object.fromEntries(fields.map((f) => [f.k, r[f.k] ?? '']))); setErr(''); setShowForm(true); };
  const close = () => { setShowForm(false); setId(null); setForm(blank); setErr(''); };

  return (
    <>
      <div className="toolbar"><button className="btn" onClick={() => { setForm(blank); setId(null); setShowForm(true); }}>+ Add {noun}</button></div>
      {rows === null && <Skeleton h={90} />}
      {rows && rows.length === 0 && <Empty title={`No ${noun}s yet`} text={`Add your first ${noun} to get started.`} />}
      {rows && rows.map((r) => (
        <div className="card item" key={r.id}>
          <div>
            <strong style={{ fontSize: 18 }}>{r.name}</strong> {!r.active && <span className="badge bad">Hidden</span>}
            <div className="muted" style={{ fontSize: 14 }}>{line(r)}</div>
          </div>
          <div className="act"><button className="btn sm ghost" onClick={() => edit(r)}>Edit</button><button className="btn sm danger" onClick={() => del(r)}>Delete</button></div>
        </div>
      ))}
      <Modal open={showForm} onClose={close} title={id ? `Edit ${noun}` : `Add ${noun}`}>
        <h2 style={{ fontSize: 44, marginBottom: 18 }}>{id ? `Edit ${noun}` : `Add ${noun}`}</h2>
        <form className="form" onSubmit={save}>
          {err && <div className="msg err">{err}</div>}
          {fields.map((f) => f.type === 'checkbox' ? (
            <label className="fcheck" key={f.k}><input type="checkbox" checked={!!form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.checked })} />{f.label}</label>
          ) : (
            <label className="fld" key={f.k}>{f.label}
              {f.type === 'textarea'
                ? <textarea className="in" rows={4} value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />
                : <input className="in" type={f.type === 'number' ? 'number' : 'text'} min={f.type === 'number' ? 0 : undefined} step="any" required={f.req} value={form[f.k] ?? ''} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />}
            </label>
          ))}
          <div style={{ display: 'flex', gap: 10 }}><button className="btn">{id ? 'Save changes' : `Add ${noun}`}</button><button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
        </form>
      </Modal>
      {dialog}
    </>
  );
}

function Schedule() {
  const toast = useToast();
  const [ask, dialog] = useConfirm();
  const [classes, setClasses] = useState([]);
  const [rows, setRows] = useState(null);
  const [f, setF] = useState({ class_id: '', when: '', capacity: '' });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const [c, s] = await Promise.all([
      supabase.from('classes').select('id,name').order('name'),
      supabase.from('session_availability').select('*').gt('starts_at', new Date().toISOString()).order('starts_at'),
    ]);
    setClasses(c.data || []); setRows(s.data || []);
  }, []);
  useEffect(() => { load(); }, [load]);
  async function add(e) {
    e.preventDefault(); setErr('');
    const { error } = await supabase.from('sessions').insert({ class_id: f.class_id, starts_at: new Date(f.when).toISOString(), capacity: f.capacity === '' ? null : Number(f.capacity) });
    if (error) return setErr(error.message);
    toast('Session added'); setF({ ...f, when: '', capacity: '' }); setShow(false); load();
  }
  async function del(s) {
    if (!(await ask('Delete this session and its bookings?'))) return;
    const { error } = await supabase.from('sessions').delete().eq('id', s.id);
    toast(error ? error.message : 'Session deleted', error ? 'err' : 'ok'); load();
  }
  const nameOf = (id) => classes.find((c) => c.id === id)?.name ?? '';
  return (
    <>
      <div className="toolbar"><button className="btn" onClick={() => setShow(true)}>+ Add session</button></div>
      {rows === null && <Skeleton h={90} />}
      {rows && rows.length === 0 && <Empty title="No upcoming sessions" text="Add a session so customers can book." />}
      {rows && rows.map((s) => {
        const booked = s.capacity - s.seats_left;
        return (
          <div className="card item" key={s.id}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <strong style={{ fontSize: 18 }}>{nameOf(s.class_id)}</strong> <span className="muted">· {fmtDate(s.starts_at)}</span>
              <div className="lrow" style={{ margin: '10px 0 0' }}><div className={`bar ${s.seats_left <= 0 ? 'hot' : ''}`}><i style={{ width: `${Math.min(100, (booked / s.capacity) * 100)}%` }} /></div><span className="muted" style={{ fontSize: 13 }}>{booked} of {s.capacity} booked{s.seats_left <= 0 ? ' · Full' : ''}</span></div>
            </div>
            <div className="act"><button className="btn sm danger" onClick={() => del(s)}>Delete</button></div>
          </div>
        );
      })}
      <Modal open={show} onClose={() => setShow(false)} title="Add session">
        <h2 style={{ fontSize: 44, marginBottom: 18 }}>Add session</h2>
        <form className="form" onSubmit={add}>
          {err && <div className="msg err">{err}</div>}
          <label className="fld">Class
            <select className="in" required value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value })}>
              <option value="">Choose…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <div className="g2">
            <label className="fld">Date and time<input className="in" type="datetime-local" required value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} /></label>
            <label className="fld">Max people (empty = class default)<input className="in" type="number" min="1" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></label>
          </div>
          <button className="btn">Add session</button>
        </form>
      </Modal>
      {dialog}
    </>
  );
}

function Bookings() {
  const toast = useToast();
  const [ask, dialog] = useConfirm();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [st, setSt] = useState('all');
  const load = useCallback(async () => {
    const { data } = await supabase.from('bookings').select('*, sessions(starts_at, classes(name))').order('created_at', { ascending: false }).limit(500);
    setRows(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);
  async function cancel(b) {
    if (!(await ask(`Cancel the booking for ${b.name}? This frees their seat.`, 'Cancel booking'))) return;
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', b.id); toast('Booking cancelled'); load();
  }
  async function del(b) {
    if (!(await ask(`Permanently delete the booking for ${b.name}?`))) return;
    await supabase.from('bookings').delete().eq('id', b.id); toast('Booking deleted'); load();
  }
  const list = (rows || []).filter((b) => (st === 'all' || b.status === st) && `${b.name} ${b.phone} ${b.sessions?.classes?.name || ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="toolbar">
        <input className="in" type="search" aria-label="Search bookings" placeholder="Search name, phone or class" value={q} onChange={(e) => setQ(e.target.value)} />
        {['all', 'confirmed', 'cancelled'].map((s) => <button key={s} className={`chip ${st === s ? 'on' : ''}`} aria-pressed={st === s} onClick={() => setSt(s)}>{s[0].toUpperCase() + s.slice(1)}</button>)}
      </div>
      {rows === null && <Skeleton h={200} />}
      {rows && list.length === 0 && <Empty title="No bookings" text="Bookings will show up here." />}
      {list.length > 0 && (
        <div className="card tw" style={{ padding: 8 }}>
          <table className="tbl">
            <thead><tr><th>Customer</th><th>Class</th><th>When</th><th>Plan</th><th>Status</th><th /></tr></thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.name}</strong><div className="muted" style={{ fontSize: 13 }}>{b.phone}</div></td>
                  <td>{b.sessions?.classes?.name}</td>
                  <td>{b.sessions && fmtDate(b.sessions.starts_at)}</td>
                  <td>{b.plan === 'monthly' ? 'Monthly' : 'Per class'}</td>
                  <td><span className={`badge ${b.status === 'confirmed' ? 'ok' : 'bad'}`}>{b.status}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {b.status === 'confirmed' && b.sessions && (
                      <a className="btn sm wa-btn" target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${b.name}`}
                        href={waLink(toWa(b.phone), `Hi ${b.name}, your booking for ${b.sessions.classes?.name} on ${fmtDate(b.sessions.starts_at)} is confirmed. See you at ${BRAND}!`)}>WhatsApp</a>
                    )}{' '}
                    {b.status === 'confirmed' && <button className="btn sm ghost" onClick={() => cancel(b)}>Cancel</button>}{' '}
                    <button className="btn sm danger" onClick={() => del(b)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog}
    </>
  );
}

function Signups() {
  const toast = useToast();
  const [ask, dialog] = useConfirm();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const load = useCallback(async () => {
    const { data } = await supabase.from('gym_signups').select('*, gym_plans(name, price, period)').order('created_at', { ascending: false });
    setRows(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);
  async function del(r) {
    if (!(await ask(`Delete the sign-up from ${r.name}?`))) return;
    await supabase.from('gym_signups').delete().eq('id', r.id); toast('Sign-up deleted'); load();
  }
  const list = (rows || []).filter((r) => `${r.name} ${r.phone} ${r.gym_plans?.name || ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="toolbar"><input className="in" type="search" aria-label="Search sign-ups" placeholder="Search name, phone or plan" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {rows === null && <Skeleton h={200} />}
      {rows && list.length === 0 && <Empty title="No sign-ups" text="Gym membership requests will show up here." />}
      {list.length > 0 && (
        <div className="card tw" style={{ padding: 8 }}>
          <table className="tbl">
            <thead><tr><th>Customer</th><th>Plan</th><th>Requested</th><th /></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.name}</strong><div className="muted" style={{ fontSize: 13 }}>{r.phone}</div></td>
                  <td>{r.gym_plans ? `${r.gym_plans.name} · ${r.gym_plans.price} ${CURRENCY} / ${r.gym_plans.period}` : <span className="muted">Plan removed</span>}</td>
                  <td>{fmtDate(r.created_at)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <a className="btn sm wa-btn" target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${r.name}`}
                      href={waLink(toWa(r.phone), `Hi ${r.name}, thanks for requesting the ${r.gym_plans?.name || 'gym'} membership at ${BRAND}. We'd love to get you started!`)}>WhatsApp</a>{' '}
                    <button className="btn sm danger" onClick={() => del(r)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog}
    </>
  );
}
