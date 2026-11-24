'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CURRENCY, featuresOf, isAnnual } from '../../lib/config';
import { Modal, Skeleton, Empty, Tick, Reveal } from '../../components/ui';

export default function Gym() {
  const [plans, setPlans] = useState(null);
  const [failed, setFailed] = useState(false);
  const [billing, setBilling] = useState('monthly');
  const [pick, setPick] = useState(null);
  const [ask, setAsk] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    supabase.from('gym_plans').select('*').eq('active', true).order('price').then(({ data, error }) => { if (error) setFailed(true); setPlans(data || []); });
  }, []);

  const hasAnnual = !!plans?.some(isAnnual) && !!plans?.some((p) => !isAnnual(p));
  const view = useMemo(() => (plans || []).filter((p) => !hasAnnual || (billing === 'annual') === isAnnual(p)), [plans, billing, hasAnnual]);
  const rows = useMemo(() => [...new Set(view.flatMap(featuresOf))], [view]);
  const chosen = plans?.find((p) => p.id === pick);

  return (
    <>
      <div className="ph"><h1>Gym</h1><p>Our private mini gym. Choose a membership and we'll get you started.</p></div>
      <section className="sec tight">
        {hasAnnual && (
          <div className="seg" role="group" aria-label="Billing period">
            <button className={billing === 'monthly' ? 'on' : ''} aria-pressed={billing === 'monthly'} onClick={() => { setBilling('monthly'); setPick(null); }}>Monthly</button>
            <button className={billing === 'annual' ? 'on' : ''} aria-pressed={billing === 'annual'} onClick={() => { setBilling('annual'); setPick(null); }}>Annual</button>
          </div>
        )}
        {failed && <div className="msg err" style={{ marginBottom: 16 }}>We couldn't load the plans. Please refresh.</div>}
        {plans === null && <div className="grid3"><Skeleton h={320} /><Skeleton h={320} /><Skeleton h={320} /></div>}
        {plans && view.length === 0 && <Empty title="No plans yet" text="Membership options will appear here soon." />}
        <div className="grid3">
          {view.map((p, i) => (
            <Reveal key={p.id} delay={i * 70}>
              <button className={`card hov plan ${pick === p.id ? 'on' : ''}`} aria-pressed={pick === p.id} onClick={() => setPick(pick === p.id ? null : p.id)}>
                <span className="pick" aria-hidden="true">✓</span>
                <h3>{p.name}</h3>
                <span className="price"><b>{p.price}</b><span>{CURRENCY} / {p.period}</span></span>
                {featuresOf(p).length > 0 && <ul>{featuresOf(p).map((f, j) => <li key={j}>{f}</li>)}</ul>}
              </button>
            </Reveal>
          ))}
        </div>

        {view.length > 1 && rows.length > 0 && (
          <Reveal>
            <h2 style={{ fontSize: 56, margin: '72px 0 20px' }}>Compare plans</h2>
            <div className="card tw" style={{ padding: 8 }}>
              <table className="tbl">
                <thead><tr><th>Feature</th>{view.map((p) => <th key={p.id}>{p.name}</th>)}</tr></thead>
                <tbody>
                  <tr><td>Price</td>{view.map((p) => <td key={p.id}><strong>{p.price} {CURRENCY}</strong> <span className="muted">/ {p.period}</span></td>)}</tr>
                  {rows.map((f) => <tr key={f}><td>{f}</td>{view.map((p) => <td key={p.id} className={featuresOf(p).includes(f) ? 'yes' : 'no'}>{featuresOf(p).includes(f) ? '✓' : '–'}</td>)}</tr>)}
                </tbody>
              </table>
            </div>
          </Reveal>
        )}
      </section>

      {chosen && (
        <div className="bar-fixed">
          <div><span><strong>{chosen.name}</strong> · {chosen.price} {CURRENCY} / {chosen.period}</span><button className="btn" onClick={() => setAsk(true)}>Continue <span className="arr">→</span></button></div>
        </div>
      )}
      {ask && chosen && <JoinModal plan={chosen} onClose={() => setAsk(false)} onDone={(n, ph) => { setAsk(false); setPick(null); setDone({ plan: chosen, name: n, phone: ph }); }} />}
      <Modal open={!!done} onClose={() => setDone(null)} title="Request received">
        {done && (
          <div className="done">
            <Tick />
            <h2>Request received</h2>
            <p className="muted">Thanks {done.name}. We'll contact you on {done.phone} to confirm your membership.</p>
            <div className="sum" style={{ width: '100%', textAlign: 'left' }}>
              <div><span>Plan</span><strong>{done.plan.name}</strong></div>
              <div><span>Price</span><strong>{done.plan.price} {CURRENCY} / {done.plan.period}</strong></div>
              <div><span>Status</span><span className="badge acc">Pending confirmation</span></div>
            </div>
            <button className="btn" onClick={() => setDone(null)}>Done</button>
          </div>
        )}
      </Modal>
    </>
  );
}

function JoinModal({ plan, onClose, onDone }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const valid = name.trim().length >= 2 && phone.trim().length >= 6;
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await supabase.from('gym_signups').insert({ plan_id: plan.id, name: name.trim(), phone: phone.trim() });
    setBusy(false);
    if (error) return setErr('Something went wrong. Please try again.');
    onDone(name.trim(), phone.trim());
  }
  return (
    <Modal open onClose={onClose} title={`Join ${plan.name}`}>
      <h2>Join {plan.name}</h2>
      <p className="muted">{plan.price} {CURRENCY} / {plan.period}</p>
      <form className="form" style={{ marginTop: 22 }} onSubmit={submit}>
        {err && <div className="msg err">{err}</div>}
        <input className="in" aria-label="Your name" placeholder="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="in" aria-label="Phone number" placeholder="Phone number" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button className="btn" disabled={!valid || busy}>{busy ? 'Sending…' : 'Confirm request'}</button>
      </form>
    </Modal>
  );
}
