'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { BRAND, CURRENCY, IMAGES, SECTIONS, TRAINERS, TESTIMONIALS, FACILITIES, TAGLINE, categoryOf, fmtDate, featuresOf } from '../lib/config';
import { Reveal, Photo, Skeleton, Empty } from '../components/ui';

export default function Home() {
  const [d, setD] = useState(null);
  useEffect(() => {
    (async () => {
      const [c, s, p] = await Promise.all([
        supabase.from('classes').select('*').eq('active', true).order('created_at'),
        supabase.from('session_availability').select('*').gt('starts_at', new Date().toISOString()).order('starts_at'),
        supabase.from('gym_plans').select('*').eq('active', true).order('price'),
      ]);
      setD({ classes: c.data || [], sessions: s.data || [], plans: p.data || [] });
    })();
  }, []);

  const names = d?.classes.length ? d.classes.map((c) => c.name) : ['Yoga', 'Kickboxing', 'Strength', 'Cardio'];

  return (
    <>
      <section className="hero">
        <div className="hero-bg">{IMAGES.hero && <img src={IMAGES.hero} alt="" />}</div>
        <div className="hero-in">
          <span className="eyebrow">{BRAND} · Private gym &amp; class studio</span>
          <h1>Train hard.<br /><em>Book easy.</em></h1>
          <p className="lead">{TAGLINE} Reserve your spot in a class or join the gym in a minute.</p>
          <div className="choices">
            <Link href="/gym" className="choice">
              <div><h2>Gym</h2><p>Our private mini gym. Pick a membership and start training.</p></div>
              <span className="go" aria-hidden="true">→</span>
            </Link>
            <Link href="/classes" className="choice">
              <div><h2>Classes</h2><p>Yoga, kickboxing and more. Choose a class, a day and a time.</p></div>
              <span className="go" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-t">{[...names, ...names, ...names, ...names].map((n, i) => <span key={i}>{n}</span>)}</div>
      </div>

      <section className="sec">
        <Reveal>
          <div className="sec-h">
            <div><span className="kicker">Featured classes</span><h2>Find your<br />class</h2></div>
            <Link href="/classes" className="btn ghost">All classes <span className="arr">→</span></Link>
          </div>
        </Reveal>
        {!d && <div className="grid3"><Skeleton h={380} /><Skeleton h={380} /><Skeleton h={380} /></div>}
        {d && d.classes.length === 0 && <Empty title="Classes coming soon" text="We're setting up the timetable. Check back shortly." />}
        {d && d.classes.length > 0 && (
          <div className="grid3">
            {d.classes.slice(0, 3).map((c, i) => {
              const next = d.sessions.find((s) => s.class_id === c.id && s.seats_left > 0);
              return (
                <Reveal key={c.id} delay={i * 90}>
                  <Link href="/classes" className="card hov" style={{ display: 'block', padding: 12 }}>
                    <Photo src={IMAGES.classes[i]} alt={c.name} className="" >
                      <div style={{ height: 210 }} />
                      <span className="badge acc tag">{categoryOf(c.name)}</span>
                      <span className="ghosttxt">{c.name}</span>
                    </Photo>
                    <div style={{ padding: '18px 12px 8px' }}>
                      <h3>{c.name}</h3>
                      <p className="clamp">{c.description || 'Book your spot in our next session.'}</p>
                      <div style={{ marginTop: 12 }}>
                        {c.price_single != null && <span className="price"><b>{c.price_single}</b><span>{CURRENCY} / class</span></span>}
                        {c.price_monthly != null && <span className="price"><b>{c.price_monthly}</b><span>{CURRENCY} / month</span></span>}
                      </div>
                      <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>{next ? `Next: ${fmtDate(next.starts_at)}` : 'No open times right now'}</p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="sec-h">
            <div><span className="kicker">Gym membership</span><h2>Join the<br />gym</h2></div>
            <Link href="/gym" className="btn ghost">See all plans <span className="arr">→</span></Link>
          </div>
        </Reveal>
        {!d && <div className="grid3"><Skeleton h={260} /><Skeleton h={260} /><Skeleton h={260} /></div>}
        {d && d.plans.length === 0 && <Empty title="Plans coming soon" text="Membership options will appear here." />}
        {d && d.plans.length > 0 && (
          <div className="grid3">
            {d.plans.slice(0, 3).map((p, i) => (
              <Reveal key={p.id} delay={i * 90}>
                <Link href="/gym" className="card hov" style={{ display: 'block' }}>
                  <h3>{p.name}</h3>
                  <span className="price"><b>{p.price}</b><span>{CURRENCY} / {p.period}</span></span>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'grid', gap: 8 }}>
                    {featuresOf(p).slice(0, 3).map((f, j) => <li key={j} className="muted">✓ {f}</li>)}
                  </ul>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {SECTIONS.facilities && FACILITIES.length > 0 && (
        <section className="sec" style={{ paddingTop: 0 }}>
          <Reveal><div className="sec-h"><div><span className="kicker">The space</span><h2>Built for<br />training</h2></div></div></Reveal>
          <div className="grid3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
            {FACILITIES.map((f, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="card hov" style={{ padding: 12 }}>
                  <Photo src={IMAGES.facilities[i]} alt={f.title}><div style={{ height: 180 }} /></Photo>
                  <div style={{ padding: '16px 10px 6px' }}><h3 style={{ fontSize: 28 }}>{f.title}</h3><p className="muted">{f.text}</p></div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {SECTIONS.trainers && TRAINERS.length > 0 && (
        <section className="sec" style={{ paddingTop: 0 }}>
          <Reveal><div className="sec-h"><div><span className="kicker">The team</span><h2>Meet your<br />coaches</h2></div></div></Reveal>
          <div className="grid3">
            {TRAINERS.map((t, i) => (
              <Reveal key={i} delay={i * 90}>
                <div className="person"><Photo src={IMAGES.trainers[i]} alt={t.name}><span className="ghosttxt" style={{ fontSize: 120 }}>{t.name.slice(0, 1)}</span></Photo>
                  <h3 style={{ fontSize: 30 }}>{t.name}</h3><p className="muted">{t.role}</p></div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {SECTIONS.testimonials && TESTIMONIALS.length > 0 && (
        <section className="sec" style={{ paddingTop: 0 }}>
          <Reveal><div className="sec-h"><div><span className="kicker">Members</span><h2>What they<br />say</h2></div></div></Reveal>
          <div className="grid3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={i} delay={i * 90}><div className="card quote"><p>“{t.text}”</p><p className="who">{t.name}</p></div></Reveal>
            ))}
          </div>
        </section>
      )}

      <Reveal>
        <div className="cta-band">
          <h2>Your spot<br />is waiting</h2>
          <Link href="/classes" className="btn">Book a class <span className="arr">→</span></Link>
        </div>
      </Reveal>
    </>
  );
}
