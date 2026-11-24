'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CURRENCY, IMAGES, categoryOf, fmtDate, fmtTime, dayKey, dayParts, slotOf } from '../../lib/config';
import { Modal, Photo, Skeleton, Empty, Tick } from '../../components/ui';

const SLOTS = ['Any', 'Morning', 'Afternoon', 'Evening'];

export default function Classes() {
  const [classes, setClasses] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [slot, setSlot] = useState('Any');
  const [price, setPrice] = useState('Any');
  const [day, setDay] = useState('All');
  const [open, setOpen] = useState(null);
  const [mine, setMine] = useState([]);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const [c, s] = await Promise.all([
      supabase.from('classes').select('*').eq('active', true).order('name'),
      supabase.from('session_availability').select('*').gt('starts_at', new Date().toISOString()).order('starts_at'),
    ]);
    if (c.error || s.error) setFailed(true);
    setClasses(c.data || []);
    setSessions(s.data || []);
  }, []);
  useEffect(() => { load(); }, [load]);
  const readMine = () => { try { setMine(JSON.parse(localStorage.getItem('myBookings') || '[]').filter((b) => new Date(b.starts_at) > new Date())); } catch {} };
  useEffect(readMine, []);

  const cats = useMemo(() => ['All', ...new Set((classes || []).map((c) => categoryOf(c.name)))], [classes]);
  const days = useMemo(() => [...new Set(sessions.map((s) => dayKey(s.starts_at)))].slice(0, 14), [sessions]);
  const byClass = useMemo(() => { const m = {}; sessions.forEach((s) => (m[s.class_id] = m[s.class_id] || []).push(s)); return m; }, [sessions]);
  const list = useMemo(() => (classes || []).map((c) => ({
    c,
    ss: (byClass[c.id] || []).filter((s) => (day === 'All' || dayKey(s.starts_at) === day) && (slot === 'Any' || slotOf(s.starts_at) === slot)),
  })).filter(({ c, ss }) =>
    (!q || c.name.toLowerCase().includes(q.toLowerCase())) &&
    (cat === 'All' || categoryOf(c.name) === cat) &&
    (price === 'Any' || (price === 'single' ? c.price_single != null : c.price_monthly != null)) &&
    ((day === 'All' && slot === 'Any') || ss.length > 0)), [classes, byClass, q, cat, slot, price, day]);

  const reset = () => { setQ(''); setCat('All'); setSlot('Any'); setPrice('Any'); setDay('All'); };
  const filtered = q || cat !== 'All' || slot !== 'Any' || price !== 'Any' || day !== 'All';

  return (
    <>
      <div className="ph">
        <h1>Classes</h1>
        <p>Pick a class, choose a day and time, and lock in your spot.</p>
      </div>
      <section className="sec tight">
        {mine.length > 0 && (
          <>
            <p className="muted" style={{ marginBottom: 10 }}>Your upcoming bookings (saved on this device)</p>
            <div className="mine">
              {mine.map((b, i) => (
                <div className="card" key={i}><strong>{b.cls}</strong><br /><span className="muted">{fmtDate(b.starts_at)}</span><br /><span className="badge ok">Confirmed</span></div>
              ))}
            </div>
          </>
        )}

        <div className="filters">
          <input className="in" style={{ maxWidth: 360 }} type="search" placeholder="Search classes" aria-label="Search classes" value={q} onChange={(e) => setQ(e.target.value)} />
          {cats.length > 2 && (
            <div className="frow"><span className="flabel">Category</span>
              {cats.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
            </div>
          )}
          <div className="frow"><span className="flabel">Time</span>
            {SLOTS.map((s) => <button key={s} className={`chip ${slot === s ? 'on' : ''}`} aria-pressed={slot === s} onClick={() => setSlot(s)}>{s}</button>)}
          </div>
          <div className="frow"><span className="flabel">Payment</span>
            {[['Any', 'Any'], ['single', 'Pay per class'], ['monthly', 'Monthly']].map(([v, l]) => <button key={v} className={`chip ${price === v ? 'on' : ''}`} aria-pressed={price === v} onClick={() => setPrice(v)}>{l}</button>)}
          </div>
          {days.length > 0 && (
            <div>
              <div className="frow" style={{ marginBottom: 8 }}><span className="flabel">Date</span>
                <button className={`chip ${day === 'All' ? 'on' : ''}`} aria-pressed={day === 'All'} onClick={() => setDay('All')}>Any day</button>
              </div>
              <div className="dates" role="group" aria-label="Choose a date">
                {days.map((k) => { const p = dayParts(k); return (
                  <button key={k} className={`date ${day === k ? 'on' : ''}`} aria-pressed={day === k} onClick={() => setDay(day === k ? 'All' : k)}><small>{p.wd}</small><b>{p.d}</b><small>{p.mo}</small></button>
                ); })}
              </div>
            </div>
          )}
        </div>

        {failed && <div className="msg err" style={{ marginBottom: 16 }}>We couldn't load everything. Please refresh the page.</div>}
        {classes === null && <div className="grid3"><Skeleton h={400} /><Skeleton h={400} /><Skeleton h={400} /></div>}
        {classes && classes.length === 0 && <Empty title="No classes yet" text="The timetable is being set up. Check back soon." />}
        {classes && classes.length > 0 && list.length === 0 && (
          <Empty title="Nothing matches" text="Try a different day, time or category." action={<button className="btn ghost sm" onClick={reset}>Clear filters</button>} />
        )}
        <div className="grid3">
          {list.map(({ c, ss }, i) => {
            const shown = filtered && (day !== 'All' || slot !== 'Any') ? ss : byClass[c.id] || [];
            const next = shown.find((s) => s.seats_left > 0);
            const hasAny = (byClass[c.id] || []).length > 0;
            return (
              <article className="card hov" key={c.id} style={{ padding: 12, display: 'flex', flexDirection: 'column' }}>
                <Photo src={IMAGES.classes[i % IMAGES.classes.length]} alt={c.name}>
                  <div style={{ height: 170 }} /><span className="badge acc tag">{categoryOf(c.name)}</span><span className="ghosttxt">{c.name}</span>
                </Photo>
                <div style={{ padding: '18px 12px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <h3 style={{ marginBottom: 0 }}>{c.name}</h3>
                  {c.description && <p className="clamp">{c.description}</p>}
                  <div>
                    {c.price_single != null && <span className="price"><b>{c.price_single}</b><span>{CURRENCY} / class</span></span>}
                    {c.price_monthly != null && <span className="price"><b>{c.price_monthly}</b><span>{CURRENCY} / month</span></span>}
                  </div>
                  <p className="muted" style={{ fontSize: 14 }}>
                    {next ? <>Next: <strong style={{ color: 'var(--tx)' }}>{fmtDate(next.starts_at)}</strong> · {next.seats_left} left</> : hasAny ? 'All matching times are full' : 'No upcoming times yet'}
                  </p>
                  <button className="btn" style={{ marginTop: 'auto' }} disabled={!hasAny} onClick={() => setOpen(c)}>{hasAny ? 'Book a spot' : 'No times yet'} {hasAny && <span className="arr">→</span>}</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {open && <BookModal key={open.id} cls={open} sessions={byClass[open.id] || []} initialDay={day !== 'All' ? day : null} onClose={() => setOpen(null)} onBooked={() => { load(); readMine(); }} />}
    </>
  );
}

function BookModal({ cls, sessions, initialDay, onClose, onBooked }) {
  const days = [...new Set(sessions.map((s) => dayKey(s.starts_at)))];
  const firstFree = sessions.find((s) => s.seats_left > 0);
  const [day, setDay] = useState(initialDay && days.includes(initialDay) ? initialDay : firstFree ? dayKey(firstFree.starts_at) : days[0]);
  const [sid, setSid] = useState(null);
  const hasS = cls.price_single != null, hasM = cls.price_monthly != null;
  const [plan, setPlan] = useState(hasS || !hasM ? 'single' : 'monthly');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('pick');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const slots = sessions.filter((s) => dayKey(s.starts_at) === day);
  const sel = sessions.find((s) => s.id === sid);
  const valid = sel && sel.seats_left > 0 && name.trim().length >= 2 && phone.trim().length >= 6;

  async function confirm() {
    setBusy(true); setErr('');
    const { error } = await supabase.rpc('book_session', { p_session: sid, p_name: name, p_phone: phone, p_plan: plan });
    setBusy(false);
    if (error) { setErr(error.message); setStep('pick'); setSid(null); onBooked(); return; }
    try {
      const k = JSON.parse(localStorage.getItem('myBookings') || '[]');
      k.unshift({ cls: cls.name, starts_at: sel.starts_at, plan, at: Date.now() });
      localStorage.setItem('myBookings', JSON.stringify(k.slice(0, 10)));
    } catch {}
    setStep('done'); onBooked();
  }

  return (
    <Modal open onClose={onClose} title={`Book ${cls.name}`} wide>
      {step === 'done' ? (
        <div className="done">
          <Tick />
          <h2>You're in!</h2>
          <p className="muted">{name}, your spot is saved.</p>
          <div className="sum" style={{ width: '100%', textAlign: 'left' }}>
            <div><span>Class</span><strong>{cls.name}</strong></div>
            <div><span>When</span><strong>{fmtDate(sel.starts_at)}</strong></div>
            <div><span>Payment</span><strong>{plan === 'monthly' ? 'Monthly' : 'Pay per class'}</strong></div>
            <div><span>Status</span><span className="badge ok">Confirmed</span></div>
          </div>
          <button className="btn" onClick={onClose}>Done</button>
        </div>
      ) : step === 'confirm' ? (
        <>
          <h2>Confirm</h2>
          <p className="muted">Check the details before booking.</p>
          <div className="sum">
            <div><span>Class</span><strong>{cls.name}</strong></div>
            <div><span>When</span><strong>{fmtDate(sel.starts_at)}</strong></div>
            <div><span>Payment</span><strong>{plan === 'monthly' ? `Monthly · ${cls.price_monthly} ${CURRENCY}` : cls.price_single != null ? `Per class · ${cls.price_single} ${CURRENCY}` : 'Per class'}</strong></div>
            <div><span>Name</span><strong>{name}</strong></div>
            <div><span>Phone</span><strong>{phone}</strong></div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" disabled={busy} onClick={confirm}>{busy ? 'Booking…' : 'Confirm booking'}</button>
            <button className="btn ghost" disabled={busy} onClick={() => setStep('pick')}>Back</button>
          </div>
        </>
      ) : (
        <>
          <h2>{cls.name}</h2>
          {err && <div className="msg err" style={{ marginTop: 12 }}>{err}</div>}
          <p className="step">1 · Choose a day</p>
          <div className="dates" role="group" aria-label="Day">
            {days.map((k) => { const p = dayParts(k); return (
              <button key={k} className={`date ${day === k ? 'on' : ''}`} aria-pressed={day === k} onClick={() => { setDay(k); setSid(null); }}><small>{p.wd}</small><b>{p.d}</b><small>{p.mo}</small></button>
            ); })}
          </div>
          <p className="step">2 · Choose a time</p>
          <div className="slots" role="group" aria-label="Time">
            {slots.map((s) => (
              <button key={s.id} className={`slot ${sid === s.id ? 'on' : ''}`} disabled={s.seats_left <= 0} aria-pressed={sid === s.id} onClick={() => setSid(s.id)}>
                <b>{fmtTime(s.starts_at)}</b><small className={s.seats_left > 0 && s.seats_left <= 3 ? 'low' : ''}>{s.seats_left <= 0 ? 'Full' : `${s.seats_left} left`}</small>
              </button>
            ))}
          </div>
          {(hasS || hasM) && (
            <>
              <p className="step">3 · Payment option</p>
              <div className="frow">
                {hasS && <button className={`chip ${plan === 'single' ? 'on' : ''}`} aria-pressed={plan === 'single'} onClick={() => setPlan('single')}>Pay per class · {cls.price_single} {CURRENCY}</button>}
                {hasM && <button className={`chip ${plan === 'monthly' ? 'on' : ''}`} aria-pressed={plan === 'monthly'} onClick={() => setPlan('monthly')}>Monthly · {cls.price_monthly} {CURRENCY}</button>}
              </div>
            </>
          )}
          <p className="step">{hasS || hasM ? '4' : '3'} · Your details</p>
          <div className="form">
            <input className="in" aria-label="Your name" placeholder="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="in" aria-label="Phone number" placeholder="Phone number" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button className="btn" disabled={!valid} onClick={() => setStep('confirm')}>Review booking <span className="arr">→</span></button>
          </div>
        </>
      )}
    </Modal>
  );
}
